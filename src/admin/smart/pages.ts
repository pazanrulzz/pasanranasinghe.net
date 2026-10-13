// Turns an uploaded PDF or image into banner-ready images, in the browser.
// Each page is rendered sharp, then trimmed and padded to the same proportions as the other banners
// (6.66% of the width above the content, 9.57% below, on the page's own background color).

export const MAX_PAGES = 12
export const MAX_BANNERS = 12
const MAX_CANVAS_HEIGHT = 16000 // stay well inside browser canvas limits
const TALL_RATIO = 1.15 // taller than this (height / width) gets split into several banners
const SLICE_RATIO = 0.75 // each slice is about 4:3
const RENDER_WIDTH = 2400
const SPACE_TOP = 0.0666
const SPACE_BOTTOM = 0.0957
const DIFF = 6 // channel difference that counts as "not background"
const SAFETY = 12 // keep a little extra so faint shadows are never cut

export interface BannerImage {
  blob: Blob
  background: string
  /** Colour in the bottom-right of the original page, used for the card gradient. */
  accent: string
}

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`

function newCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w))
  canvas.height = Math.max(1, Math.round(h))
  return canvas
}

const toBlob = (canvas: HTMLCanvasElement, type = 'image/png', quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image'))), type, quality),
  )

/** Trim to the content and add the shared top/bottom spacing. Returns null for a blank page. */
function normalize(src: HTMLCanvasElement): { canvas: HTMLCanvasElement; background: string; accent: string } | null {
  const w = src.width
  const h = src.height
  const ctx = src.getContext('2d', { willReadFrequently: true })!
  const { data } = ctx.getImageData(0, 0, w, h)
  const r0 = data[0]
  const g0 = data[1]
  const b0 = data[2]
  const background = hex(r0, g0, b0)
  const last = (h * w - 1) * 4
  const accent = hex(data[last], data[last + 1], data[last + 2])

  const rowHasContent = (y: number) => {
    const row = y * w * 4
    for (let x = 0; x < w; x += 2) {
      const i = row + x * 4
      if (Math.abs(data[i] - r0) > DIFF || Math.abs(data[i + 1] - g0) > DIFF || Math.abs(data[i + 2] - b0) > DIFF) return true
    }
    return false
  }

  let top = 0
  while (top < h && !rowHasContent(top)) top++
  if (top === h) return null // blank page
  let bottom = h - 1
  while (bottom > top && !rowHasContent(bottom)) bottom--

  // Content reaches both edges (a full-bleed slide or photo): leave it as it is.
  if (top < h * 0.01 && bottom > h * 0.99) return { canvas: src, background, accent }

  top = Math.max(0, top - SAFETY)
  bottom = Math.min(h - 1, bottom + SAFETY)
  const contentH = bottom - top + 1
  const padTop = Math.round(w * SPACE_TOP)
  const padBottom = Math.round(w * SPACE_BOTTOM)

  const out = newCanvas(w, padTop + contentH + padBottom)
  const octx = out.getContext('2d')!
  octx.fillStyle = background
  octx.fillRect(0, 0, out.width, out.height)
  octx.drawImage(src, 0, top, w, contentH, 0, padTop, w, contentH)
  return { canvas: out, background, accent }
}

async function finish(src: HTMLCanvasElement): Promise<BannerImage | null> {
  const n = normalize(src)
  if (!n) return null
  return { blob: await toBlob(n.canvas), background: n.background, accent: n.accent }
}


/** Split a tall page into banner-sized slices, cutting inside blank gaps so text is never sliced through. */
function slicePage(src: HTMLCanvasElement): HTMLCanvasElement[] {
  const w = src.width
  const h = src.height
  if (h <= w * TALL_RATIO) return [src]

  const ctx = src.getContext('2d', { willReadFrequently: true })!
  const [r0, g0, b0] = ctx.getImageData(0, 0, 1, 1).data
  const target = Math.round(w * SLICE_RATIO)
  const minGap = Math.max(8, Math.round(w * 0.012))
  const isBlank = (d: Uint8ClampedArray, row: number) => {
    for (let x = 0; x < w; x += 2) {
      const i = (row * w + x) * 4
      if (Math.abs(d[i] - r0) > DIFF || Math.abs(d[i + 1] - g0) > DIFF || Math.abs(d[i + 2] - b0) > DIFF) return false
    }
    return true
  }

  const slices: HTMLCanvasElement[] = []
  let y = 0
  while (y < h && slices.length < MAX_BANNERS) {
    let end = Math.min(h, y + target)
    if (end < h) {
      const lo = Math.max(y + Math.round(target * 0.5), end - Math.round(target * 0.3))
      const hi = Math.min(h - 1, end + Math.round(target * 0.15))
      const band = ctx.getImageData(0, lo, w, hi - lo + 1).data
      let best = -1
      let bestDist = Infinity
      for (let row = 0; row <= hi - lo; ) {
        if (!isBlank(band, row)) {
          row++
          continue
        }
        let run = row
        while (run <= hi - lo && isBlank(band, run)) run++
        if (run - row >= minGap) {
          const mid = lo + Math.floor((row + run - 1) / 2)
          if (Math.abs(mid - end) < bestDist) {
            best = mid
            bestDist = Math.abs(mid - end)
          }
        }
        row = run
      }
      if (best >= 0) end = best
    }
    const slice = newCanvas(w, end - y)
    slice.getContext('2d')!.drawImage(src, 0, y, w, end - y, 0, 0, w, end - y)
    slices.push(slice)
    y = end
  }
  return slices
}

async function bannersFromCanvas(canvas: HTMLCanvasElement, into: BannerImage[]) {
  for (const slice of slicePage(canvas)) {
    if (into.length >= MAX_BANNERS) return
    const banner = await finish(slice)
    if (banner) into.push(banner)
  }
}

export async function pdfToBanners(
  file: File,
  onProgress: (done: number, total: number) => void,
): Promise<{ banners: BannerImage[]; cover: Blob | null; total: number }> {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() })
  const doc = await task.promise
  const total = doc.numPages
  const count = Math.min(total, MAX_PAGES)
  const banners: BannerImage[] = []
  let cover: Blob | null = null

  for (let i = 1; i <= count; i++) {
    const page = await doc.getPage(i)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(RENDER_WIDTH / base.width, MAX_CANVAS_HEIGHT / base.height)
    const viewport = page.getViewport({ scale })
    const canvas = newCanvas(viewport.width, viewport.height)
    await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise
    if (i === 1) cover = await coverFrom(slicePage(canvas)[0])
    await bannersFromCanvas(canvas, banners)
    page.cleanup()
    onProgress(i, count)
    if (banners.length >= MAX_BANNERS) break
  }
  await task.destroy()
  return { banners, cover, total }
}

export async function imageToBanners(file: File): Promise<{ banners: BannerImage[]; cover: Blob | null; total: number }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 3600 / bitmap.width)
  const canvas = newCanvas(bitmap.width * scale, bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const banners: BannerImage[] = []
  await bannersFromCanvas(canvas, banners)
  return { banners, cover: await coverFrom(slicePage(canvas)[0]), total: 1 }
}

async function coverFrom(src: HTMLCanvasElement): Promise<Blob> {
  const w = 1200
  const cover = newCanvas(w, (src.height / src.width) * w)
  const ctx = cover.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, cover.width, cover.height)
  ctx.drawImage(src, 0, 0, cover.width, cover.height)
  return toBlob(cover, 'image/jpeg', 0.88)
}

export const luminance = (colorHex: string) => {
  const n = parseInt(colorHex.slice(1), 16)
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}
