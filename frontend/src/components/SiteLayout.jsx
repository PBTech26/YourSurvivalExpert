import { useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'

export default function SiteLayout({ children, ctaLabel = 'Start', onCta }) {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll('[data-animate]'))
    if (targets.length === 0) return undefined

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      targets.forEach((el) => el.classList.add('reveal', 'is-visible'))
      return undefined
    }

    targets.forEach((el) => el.classList.add('reveal'))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -10% 0px' }
    )

    targets.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="page">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">YSE</span>
          <div>
            <strong>yoursurvivalexpert.ai</strong>
            <p>Calm emergency preparedness</p>
          </div>
        </div>
        <nav className="site-nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          <NavLink to="/privacy">Privacy</NavLink>
          <NavLink to="/terms">Terms</NavLink>
        </nav>
        {onCta ? (
          <button className="primary small" type="button" onClick={onCta}>
            {ctaLabel}
          </button>
        ) : (
          <Link className="primary small" to="/">
            Start
          </Link>
        )}
      </header>
      {children}
      <footer className="site-footer">
        Preparedness should feel steady — not scary.
      </footer>
    </div>
  )
}
