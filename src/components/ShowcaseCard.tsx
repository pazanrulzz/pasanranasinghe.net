import { gradientOf, type Project } from '../types'

// Shows the cover image when one is uploaded, otherwise a gradient mock-up.
export default function ShowcaseCard({ project, tall = false, wide = false }: { project: Project; tall?: boolean; wide?: boolean }) {
  const shape = wide ? 'aspect-[16/7]' : tall ? 'aspect-[4/5]' : 'aspect-[4/3]'

  if (project.coverImage) {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-line bg-panel ${shape}`}>
        <img src={project.coverImage} alt={project.title} loading="lazy" className="size-full object-cover" />
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-line ${shape}`} style={{ backgroundImage: gradientOf(project) }}>
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className={`w-full max-w-[85%] rotate-[-4deg] rounded-lg p-4 shadow-2xl ring-1 ${project.dark ? 'bg-black/60 text-white ring-white/10' : 'bg-white/80 text-ink ring-black/5'}`}>
          <div className="mb-3 flex gap-1">
            <span className="size-1.5 rounded-full bg-current opacity-30" />
            <span className="size-1.5 rounded-full bg-current opacity-30" />
            <span className="size-1.5 rounded-full bg-current opacity-30" />
          </div>
          <p className="text-sm font-medium leading-snug">{project.caption || project.title}</p>
          <div className="mt-3 h-1.5 w-2/3 rounded-full bg-current opacity-15" />
          <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-current opacity-15" />
          <div className="mt-4 h-5 w-16 rounded bg-accent/90" />
        </div>
      </div>
    </div>
  )
}
