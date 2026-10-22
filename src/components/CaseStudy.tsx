import { Fragment, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useProjects } from '../lib/ProjectsContext'
import { BANNER_COUNT, normalizeOrder, type Project } from '../types'

function TextSection({ label, lead, children }: { label: string; lead: string; children: ReactNode }) {
  return (
    <section className="mx-auto grid max-w-[1400px] gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[38%_1fr] lg:gap-12 lg:px-10 lg:py-24">
      {label ? <h2 className="text-base uppercase tracking-tight">{label}</h2> : <div />}
      <div className="max-w-[900px]">
        <p className="text-2xl font-medium leading-snug tracking-[-0.02em] sm:text-[28px]">{lead}</p>
        {children}
      </div>
    </section>
  )
}

// Full class names so Tailwind can see them. Columns match the number of boxes shown.
const DETAIL_COLS: Record<number, string> = {
  0: '',
  1: 'sm:grid-cols-1 2xl:grid-cols-1',
  2: 'sm:grid-cols-2 2xl:grid-cols-2',
  3: 'sm:grid-cols-3 2xl:grid-cols-3',
  4: 'sm:grid-cols-4 2xl:grid-cols-4',
}

// Every banner is shown in the same 16:9 frame, whatever the image's own proportions.
// The whole image fits inside (nothing is cropped) and the frame takes the image's
// background color, sampled from its top-left corner, so it looks seamless.
function edgeColor(img: HTMLImageElement): string | undefined {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return undefined
    ctx.drawImage(img, 0, 0, 4, 4, 0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    return a < 250 ? undefined : `rgb(${r}, ${g}, ${b})`
  } catch {
    return undefined
  }
}

function Banner({ project, index, src, compact = false }: { project: Project; index?: number; src?: string; compact?: boolean }) {
  const [bg, setBg] = useState<string>()
  const own = src ?? (index === undefined ? '' : project.banners?.[index])

  if (own && compact) {
    // Short banner: no fixed frame, the image keeps its own height.
    return (
      <div className="w-full overflow-hidden" style={{ backgroundColor: bg }}>
        <img
          src={own}
          alt={project.title}
          loading="lazy"
          onLoad={(e) => setBg(edgeColor(e.currentTarget))}
          className="block h-auto w-full"
        />
      </div>
    )
  }
  if (own) {
    return (
      <div className="aspect-video w-full overflow-hidden" style={{ backgroundColor: bg }}>
        <img
          src={own}
          alt={`${project.title} section ${index === undefined ? '' : index + 1}`.trim()}
          loading="lazy"
          onLoad={(e) => setBg(edgeColor(e.currentTarget))}
          className="size-full object-contain"
        />
      </div>
    )
  }
  // A banner without an image is simply not shown.
  return null
}

// Animated 4:3 collage of screenshots: columns of tiles drift up and down, alternating direction.
// It is live HTML and CSS, not a picture, so the screenshots stay sharp at any size.
// Each column starts at a different point of its loop (`shift`, as a share of one list), chosen so
// neighbouring columns show different screens at the same height. Columns alternate up and down.
const COLLAGE_COLUMNS = [
  { dir: 'up', seconds: 70, shift: 0 },
  { dir: 'down', seconds: 85, shift: 0.5 },
  { dir: 'up', seconds: 60, shift: 0.17 },
  { dir: 'down', seconds: 80, shift: 0.67 },
  { dir: 'up', seconds: 75, shift: 0.33 },
  { dir: 'down', seconds: 90, shift: 0.83 },
] as const

