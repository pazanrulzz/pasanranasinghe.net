import { Link } from 'react-router-dom'
import { footer, site } from '../data/content'

export default function Footer() {
  return (
    <footer className="mt-10 bg-[#fcfbf9]">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <Link to="/" className="text-[32px] font-semibold tracking-tight">{site.name}</Link>
        <p className="mt-4 max-w-[560px] text-xl leading-snug text-[#333]">{footer.tagline}</p>

        <div className="mt-16 flex flex-col justify-between gap-12 lg:flex-row">
          <div>
            <h4 className="text-xl">Address</h4>
            <p className="mt-4 text-xl leading-snug text-[#555]">
              {footer.address.map((l) => <span key={l} className="block">{l}</span>)}
            </p>
            <div className="mt-8 flex gap-16">
              <div>
                <h4 className="text-xl">Phone</h4>
                <a href={`tel:${footer.phone.replace(/\s/g, '')}`} className="mt-3 block text-xl text-[#555] underline underline-offset-2">
                  {footer.phone}
                </a>
              </div>
              <div>
                <h4 className="text-xl">Email</h4>
                <a href={`mailto:${footer.email}`} className="mt-3 block text-xl text-[#555] hover:underline">
                  {footer.email}
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-14 gap-y-10 sm:grid-cols-3">
            {footer.columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-xl">{col.title}</h4>
                <ul className="mt-5 space-y-4">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-xl text-[#777] transition hover:text-ink">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
