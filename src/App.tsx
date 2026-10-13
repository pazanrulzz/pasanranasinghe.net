import { useEffect } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Portfolio from './components/Portfolio'
import CaseStudy from './components/CaseStudy'
import Footer from './components/Footer'
import { ProjectsProvider } from './lib/ProjectsContext'
import AdminLayout from './admin/AdminLayout'
import Login from './admin/Login'
import Dashboard from './admin/Dashboard'
import ProjectEditor from './admin/ProjectEditor'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView())
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])
  return null
}

function SiteLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

function Home() {
  return (
    <>
      <Hero />
      <Portfolio />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ProjectsProvider>
        <ScrollManager />
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="new" element={<ProjectEditor />} />
            <Route path="edit/:slug" element={<ProjectEditor />} />
          </Route>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/work/:slug" element={<CaseStudy />} />
            <Route path="*" element={<CaseStudy />} />
          </Route>
        </Routes>
      </ProjectsProvider>
    </BrowserRouter>
  )
}
