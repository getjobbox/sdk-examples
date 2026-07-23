'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Drop stale Vite/PWA service workers left on this origin from other examples. */
function useClearStaleServiceWorkers() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) {
        void reg.unregister()
      }
    })
    if (typeof caches !== 'undefined') {
      void caches.keys().then((keys) => {
        for (const key of keys) {
          void caches.delete(key)
        }
      })
    }
  }, [])
}

export default function SiteShell({ children }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useClearStaleServiceWorkers()

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    function onKeydown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [])

  return (
    <div className="app-shell">
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
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
            <Link
              href="/"
              className={`nav-link${pathname === '/' ? ' active' : ''}`}
            >
              All Jobs
            </Link>
            <Link
              href="/hr"
              className={`nav-link${pathname === '/hr' ? ' active' : ''}`}
            >
              HR Jobs
            </Link>
          </nav>
        </div>
      </header>

      <main className="app-main">{children}</main>

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
