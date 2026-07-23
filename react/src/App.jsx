import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatches } from 'react-router-dom'

function DocumentTitle() {
  const matches = useMatches()
  const leaf = matches[matches.length - 1]
  const title = leaf?.handle?.title ? String(leaf.handle.title) : 'Jobs'

  useEffect(() => {
    document.title = `${title} · JobFinder`
  }, [title])

  return null
}

export default function App() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function onKeydown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [])

  return (
    <div className="app-shell">
      <DocumentTitle />
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
            JobFinder
          </Link>

          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen ? 'true' : 'false'}
            aria-controls="site-nav-links"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
            <span className="nav-toggle-bars" aria-hidden="true" />
          </button>

          <nav
            id="site-nav-links"
            className={`nav-links${menuOpen ? ' open' : ''}`}
            aria-label="Primary"
          >
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              All Jobs
            </NavLink>
            <NavLink
              to="/hr"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              HR Jobs
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <a
          className="powered-by"
          href="https://getjobbox.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="powered-by-label">Powered by</span>
          <img
            className="powered-by-logo"
            src="/brand/icon.webp"
            alt="JobBox"
            width={28}
            height={28}
          />
          <span className="powered-by-name">JobBox</span>
        </a>
      </footer>
    </div>
  )
}
