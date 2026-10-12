import { motion } from 'framer-motion'
import { showcaseA, showcaseB, site } from '../data/content'
import ShowcaseCard from './ShowcaseCard'

function Column({ items, reverse = false }: { items: typeof showcaseA; reverse?: boolean }) {
  const loop = [...items, ...items]
  return (
    <div className="overflow-hidden">
      <div className={`flex flex-col gap-3 ${reverse ? 'animate-scroll-down' : 'animate-scroll-up'}`}>
        {loop.map((p, i) => (
          <ShowcaseCard key={i} project={p} tall={i % 2 === 1} />
        ))}
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-[1400px] gap-10 px-4 pb-16 pt-10 sm:px-6 lg:min-h-[calc(100vh-90px)] lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:px-10 lg:py-0">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex min-w-0 flex-col justify-center lg:py-0"
      >
        <h1 className="text-[44px] font-medium leading-[1.05] tracking-[-0.04em] sm:text-6xl xl:text-[68px]">
          {site.headline}
        </h1>
        <p className="mt-6 text-xl text-muted">{site.subheadline}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="grid h-[520px] grid-cols-2 gap-3 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_92%,transparent)] lg:h-auto lg:max-h-[calc(100vh-90px)]"
      >
        <Column items={showcaseA} />
        <Column items={showcaseB} reverse />
      </motion.div>
    </section>
  )
}