function Collage({ images, title }: { images: string[]; title: string }) {
  if (images.length === 0) return null
  // Enough tiles per loop to always cover the frame, even with only a few screenshots.
  const reps = Math.max(1, Math.ceil(6 / images.length))
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#182441] [container-type:inline-size]" role="img" aria-label={`${title} screens`}>
      <div className="absolute inset-y-0 -left-[5%] flex w-[110%] gap-[1.6%]" aria-hidden="true">
        {COLLAGE_COLUMNS.map((col, c) => {
          const list = Array.from({ length: reps }, () => images).flat()
          const start = col.dir === 'up' ? (1 - col.shift) % 1 : col.shift
          return (
            <div key={c} className="min-w-0 flex-1 overflow-hidden">
              <div
                className={`will-change-transform ${col.dir === 'up' ? 'animate-scroll-up' : 'animate-scroll-down'}`}
                style={{ animationDuration: `${col.seconds}s`, animationDelay: `-${(col.seconds * start).toFixed(1)}s` }}
              >
                {[...list, ...list].map((src, i) => (
                  <div key={i} style={{ paddingBottom: '9%' }}>
                    <img
                      src={src}
                      alt=""
                      decoding="async"
                      draggable={false}
                      className="block h-auto w-full rounded-[1.5cqw] shadow-[0_1.4cqw_3cqw_-0.6cqw_rgba(0,0,0,0.45)]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const Paragraphs = ({ items }: { items: string[] }) =>
  items.map((para) => (
    <p key={para} className="mt-6 text-xl leading-snug text-[#6b6b6b] sm:text-[22px]">{para}</p>
  ))

export default function CaseStudy() {
  const { slug } = useParams()
  const { projects, loading } = useProjects()
  const project = projects.find((p) => p.slug === slug)

  if (loading) return <div className="min-h-[60vh]" />

  if (!project) {
    return (
      <section className="mx-auto max-w-[1400px] px-4 py-32 text-center sm:px-6 lg:px-10">
        <h1 className="text-4xl font-medium tracking-tight">Project not found</h1>
        <Link to="/#portfolio" className="mt-6 inline-flex items-center gap-2 text-accent hover:underline">
          <ArrowLeft className="size-4" /> Back to portfolio
        </Link>
      </section>
    )
  }

  const meta = [
    ['Client', project.client],
    ['Stage', project.stage],
    ['Industry', project.industry],
    ['Timeline', project.timeline],
  ]
  const details = meta.filter(([, v]) => v)
  const hasTestimonial = Boolean(project.quote || project.author)
  const initials = project.author.split(' ').map((n) => n[0]).join('').slice(0, 2)
  const logoLetter = project.client[0] ?? project.title[0]
  const hasAbout = project.aboutLead || project.about.length > 0
  const hasChallenge = project.challengeLead || project.challengeIntro || project.challengePoints.length > 0
  const hasBranding = project.brandingLead || project.branding.length > 0

  const blocks: Record<string, ReactNode> = {
    about: hasAbout ? (
      <TextSection label="About project" lead={project.aboutLead}>
        <Paragraphs items={project.about} />
      </TextSection>
    ) : null,
    challenge: hasChallenge ? (
      <TextSection label="The challenge" lead={project.challengeLead}>
        {project.challengeIntro && <Paragraphs items={[project.challengeIntro]} />}
        {project.challengePoints.map((pt) => (
          <div key={pt.title} className="mt-7">
            <h3 className="text-xl font-medium leading-snug tracking-[-0.01em] sm:text-[22px]">{pt.title}</h3>
            <p className="mt-1 text-xl leading-snug text-[#6b6b6b] sm:text-[22px]">{pt.text}</p>
          </div>
        ))}
      </TextSection>
    ) : null,
    branding: hasBranding ? (
      <TextSection label="Branding" lead={project.brandingLead}>
        <Paragraphs items={project.branding} />
      </TextSection>
    ) : null,
    ...Object.fromEntries(
      (project.custom ?? []).map((c) => [
        c.id,
        c.type === 'collage' ? (
          <Collage key={c.id} images={c.images ?? []} title={project.title} />
        ) : c.type === 'text' ? (
          c.lead || c.paragraphs.length > 0 ? (
            <TextSection key={c.id} label={c.label} lead={c.lead}>
              <Paragraphs items={c.paragraphs} />
            </TextSection>
          ) : null
        ) : (
          <Banner key={c.id} project={project} src={c.image} compact={c.compact} />
        ),
      ]),
    ),
    ...Object.fromEntries(Array.from({ length: BANNER_COUNT }, (_, i) => [`banner-${i}`, <Banner key={i} project={project} index={i} />])),
  }

  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <section className="mx-auto grid max-w-[1400px] gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:pt-24">
        <div>
          <Link to="/#portfolio" className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> All work
          </Link>
          {project.clientLogo ? (
            <img src={project.clientLogo} alt={project.client || project.title} className="h-12 w-auto max-w-full object-contain object-left sm:h-14" />
          ) : (
            <div className="flex items-center gap-3 text-4xl font-semibold uppercase tracking-tight sm:text-5xl">
              <span className="flex size-12 items-center justify-center border-2 border-ink text-2xl sm:size-14">
                {logoLetter}
              </span>
              {project.client || project.title}
            </div>
          )}
          <h1 className="mt-10 text-[28.8px] font-medium leading-[1.1] tracking-[-0.035em] sm:text-[38.4px] xl:text-[44.8px]">
            {project.heading}
          </h1>
        </div>

        <div className="flex flex-col gap-3 lg:pt-1">
          <dl className={`grid grid-cols-2 gap-3 lg:grid-cols-2 ${DETAIL_COLS[details.length] ?? DETAIL_COLS[4]}`}>
            {details.map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-xl bg-panel px-4 py-4 lg:px-5 2xl:px-4">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="mt-1 break-words text-lg leading-snug lg:text-xl 2xl:text-lg">{v}</dd>
              </div>
            ))}
          </dl>

          {hasTestimonial && (
            <figure className="rounded-xl bg-panel p-5 sm:p-6">
              {project.clientLogo ? (
                <img src={project.clientLogo} alt="" className="h-9 w-auto max-w-full object-contain object-left" />
              ) : (
                <div className="flex items-center gap-2 text-2xl font-semibold uppercase tracking-tight">
                  <span className="flex size-7 items-center justify-center border-2 border-ink text-sm">{logoLetter}</span>
                  {project.client || project.title}
                </div>
              )}
              {project.quote && <blockquote className="mt-6 text-xl leading-snug">“{project.quote}”</blockquote>}
              {project.author && (
                <figcaption className="mt-5 flex items-center gap-3">
                  {project.authorPhoto ? (
                    <img src={project.authorPhoto} alt={project.author} className="size-14 rounded-md object-cover" />
                  ) : (
                    <span className="flex size-14 items-center justify-center rounded-md bg-ink text-lg font-medium text-white">{initials}</span>
                  )}
                  <span>
                    <span className="block font-medium">{project.author}</span>
                    <span className="block text-[15px]">{project.authorRole}</span>
                  </span>
                </figcaption>
              )}
            </figure>
          )}
        </div>
      </section>

      {normalizeOrder(project.order, project.custom).map((id) => (
        <Fragment key={id}>{blocks[id]}</Fragment>
      ))}

      <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-10 sm:px-6 lg:px-10">
        <Link to="/#portfolio" className="inline-flex items-center gap-2 text-lg hover:text-accent">
          <ArrowLeft className="size-5" /> Back to all work
        </Link>
      </div>
    </motion.article>
  )
}
