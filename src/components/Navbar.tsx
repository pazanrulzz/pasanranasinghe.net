import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'
import { nav, site } from '../data/content'

function GlassFilter() {
  return (
    <svg className="absolute size-0" aria-hidden="true">
      <filter id="liquid-glass-distortion" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="4" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />
        <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="40" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  )
}

function Dropdown({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="group relative">
      <button className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[15px] hover:bg-white/60">
        {label}
        <ChevronDown className="size-4 transition-transform group-hover:rotate-180" />
      </button>
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
        <ul className="min-w-48 rounded-2xl border border-white/70 bg-white/85 p-1.5 shadow-lg backdrop-blur-xl">
          {items.map((i) => (
            <li key={i}>
              <a href="#" className="block rounded-lg px-3 py-2 text-sm hover:bg-black/5">{i}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-10">
      <GlassFilter />
      <div className="liquid-glass mx-auto max-w-[1400px] rounded-[28px]">
        <div className="flex h-[60px] items-center justify-between px-5 sm:px-7">
          <Link to="/" className="text-[28px] font-semibold tracking-tight">{site.name}</Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <Dropdown label="Services" items={nav.services} />
            <Dropdown label="Resources" items={nav.resources} />
          </nav>

          <button className="rounded-lg p-2 hover:bg-white/60 lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {open && (
          <div className="flex flex-col gap-1 border-t border-black/5 p-4 lg:hidden">
            {['Services', 'Resources'].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-panel">{l}</a>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
