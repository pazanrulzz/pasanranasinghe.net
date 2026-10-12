import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { projects } from '../data/content'
import ShowcaseCard from './ShowcaseCard'

export default function CaseStudy() {
  const { slug } = useParams()
  const project = projects.find((p) => p.slug === slug)

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
  const initials = project.author.split(' ').map((n) => n[0]).join('')

  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <section className="mx-auto grid max-w-[1400px] gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:pt-24">
        <div>
          <Link to="/#portfolio" className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> All work
          </Link>
          <div className="flex items-center gap-3 text-4xl font-semibold uppercase tracking-tight sm:text-5xl">
            <span className="flex size-12 items-center justify-center border-2 border-ink text-2xl sm:size-14">
              {project.client[0]}
            </span>
            {project.client}
          </div>
          <h1 className="mt-10 text-4xl font-medium leading-[1.1] tracking-[-0.035em] sm:text-5xl xl:text-[56px]">
            {project.heading}
          </h1>
        </div>

        <div className="flex flex-col gap-3 lg:pt-1">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {meta.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-panel px-5 py-4">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="mt-1 text-xl">{v}</dd>
              </div>
            ))}
          </dl>

          <figure className="rounded-xl bg-panel p-5 sm:p-6">
            <div className="flex items-center gap-2 text-2xl font-semibold uppercase tracking-tight">
              <span className="flex size-7 items-center justify-center border-2 border-ink text-sm">{project.client[0]}</span>
              {project.client}
            </div>
            <blockquote className="mt-6 text-xl leading-snug">“{project.quote}”</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span className="flex size-14 items-center justify-center rounded-md bg-ink text-lg font-medium text-white">{initials}</span>
              <span>
                <span className="block font-medium">{project.author}</span>
                <span className="block text-[15px]">{project.authorRole}</span>
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Full-bleed banner (placeholder: replace with a real project image) */}
      <div className={`flex min-h-[420px] items-center justify-center bg-gradient-to-br ${project.gradient} px-6 py-20 sm:min-h-[560px]`}>
        <p className={`max-w-3xl text-center text-5xl font-medium tracking-tight sm:text-7xl ${project.dark ? 'text-white' : 'text-ink'}`}>
          {project.caption}
        </p>
      </div>

      {/* Gallery (placeholder visuals) */}
      <section className="mx-auto grid max-w-[1400px] gap-4 px-4 py-4 sm:grid-cols-2 sm:px-6 lg:px-10">
        <ShowcaseCard project={project} />
        <ShowcaseCard project={project} />
        <div className="sm:col-span-2">
          <ShowcaseCard project={project} />
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-10 sm:px-6 lg:px-10">
        <Link to="/#portfolio" className="inline-flex items-center gap-2 text-lg hover:text-accent">
          <ArrowLeft className="size-5" /> Back to all work
        </Link>
      </div>
    </motion.article>
  )
}
