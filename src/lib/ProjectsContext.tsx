import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import type { Project } from '../types'

interface Ctx {
  projects: Project[]
  loading: boolean
  refresh: () => Promise<void>
}

const ProjectsContext = createContext<Ctx>({ projects: [], loading: true, refresh: async () => {} })

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setProjects(await api.listProjects())
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const value = useMemo(() => ({ projects, loading, refresh }), [projects, loading, refresh])
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useProjects = () => useContext(ProjectsContext)
