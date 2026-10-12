import { useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { categories, projects } from '../data/content'
import ShowcaseCard from './ShowcaseCard'

export default function Portfolio() {
  const [active, setActive] = useState<string>('All')
  const list = useMemo(() => (active === 'All' ? projects : projects.filter((p) => p.category === active)), [active])

  return (
    <section id="portfolio" className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
      <span className="inline-block rounded-lg border border-line px-3 py-1.5 text-sm">Portfolio</span>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-5xl font-medium tracking-[-0.04em] sm:text-6xl">Work I'm proud of</h2>
        <p className="text-xl text-muted">Some of the work I'm proud of</p>
      </div>

      <div className="mt-10 grid items-start gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="lg:sticky lg:top-28">
          <div className="mb-4 flex items-center gap-3 text-lg">
            <SlidersHorizontal className="size-5" /> Filters
          </div>
          <div className="flex flex-wrap gap-2 lg:flex-col">
            {['All', ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`rounded-lg border bg-white px-4 py-3 text-left text-[17px] transition ${active === c ? 'border-accent' : 'border-line hover:border-[#d6d6d6]'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </aside>

        <motion.div layout className="grid gap-5 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {list.map((p) => (
              <motion.article
                layout
                key={p.title}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-line transition hover:border-[#d6d6d6] hover:shadow-sm"
              >
                <Link to={`/work/${p.slug}`} className="block p-3">
                  <ShowcaseCard project={p} />
                  <h3 className="mt-4 px-1 text-xl">{p.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2 px-1 pb-1">
                    {p.tags.map((t) => (
                      <span key={t} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-[15px]">{t}</span>
                    ))}
                  </div>
                </Link>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
