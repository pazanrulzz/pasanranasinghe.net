import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExternalLink, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useProjects } from '../lib/ProjectsContext'
import { gradientOf } from '../types'
import SmartCreateDialog from './smart/SmartCreateDialog'

export default function Dashboard() {
  const { projects, loading, refresh } = useProjects()
  const [error, setError] = useState('')
  const [smartOpen, setSmartOpen] = useState(false)
  const navigate = useNavigate()

  async function remove(slug: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      await api.deleteProject(slug)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-medium tracking-tight">Portfolio items</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSmartOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 font-medium hover:border-accent hover:text-accent"
          >
            <Sparkles className="size-4" /> Smart create
          </button>
          <Link to="/admin/new" className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-dark">
            <Plus className="size-4" /> New item
          </Link>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white">
        {loading ? (
          <p className="p-8 text-muted">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="p-8 text-muted">No items yet. Create your first one.</p>
        ) : (
          <ul className="divide-y divide-line">
            {projects.map((p) => (
              <li key={p.slug} className="flex items-center gap-4 p-4">
                {p.coverImage ? (
                  <img src={p.coverImage} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="size-16 shrink-0 rounded-lg" style={{ backgroundImage: gradientOf(p) }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg">{p.title}</p>
                  <p className="truncate text-sm text-muted">{p.category}{p.client ? ` · ${p.client}` : ''}</p>
                </div>
                <Link to={`/work/${p.slug}`} target="_blank" aria-label={`View ${p.title}`} className="rounded-lg p-2 hover:bg-panel">
                  <ExternalLink className="size-5" />
                </Link>
                <Link to={`/admin/edit/${p.slug}`} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-panel">
                  <Pencil className="size-4" /> Edit
                </Link>
                <button
                  onClick={() => remove(p.slug, p.title)}
                  aria-label={`Delete ${p.title}`}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {smartOpen && (
        <SmartCreateDialog
          onClose={() => setSmartOpen(false)}
          onGenerated={(draft, source) => navigate('/admin/new', { state: { draft, source } })}
        />
      )}
    </>
  )
}
