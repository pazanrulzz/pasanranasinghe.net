import { useEffect, useRef, useState, type DragEvent } from 'react'
import { AlertCircle, Check, FileText, Loader2, Sparkles, Upload, X } from 'lucide-react'
import { api, type SmartResult } from '../../lib/api'
import { BANNER_COUNT, emptyProject, normalizeOrder, type CustomBlock, type ProjectInput } from '../../types'
import { MAX_BANNERS, MAX_PAGES, imageToBanners, luminance, pdfToBanners, type BannerImage } from './pages'

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp,image/gif'
const MAX_BYTES = 25 * 1024 * 1024

type Step = 'read' | 'write' | 'upload' | 'done'
const STEPS: { id: Step; label: string }[] = [
  { id: 'read', label: 'Preparing banners from the file' },
  { id: 'write', label: 'Writing the case study' },
  { id: 'upload', label: 'Saving the banner images' },
  { id: 'done', label: 'Opening the editor' },
]

const newId = () => `c-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`
const asFile = (blob: Blob, name: string) => new File([blob], name, { type: blob.type })
const sizeLabel = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`)

function buildDraft(
  ai: SmartResult,
  fallbackTitle: string,
  banners: BannerImage[],
  urls: string[],
  coverUrl: string,
): ProjectInput {
  const first = banners[0]
  const custom: CustomBlock[] = urls.slice(BANNER_COUNT).map((image) => ({
    id: newId(),
    type: 'banner',
    label: '',
    lead: '',
    paragraphs: [],
    image,
    images: [],
    compact: false,
  }))
  return {
    ...emptyProject,
    title: ai.title.trim() || fallbackTitle,
    heading: ai.heading,
    client: ai.client,
    stage: ai.stage,
    industry: ai.industry,
    timeline: ai.timeline,
    category: ai.category.trim() || 'Case study',
    tags: ai.tags.slice(0, 6),
    caption: ai.caption,
    quote: ai.quote,
    author: ai.author,
    authorRole: ai.authorRole,
    aboutLead: ai.aboutLead,
    about: ai.about,
    challengeLead: ai.challengeLead,
    challengeIntro: ai.challengeIntro,
    challengePoints: ai.challengePoints,
    brandingLead: ai.brandingLead,
    branding: ai.branding,
    coverImage: coverUrl,
    colorFrom: first?.background ?? emptyProject.colorFrom,
    colorTo: first?.accent ?? emptyProject.colorTo,
    dark: first ? luminance(first.background) < 0.45 : false,
    banners: Array.from({ length: BANNER_COUNT }, (_, i) => urls[i] ?? ''),
    custom,
    order: normalizeOrder(undefined, custom),
  }
}

export default function SmartCreateDialog({
  onClose,
  onGenerated,
}: {
  onClose: () => void
  onGenerated: (draft: ProjectInput, sourceName: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState<Step>('read')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const d = dialog.current
    if (d && !d.open) d.showModal()
  }, [])

  function choose(f?: File | null) {
    if (!f) return
    const ok = f.type === 'application/pdf' || /^image\/(png|jpe?g|webp|gif)$/.test(f.type)
    if (!ok) return setError('Choose a PDF or a PNG, JPG, WebP or GIF image.')
    if (f.size > MAX_BYTES) return setError('That file is larger than 25 MB.')
    setError('')
    setFile(f)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    choose(e.dataTransfer.files?.[0])
  }

  async function generate() {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const status = await api.smartStatus()
      if (!status.configured) {
        throw new Error('Smart create needs an Anthropic API key. Add ANTHROPIC_API_KEY to server/.env and restart the server.')
      }

      setStep('read')
      setDetail('')
      // The AI call and the page rendering run side by side. Nothing is uploaded until both succeed.
      const analysis = api.smartAnalyze(file, notes)
      analysis.catch(() => {}) // surfaced below; avoids an unhandled rejection while pages render
      const isPdf = file.type === 'application/pdf'
      const rendered = isPdf
        ? await pdfToBanners(file, (done, total) => setDetail(`Page ${done} of ${total}`))
        : await imageToBanners(file)

      setStep('write')
      setDetail('')
      const ai = await analysis

      setStep('upload')
      const urls: string[] = []
      for (let i = 0; i < rendered.banners.length; i++) {
        setDetail(`Banner ${i + 1} of ${rendered.banners.length}`)
        urls.push((await api.upload(asFile(rendered.banners[i].blob, `banner-${i + 1}.png`))).url)
      }
      const coverUrl = rendered.cover ? (await api.upload(asFile(rendered.cover, 'cover.jpg'))).url : ''

      setStep('done')
      setDetail('')
      const fallbackTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'New project'
      onGenerated(buildDraft(ai, fallbackTitle, rendered.banners, urls, coverUrl), file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={(e) => busy && e.preventDefault()}
      className="m-auto w-[min(92vw,34rem)] rounded-2xl border border-line bg-white p-0 shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between gap-4 p-6 pb-0">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-medium tracking-tight">
            <Sparkles className="size-5 text-accent" /> Smart create
          </h2>
          <p className="mt-1 text-sm text-muted">
            Upload a PDF or an image of a project. I'll build the banners and write the case study for you to review.
          </p>
        </div>
        {!busy && (
          <button type="button" aria-label="Close" onClick={() => dialog.current?.close()} className="rounded-lg p-1.5 hover:bg-panel">
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="p-6">
        {busy ? (
          <ol className="grid gap-3" aria-live="polite">
            {STEPS.map((s, i) => {
              const current = STEPS.findIndex((x) => x.id === step)
              const state = i < current ? 'done' : i === current ? 'active' : 'todo'
              return (
                <li key={s.id} className={`flex items-center gap-3 text-sm ${state === 'todo' ? 'text-muted' : ''}`}>
                  <span className="grid size-6 place-items-center">
                    {state === 'done' ? <Check className="size-5 text-[#6b8a2a]" /> : state === 'active' ? <Loader2 className="size-5 animate-spin text-accent" /> : <span className="size-2 rounded-full bg-line" />}
                  </span>
                  <span>
                    {s.label}
                    {state === 'active' && detail && <span className="ml-2 text-muted">{detail}</span>}
                  </span>
                </li>
              )
            })}
            <li className="mt-1 text-xs text-muted">This can take a minute. Keep this window open.</li>
          </ol>
        ) : (
          <>
            <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${dragging ? 'border-accent bg-accent/5' : 'border-[#d5d8e0] hover:border-accent'}`}
            >
              {file ? (
                <>
                  <FileText className="size-8 text-accent" />
                  <span className="max-w-full truncate text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted">{sizeLabel(file.size)} · click to choose a different file</span>
                </>
              ) : (
                <>
                  <Upload className="size-8 text-muted" />
                  <span className="text-sm font-medium">Drop a PDF or image here, or click to browse</span>
                  <span className="text-xs text-muted">PDF, PNG, JPG, WebP or GIF, up to 25 MB. PDFs use their first {MAX_PAGES} pages, and tall pages are cut into several banners (up to {MAX_BANNERS}).</span>
                </>
              )}
            </button>

            <label className="mt-4 block text-sm font-medium" htmlFor="smart-notes">
              Notes <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="smart-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the source doesn't say, such as your role, the client or the timeline."
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
          </>
        )}

        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}

        {!busy && (
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => dialog.current?.close()} className="rounded-lg border border-line px-4 py-2.5 text-sm hover:bg-panel">
              Cancel
            </button>
            <button
              type="button"
              disabled={!file}
              onClick={generate}
              className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
            >
              <Sparkles className="size-4" /> Generate
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}
