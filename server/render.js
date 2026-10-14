import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Banner canvas: 1200 css px wide, rendered at 3x (3600 px). Spacing matches the other banners:
// 6.66% of the width above the content and 9.57% below. Content sits in a 1000px column.
const WIDTH = 1200
const SIDE = 100
const TOP = Math.round(WIDTH * 0.0666)
const BOTTOM = Math.round(WIDTH * 0.0957)
const SCALE = 3
const MAX_CONTENT_HEIGHT = 2400

export class RenderError extends Error {}

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

export function findChrome() {
  return CHROME_PATHS.find((p) => fs.existsSync(p))
}

// Google Sans Flex, variable weight. Latin covers English and German; latin-ext covers accents beyond that.
const FONT_FILES = [
  { file: 'google-sans-flex-latin-wght-normal.woff2', range: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
  { file: 'google-sans-flex-latin-ext-wght-normal.woff2', range: 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF' },
]
let fontCss
function fonts() {
  if (fontCss) return fontCss
  const dir = path.resolve(__dirname, '..', 'node_modules', '@fontsource-variable', 'google-sans-flex', 'files')
  fontCss = FONT_FILES.map(({ file, range }) => {
    const data = fs.readFileSync(path.join(dir, file)).toString('base64')
    return `@font-face{font-family:"Google Sans Flex";font-weight:1 1000;src:url(data:font/woff2;base64,${data}) format("woff2");unicode-range:${range}}`
  }).join('')
  return fontCss
}

const safeColor = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c.trim()) ? c.trim() : '#ffffff')

function page(html, background) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fonts()}
*{box-sizing:border-box;margin:0}
html,body{background:${background};font-family:"Google Sans Flex",sans-serif;-webkit-font-smoothing:antialiased;color:#1a2442}
body{width:${WIDTH}px}
#wrap{width:${WIDTH}px;padding:${TOP}px ${SIDE}px ${BOTTOM}px;background:${background}}
</style></head><body><div id="wrap">${html}</div></body></html>`
}

/**
 * Draws each section's HTML to a sharp PNG (plus a small JPEG for the first one).
 * The HTML comes from a model reading an untrusted file, so the page runs with JavaScript off
 * and every request that is not an inline data: URL is blocked.
 */
export async function renderSections(sections) {
  const executablePath = findChrome()
  if (!executablePath) {
    throw new RenderError(
      'Smart create needs Google Chrome (or Chromium) on the machine running the server to redraw the banners. Install it, or set CHROME_PATH in server/.env.',
    )
  }
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--hide-scrollbars', '--disable-gpu'] })
  try {
    const out = []
    for (const [i, s] of sections.entries()) {
      const background = safeColor(s.background)
      const tab = await browser.newPage()
      try {
        await tab.setJavaScriptEnabled(false)
        await tab.setRequestInterception(true)
        tab.on('request', (req) => {
          const url = req.url()
          if (url.startsWith('data:') || url === 'about:blank') req.continue()
          else req.abort()
        })
        await tab.setViewport({ width: WIDTH, height: 900, deviceScaleFactor: SCALE })
        await tab.setContent(page(s.html, background), { waitUntil: 'load', timeout: 30000 })
        const wrap = await tab.$('#wrap')
        const box = await wrap?.boundingBox()
        if (!wrap || !box) throw new RenderError(`Section ${i + 1} could not be drawn.`)
        if (box.height > MAX_CONTENT_HEIGHT + TOP + BOTTOM) {
          throw new RenderError(`Section ${i + 1} came out too tall (${Math.round(box.height)}px).`)
        }
        const png = Buffer.from(await wrap.screenshot({ type: 'png' }))
        let jpg = null
        if (i === 0) {
          await tab.setViewport({ width: WIDTH, height: 900, deviceScaleFactor: 1 })
          const wrap1 = await tab.$('#wrap')
          jpg = Buffer.from(await wrap1.screenshot({ type: 'jpeg', quality: 88 }))
        }
        out.push({ png, jpg, background, height: Math.round(box.height) })
      } finally {
        await tab.close().catch(() => {})
      }
    }
    return out
  } finally {
    await browser.close().catch(() => {})
  }
}
