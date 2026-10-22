import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Sparkles, GripVertical, Image as ImageIcon, LayoutGrid, Plus, Trash2, Type, Upload, X } from 'lucide-react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '../lib/api'
import { useProjects } from '../lib/ProjectsContext'
import { BANNER_COUNT, emptyProject, gradientOf, normalizeOrder, type CustomBlock, type ProjectInput } from '../types'

const inputCls = 'mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 outline-none focus:border-accent'

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted">{hint}</span>}
      {children}
    </label>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="mt-5 grid grid-cols-1 gap-4">{children}</div>
    </section>
  )
}

function FileField({
  label,
  accept,
  value,
  onChange,
}: {
  label: string
  accept: string
  value: string
  onChange: (url: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(file?: File) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { url } = await api.upload(file)
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <div>
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        {value && <img src={value} alt="" className="h-16 w-24 rounded-lg border border-line object-cover" />}
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <button
          type="button"
          disabled={busy}
          onClick={() => ref.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-panel disabled:opacity-60"
        >
          <Upload className="size-4" /> {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} className="flex items-center gap-1 text-sm text-red-600 hover:underline">
            <X className="size-4" /> Remove
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

function MultiImageField({
  label,
  value,
  onChange,
  max = 12,
}: {
  label: string
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    setError('')
    const urls = [...value]
    try {
      for (const file of Array.from(files)) {
        if (urls.length >= max) {
          setError(`A collage holds up to ${max} screenshots.`)
          break
        }
        urls.push((await api.upload(file)).url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      onChange(urls)
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <div>
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-2 flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div key={url} className="group relative">
            <img src={url} alt={`Screenshot ${i + 1}`} className="h-28 w-14 rounded-lg border border-line object-cover object-top" />
            <button
              type="button"
              aria-label={`Remove screenshot ${i + 1}`}
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-ink text-white shadow hover:bg-red-600"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <input
          ref={ref}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => pick(e.target.files)}
        />
        <button
          type="button"
          disabled={busy || value.length >= max}
          onClick={() => ref.current?.click()}
          className="flex h-28 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#c9ccd6] text-xs text-muted hover:border-accent hover:text-accent disabled:opacity-50"
        >
          <Upload className="size-4" />
          {busy ? 'Uploading…' : 'Add images'}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

function SortableBlock({
  id,
  position,
  title,
  summary,
  defaultOpen = false,
  onRemove,
  children,
}: {
  id: string
  position: number
  title: string
  summary?: ReactNode
  defaultOpen?: boolean
  onRemove?: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`min-w-0 rounded-2xl border bg-white ${isDragging ? 'relative z-10 border-accent shadow-xl' : 'border-line'}`}
    >
      <div className="flex items-center gap-3 p-3 pr-4">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${title}`}
          className="touch-none cursor-grab rounded-lg p-2 text-muted hover:bg-panel hover:text-ink active:cursor-grabbing"
        >
          <GripVertical className="size-5" />
        </button>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-panel text-xs font-medium">{position}</span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="text-lg font-medium">{title}</span>
          <span className="min-w-0 flex-1 truncate text-sm text-muted">{!open && summary}</span>
          <ChevronDown className={`size-5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${title}`}
            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      {open && <div className="grid grid-cols-1 gap-4 border-t border-line p-4 sm:p-6">{children}</div>}
    </section>
  )
}

const toParagraphs = (text: string) => text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean)

function EditorForm({ slug, initial, generatedFrom, skipped = 0 }: { slug?: string; initial: ProjectInput; generatedFrom?: string; skipped?: number }) {
  const navigate = useNavigate()
  const { projects, refresh } = useProjects()
  const [form, setForm] = useState(initial)
  const [aboutText, setAboutText] = useState(initial.about.join('\n\n'))
  const [brandingText, setBrandingText] = useState(initial.branding.join('\n\n'))
  const [tagsText, setTagsText] = useState(initial.tags.join(', '))
  const [order, setOrder] = useState(() => normalizeOrder(initial.order, initial.custom))
  const [customTexts, setCustomTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.custom.map((c) => [c.id, c.paragraphs.join('\n\n')])),
  )
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => setForm((f) => ({ ...f, [key]: value }))
  const text = (key: keyof ProjectInput) => ({
    value: form[key] as string,
    onChange: (e: { target: { value: string } }) => set(key, e.target.value as never),
    className: inputCls,
  })
  const categories = [...new Set(projects.map((p) => p.category))]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setOrder((o) => arrayMove(o, o.indexOf(String(active.id)), o.indexOf(String(over.id))))
  }

  function setBanner(i: number, url: string) {
    set('banners', Array.from({ length: BANNER_COUNT }, (_, k) => (k === i ? url : form.banners[k] ?? '')))
  }

  function addBlock(type: CustomBlock['type']) {
    const id = `c-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`
    set('custom', [...form.custom, { id, type, label: '', lead: '', paragraphs: [], image: '', images: [], compact: false }])
    setOrder((o) => [...o, id])
    setJustAdded(id)
  }

  function updateCustom(id: string, patch: Partial<CustomBlock>) {
    set('custom', form.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function removeCustom(id: string, name: string) {
    if (!window.confirm(`Remove "${name}"? Its content is deleted when you save.`)) return
    set('custom', form.custom.filter((c) => c.id !== id))
    setOrder((o) => o.filter((x) => x !== id))
  }

  function renderBlock(id: string, position: number) {
    if (id.startsWith('c-')) {
      const c = form.custom.find((x) => x.id === id)
      if (!c) return null
      if (c.type === 'collage') {
        const count = c.images?.length ?? 0
        return (
          <SortableBlock
            key={id}
            id={id}
            position={position}
            title="Animated collage"
            summary={`${count} screenshot${count === 1 ? '' : 's'}`}
            defaultOpen={justAdded === id}
            onRemove={() => removeCustom(id, 'Animated collage')}
          >
            <MultiImageField label="Screenshots" value={c.images ?? []} onChange={(urls) => updateCustom(id, { images: urls })} />
            <p className="-mt-2 text-xs text-muted">
              Shown in a fixed 4:3 frame as columns of screenshots that slowly scroll up and down. Upload the images at full size so they stay sharp.
            </p>
          </SortableBlock>
        )
      }
      if (c.type === 'text') {
        const title = c.label || 'Text section'
        return (
          <SortableBlock
            key={id}
            id={id}
            position={position}
            title={title}
            summary={c.lead}
            defaultOpen={justAdded === id}
            onRemove={() => removeCustom(id, title)}
          >
            <Field label="Section label" hint="Small heading on the left. Optional.">
              <input value={c.label} onChange={(e) => updateCustom(id, { label: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Lead sentence">
              <textarea rows={2} value={c.lead} onChange={(e) => updateCustom(id, { lead: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Paragraphs" hint="Separate paragraphs with a blank line">
              <textarea
                rows={6}
                value={customTexts[id] ?? ''}
                onChange={(e) => setCustomTexts((t) => ({ ...t, [id]: e.target.value }))}
                className={inputCls}
              />
            </Field>
          </SortableBlock>
        )
      }
      return (
        <SortableBlock
          key={id}
          id={id}
          position={position}
          title="Custom banner"
          summary={
            c.image ? (
              <span className="flex items-center gap-2">
                <img src={c.image} alt="" className="h-6 w-10 rounded object-cover" /> Image uploaded
              </span>
            ) : (
              'Hidden until you add an image'
            )
          }
          defaultOpen={justAdded === id}
          onRemove={() => removeCustom(id, 'Custom banner')}
        >
          <FileField label="Image" accept="image/png,image/jpeg,image/webp,image/gif" value={c.image} onChange={(v) => updateCustom(id, { image: v })} />
          <p className="-mt-2 text-xs text-muted">Shown in a fixed 16:9 frame at full width. The whole image fits inside and the frame takes on its background color. Leave empty to hide this banner.</p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={c.compact}
              onChange={(e) => updateCustom(id, { compact: e.target.checked })}
              className="mt-0.5 size-4 accent-[#ee5a3c]"
            />
            <span>
              Short banner
              <span className="block text-xs text-muted">
                Skip the 16:9 frame and show the image at its own height. Use it for short content, so it doesn't sit in a large empty frame.
              </span>
            </span>
          </label>
        </SortableBlock>
      )
    }
    if (id === 'about') {
      return (
        <SortableBlock key={id} id={id} position={position} title="About project" summary={form.aboutLead}>
          <Field label="Lead sentence"><textarea rows={2} {...text('aboutLead')} /></Field>
          <Field label="Paragraphs" hint="Separate paragraphs with a blank line">
            <textarea rows={6} value={aboutText} onChange={(e) => setAboutText(e.target.value)} className={inputCls} />
          </Field>
        </SortableBlock>
      )
    }
    if (id === 'challenge') {
      return (
        <SortableBlock key={id} id={id} position={position} title="The challenge" summary={form.challengeLead}>
          <Field label="Lead sentence"><textarea rows={2} {...text('challengeLead')} /></Field>
          <Field label="Intro paragraph"><textarea rows={4} {...text('challengeIntro')} /></Field>
          <div className="grid grid-cols-1 gap-3">
            <span className="text-sm font-medium">Points</span>
            {form.challengePoints.map((pt, i) => (
              <div key={i} className="rounded-xl border border-line p-4">
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Title"
                    value={pt.title}
                    onChange={(e) => setPoint(i, 'title', e.target.value)}
                    className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    aria-label="Remove point"
                    onClick={() => set('challengePoints', form.challengePoints.filter((_, idx) => idx !== i))}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Description"
                  value={pt.text}
                  onChange={(e) => setPoint(i, 'text', e.target.value)}
                  className="mt-2 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-accent"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('challengePoints', [...form.challengePoints, { title: '', text: '' }])}
              className="flex w-fit items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-panel"
            >
              <Plus className="size-4" /> Add point
            </button>
          </div>
        </SortableBlock>
      )
    }
    if (id === 'branding') {
      return (
        <SortableBlock key={id} id={id} position={position} title="Branding" summary={form.brandingLead}>
          <Field label="Lead sentence"><textarea rows={2} {...text('brandingLead')} /></Field>
          <Field label="Paragraphs" hint="Separate paragraphs with a blank line">
            <textarea rows={6} value={brandingText} onChange={(e) => setBrandingText(e.target.value)} className={inputCls} />
          </Field>
        </SortableBlock>
      )
    }
    const i = Number(id.replace('banner-', ''))
    const url = form.banners[i] ?? ''
    return (
      <SortableBlock
        key={id}
        id={id}
        position={position}
        title={`Banner ${i + 1}`}
        summary={
          url ? (
            <span className="flex items-center gap-2">
              <img src={url} alt="" className="h-6 w-10 rounded object-cover" /> Image uploaded
            </span>
          ) : (
            'Hidden until you add an image'
          )
        }
      >
        <FileField label="Image" accept="image/png,image/jpeg,image/webp,image/gif" value={url} onChange={(v) => setBanner(i, v)} />
        <p className="-mt-2 text-xs text-muted">Shown in a fixed 16:9 frame at full width. The whole image fits inside and the frame takes on its background color. Leave empty to hide this banner.</p>
      </SortableBlock>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload: ProjectInput = {
      ...form,
      about: toParagraphs(aboutText),
      branding: toParagraphs(brandingText),
      tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      custom: form.custom.map((c) => (c.type === 'text' ? { ...c, paragraphs: toParagraphs(customTexts[c.id] ?? '') } : c)),
      order,
    }
    try {
      if (slug) await api.updateProject(slug, payload)
      else await api.createProject(payload)
      await refresh()
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function setPoint(i: number, key: 'title' | 'text', value: string) {
    set('challengePoints', form.challengePoints.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)))
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> All items
        </Link>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">{slug ? 'Edit item' : 'New item'}</h1>
      </div>

      {generatedFrom && (
        <p className="flex items-start gap-2 rounded-lg bg-accent/10 px-4 py-3 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            Generated from <strong className="font-medium">{generatedFrom}</strong>. The text is written only from that file, but read every
            section before you create the item: check names, numbers and wording. The banners are redrawn from the file, so photos appear as plain blocks and fine details may differ from the original. Nothing is public until you click Create item.{skipped > 0 && ` ${skipped} section${skipped === 1 ? '' : 's'} could not be drawn and ${skipped === 1 ? 'was' : 'were'} left out.`}
          </span>
        </p>
      )}

      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <Card title="Basics">
        <Field label="Title" hint="Shown on the portfolio card">
          <input required {...text('title')} />
        </Field>
        <Field label="Page heading" hint="Large headline on the case study page">
          <textarea rows={2} {...text('heading')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" hint="Used for the filters">
            <input required list="categories" {...text('category')} />
            <datalist id="categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="Tags" hint="Comma separated">
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </Card>

      <Card title="Project details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client"><input {...text('client')} /></Field>
          <Field label="Stage"><input {...text('stage')} /></Field>
          <Field label="Industry"><input {...text('industry')} /></Field>
          <Field label="Timeline"><input {...text('timeline')} /></Field>
        </div>
      </Card>

      <Card title="Testimonial">
        <Field label="Quote"><textarea rows={3} {...text('quote')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Author"><input {...text('author')} /></Field>
          <Field label="Author role"><input {...text('authorRole')} /></Field>
        </div>
        <FileField label="Author photo" accept="image/png,image/jpeg,image/webp,image/gif" value={form.authorPhoto} onChange={(v) => set('authorPhoto', v)} />
        <FileField label="Client logo" accept="image/png,image/jpeg,image/webp,image/gif" value={form.clientLogo} onChange={(v) => set('clientLogo', v)} />
        <p className="-mt-2 text-xs text-muted">The logo replaces the client name at the top of the page and on the testimonial card.</p>
      </Card>

      <Card title="Appearance">
        <FileField label="Cover image" accept="image/png,image/jpeg,image/webp,image/gif" value={form.coverImage} onChange={(v) => set('coverImage', v)} />
        <p className="-mt-2 text-xs text-muted">Used on portfolio cards. Leave empty to use the gradient below.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Gradient start">
            <input type="color" value={form.colorFrom} onChange={(e) => set('colorFrom', e.target.value)} className="mt-1.5 h-11 w-full cursor-pointer rounded-lg border border-line bg-white p-1" />
          </Field>
          <Field label="Gradient end">
            <input type="color" value={form.colorTo} onChange={(e) => set('colorTo', e.target.value)} className="mt-1.5 h-11 w-full cursor-pointer rounded-lg border border-line bg-white p-1" />
          </Field>
          <div>
            <span className="text-sm font-medium">Preview</span>
            <div className="mt-1.5 h-11 rounded-lg border border-line" style={{ backgroundImage: gradientOf(form) }} />
          </div>
        </div>
        <Field label="Banner caption" hint="Large text on gradient banners">
          <input {...text('caption')} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.dark} onChange={(e) => set('dark', e.target.checked)} className="size-4 accent-[#ee5a3c]" />
          Dark theme (use white text on the gradient)
        </label>
      </Card>

      <div>
        <h2 className="text-lg font-medium">Page sections</h2>
        <p className="mt-1 text-sm text-muted">
          Drag the handle to reorder sections and banners. They appear on the page in this order, below the fixed top area
          (basics, details and testimonial). Click a section to edit it.
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 gap-3">{order.map((id, idx) => renderBlock(id, idx + 1))}</div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => addBlock('banner')}
          className="flex items-center gap-2 rounded-xl border border-dashed border-[#c9ccd6] bg-white px-4 py-3 text-sm font-medium hover:border-accent hover:text-accent"
        >
          <ImageIcon className="size-4" /> Add banner
        </button>
        <button
          type="button"
          onClick={() => addBlock('text')}
          className="flex items-center gap-2 rounded-xl border border-dashed border-[#c9ccd6] bg-white px-4 py-3 text-sm font-medium hover:border-accent hover:text-accent"
        >
          <Type className="size-4" /> Add text section
        </button>
        <button
          type="button"
          onClick={() => addBlock('collage')}
          className="flex items-center gap-2 rounded-xl border border-dashed border-[#c9ccd6] bg-white px-4 py-3 text-sm font-medium hover:border-accent hover:text-accent"
        >
          <LayoutGrid className="size-4" /> Add collage
        </button>
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-line bg-panel/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <Link to="/admin" className="rounded-lg border border-line bg-white px-4 py-2.5 hover:bg-white/60">Cancel</Link>
        <button disabled={saving} className="rounded-lg bg-accent px-5 py-2.5 font-medium text-white hover:bg-accent-dark disabled:opacity-60">
          {saving ? 'Saving…' : slug ? 'Save changes' : 'Create item'}
        </button>
      </div>
    </form>
  )
}

export default function ProjectEditor() {
  const { slug } = useParams()
  const { projects, loading } = useProjects()
  const location = useLocation()
  const smart = (location.state as { draft?: ProjectInput; source?: string; skipped?: number } | null) ?? null

  if (!slug) return <EditorForm key={smart?.source ?? 'new'} initial={smart?.draft ?? emptyProject} generatedFrom={smart?.draft ? smart.source : undefined} skipped={smart?.skipped} />
  if (loading) return <p className="text-muted">Loading…</p>

  const project = projects.find((p) => p.slug === slug)
  if (!project) {
    return (
      <div>
        <p>That item doesn't exist.</p>
        <Link to="/admin" className="mt-4 inline-block text-accent underline">Back to all items</Link>
      </div>
    )
  }
  const { slug: _slug, ...rest } = project
  const initial = {
    ...rest,
    banners: Array.from({ length: BANNER_COUNT }, (_, i) => rest.banners?.[i] ?? ''),
    order: normalizeOrder(rest.order, rest.custom),
    custom: rest.custom ?? [],
  }
  return <EditorForm key={slug} slug={slug} initial={initial} />
}
