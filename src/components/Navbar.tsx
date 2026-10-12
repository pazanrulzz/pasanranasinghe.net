import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'
import { nav, site } from '../data/content'

function Dropdown({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="group relative">
      <button className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[15px] hover:bg-panel">
        {label}
        <ChevronDown className="size-4 transition-transform group-hover:rotate-180" />
      </button>
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
        <ul className="min-w-48 rounded-xl border border-line bg-white p-1.5 shadow-lg">
          {items.map((i) => (
            <li key={i}>
              <a href="#" className="block rounded-lg px-3 py-2 text-sm hover:bg-panel">{i}</a>
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
      <div className="mx-auto max-w-[1400px] rounded-2xl border border-line bg-white/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur">
        <div className="flex h-[60px] items-center justify-between px-5 sm:px-7">
          <Link to="/" className="text-[28px] font-semibold tracking-tight">{site.name}</Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <Dropdown label="Services" items={nav.services} />
            <Dropdown label="Resources" items={nav.resources} />
          </nav>

          <button className="rounded-lg p-2 hover:bg-panel lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {open && (
          <div className="flex flex-col gap-1 border-t border-line p-4 lg:hidden">
            {['Services', 'Resources'].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 hover:bg-panel">{l}</a>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
