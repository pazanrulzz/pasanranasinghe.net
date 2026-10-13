import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { SmartCreateError, analyzeSource, isConfigured } from './smart-create.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_FILE = path.join(__dirname, 'data', 'projects.json')
const UPLOAD_DIR = path.join(__dirname, 'uploads')
const DIST_DIR = path.join(ROOT, 'dist')

const { ADMIN_EMAIL, ADMIN_PASSWORD_HASH, JWT_SECRET } = process.env
const PORT = Number(process.env.PORT) || 3001
const IS_PROD = process.env.NODE_ENV === 'production'

if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH || !JWT_SECRET) {
  console.error('Missing ADMIN_EMAIL, ADMIN_PASSWORD_HASH or JWT_SECRET. See server/.env')
  process.exit(1)
}

/* ---------- storage ---------- */
function readProjects() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return []
  }
}
function writeProjects(list) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  const tmp = `${DATA_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2))
  fs.renameSync(tmp, DATA_FILE)
}

/* ---------- validation ---------- */
const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const strList = (v, max = 20, len = 3000) =>
  Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : []
const color = (v, fallback) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback)
const filePath = (v) =>
  typeof v === 'string' && /^\/(uploads|media)\/[\w%.\-/]+$/.test(v) && !v.includes('..') ? v : ''
const BANNER_COUNT = 8
const DEFAULT_ORDER = ['banner-0', 'about', 'banner-1', 'banner-2', 'challenge', 'banner-3', 'branding', 'banner-4', 'banner-5', 'banner-6', 'banner-7']
function normalizeOrder(order, customIds = []) {
  const known = [...DEFAULT_ORDER, ...customIds]
  const seen = new Set()
  const result = []
  for (const id of [...(Array.isArray(order) ? order : []), ...known]) {
    if (known.includes(id) && !seen.has(id)) {
      seen.add(id)
      result.push(id)
    }
  }
  return result
}
const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 80)

const MAX_CUSTOM = 30
function sanitizeCustom(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const out = []
  for (const c of list) {
    if (!c || typeof c !== 'object') continue
    const id = typeof c.id === 'string' && /^c-[a-z0-9]{6,16}$/.test(c.id) ? c.id : ''
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      type: c.type === 'text' || c.type === 'collage' ? c.type : 'banner',
      label: str(c.label, 80),
      lead: str(c.lead, 600),
      paragraphs: strList(c.paragraphs),
      image: filePath(c.image),
      compact: Boolean(c.compact),
      images: Array.isArray(c.images) ? c.images.map(filePath).filter(Boolean).slice(0, 12) : [],
    })
    if (out.length >= MAX_CUSTOM) break
  }
  return out
}

function sanitize(body) {
  const b = body && typeof body === 'object' ? body : {}
  const points = Array.isArray(b.challengePoints)
    ? b.challengePoints
        .map((p) => ({ title: str(p?.title, 200), text: str(p?.text, 2000) }))
        .filter((p) => p.title || p.text)
        .slice(0, 10)
    : []
  const custom = sanitizeCustom(b.custom)
  return {
    title: str(b.title, 160),
    heading: str(b.heading, 300),
    client: str(b.client, 120),
    stage: str(b.stage, 80),
    industry: str(b.industry, 80),
    timeline: str(b.timeline, 80),
    quote: str(b.quote, 600),
    author: str(b.author, 120),
    authorRole: str(b.authorRole, 160),
    clientLogo: filePath(b.clientLogo),
    authorPhoto: filePath(b.authorPhoto),
    aboutLead: str(b.aboutLead, 600),
    about: strList(b.about),
    challengeLead: str(b.challengeLead, 600),
    challengeIntro: str(b.challengeIntro, 3000),
    challengePoints: points,
    brandingLead: str(b.brandingLead, 600),
    branding: strList(b.branding),
    coverImage: filePath(b.coverImage),
    banners: Array.from({ length: BANNER_COUNT }, (_, i) => filePath(Array.isArray(b.banners) ? b.banners[i] : '')),
    custom,
    order: normalizeOrder(b.order, custom.map((c) => c.id)),
    tags: strList(b.tags, 12, 40),
    category: str(b.category, 60),
    colorFrom: color(b.colorFrom, '#9ec2f0'),
    colorTo: color(b.colorTo, '#e7b98c'),
    caption: str(b.caption, 200),
    dark: Boolean(b.dark),
  }
}

function removeUpload(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return
  const file = path.join(UPLOAD_DIR, path.basename(url))
  fs.rm(file, { force: true }, () => {})
}

/* ---------- auth ---------- */
function verifyPassword(password) {
  const [scheme, saltHex, hashHex] = ADMIN_PASSWORD_HASH.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return crypto.timingSafeEqual(actual, expected)
}

const attempts = new Map() // ip -> { count, resetAt }
function tooManyAttempts(ip) {
  const rec = attempts.get(ip)
  if (!rec || rec.resetAt < Date.now()) return false
  return rec.count >= 5
}
function recordFailure(ip) {
  const rec = attempts.get(ip)
  if (!rec || rec.resetAt < Date.now()) attempts.set(ip, { count: 1, resetAt: Date.now() + 15 * 60 * 1000 })
  else rec.count += 1
}

const COOKIE = 'admin_session'
function requireAuth(req, res, next) {
  try {
    const payload = jwt.verify(req.cookies[COOKIE] ?? '', JWT_SECRET)
    if (payload.sub !== ADMIN_EMAIL.toLowerCase()) throw new Error('bad subject')
    req.admin = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Not signed in' })
  }
}

/* ---------- uploads ---------- */
const EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
}
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${crypto.randomBytes(12).toString('hex')}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 30 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, Boolean(EXT[file.mimetype])),
})

/* ---------- app ---------- */
const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  next()
})

app.post('/api/auth/login', (req, res) => {
  const ip = req.ip ?? 'unknown'
  if (tooManyAttempts(ip)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' })
  const email = str(req.body?.email, 200).toLowerCase()
  const password = typeof req.body?.password === 'string' ? req.body.password.slice(0, 200) : ''
  // Always run the hash check so timing doesn't reveal whether the email matched.
  const passwordOk = verifyPassword(password)
  const emailOk = email === ADMIN_EMAIL.toLowerCase()
  if (!(passwordOk && emailOk)) {
    recordFailure(ip)
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  attempts.delete(ip)
  const token = jwt.sign({ sub: email }, JWT_SECRET, { expiresIn: '7d' })
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
  res.json({ email })
})

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(COOKIE, { path: '/' })
  res.json({ ok: true })
})

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ email: req.admin }))

app.get('/api/projects', (_req, res) => res.json(readProjects()))

app.get('/api/projects/:slug', (req, res) => {
  const project = readProjects().find((p) => p.slug === req.params.slug)
  if (!project) return res.status(404).json({ error: 'Not found' })
  res.json(project)
})

app.post('/api/projects', requireAuth, (req, res) => {
  const data = sanitize(req.body)
  if (!data.title) return res.status(400).json({ error: 'Title is required' })
  if (!data.category) return res.status(400).json({ error: 'Category is required' })
  const list = readProjects()
  const base = slugify(data.title) || 'project'
  let slug = base
  for (let i = 2; list.some((p) => p.slug === slug); i++) slug = `${base}-${i}`
  const project = { slug, ...data }
  list.unshift(project)
  writeProjects(list)
  res.status(201).json(project)
})

app.put('/api/projects/:slug', requireAuth, (req, res) => {
  const list = readProjects()
  const i = list.findIndex((p) => p.slug === req.params.slug)
  if (i === -1) return res.status(404).json({ error: 'Not found' })
  const old = list[i]
  // An older admin page (open before a new field or banner slot existed) may not send everything.
  // Anything it leaves out keeps its saved value instead of being blanked or deleted.
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const sent = Array.isArray(body.banners) ? body.banners : null
  const merged = {
    ...old,
    ...body,
    banners: Array.from({ length: BANNER_COUNT }, (_, k) => (sent && k < sent.length ? sent[k] : (old.banners?.[k] ?? ''))),
  }
  const data = sanitize(merged)
  if (!data.title) return res.status(400).json({ error: 'Title is required' })
  if (!data.category) return res.status(400).json({ error: 'Category is required' })
  const next = { slug: old.slug, ...data }
  if (old.coverImage !== next.coverImage) removeUpload(old.coverImage)
  if (old.clientLogo !== next.clientLogo) removeUpload(old.clientLogo)
  if (old.authorPhoto !== next.authorPhoto) removeUpload(old.authorPhoto)
  ;(old.banners ?? []).forEach((url, i) => {
    if (url && url !== next.banners[i]) removeUpload(url)
  })
  // custom banners that were removed, or whose image was replaced
  const customFiles = (c) => [c.image, ...(c.images ?? [])].filter(Boolean)
  const keptImages = new Set(next.custom.flatMap(customFiles))
  ;(old.custom ?? []).forEach((c) => {
    customFiles(c).forEach((url) => {
      if (!keptImages.has(url)) removeUpload(url)
    })
  })
  list[i] = next
  writeProjects(list)
  res.json(next)
})

app.delete('/api/projects/:slug', requireAuth, (req, res) => {
  const list = readProjects()
  const project = list.find((p) => p.slug === req.params.slug)
  if (!project) return res.status(404).json({ error: 'Not found' })
  removeUpload(project.coverImage)
  removeUpload(project.clientLogo)
  removeUpload(project.authorPhoto)
  ;(project.banners ?? []).forEach(removeUpload)
  ;(project.custom ?? []).forEach((c) => [c.image, ...(c.images ?? [])].forEach(removeUpload))
  writeProjects(list.filter((p) => p.slug !== req.params.slug))
  res.json({ ok: true })
})

app.post('/api/uploads', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File is larger than 30 MB' : 'Upload failed' })
    if (!req.file) return res.status(400).json({ error: 'Only PNG, JPG, WebP or GIF images are allowed' })
    res.status(201).json({ url: `/uploads/${req.file.filename}` })
  })
})

// Smart create: read a PDF or image with Claude and return case study text for the editor to review.
const analyzeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 5 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf' || Boolean(EXT[file.mimetype])),
})

app.get('/api/smart-create/status', requireAuth, (_req, res) => res.json({ configured: isConfigured() }))

app.post('/api/smart-create/analyze', requireAuth, (req, res) => {
  analyzeUpload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File is larger than 25 MB' : 'Upload failed' })
    if (!req.file) return res.status(400).json({ error: 'Upload a PDF or a PNG, JPG, WebP or GIF image' })
    try {
      const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 2000) : ''
      const result = await analyzeSource({
        buffer: req.file.buffer,
        mediaType: req.file.mimetype,
        notes,
        fileName: str(req.file.originalname, 120),
      })
      res.json(result)
    } catch (e) {
      const status = e instanceof SmartCreateError ? e.status : 500
      res.status(status).json({ error: e instanceof SmartCreateError ? e.message : 'Smart create failed' })
    }
  })
})

app.use('/uploads', express.static(UPLOAD_DIR, { index: false, dotfiles: 'deny' }))

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')))
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`))
