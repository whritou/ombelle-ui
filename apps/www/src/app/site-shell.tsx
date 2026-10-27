'use client'

import { useState } from 'react'
import Link from 'next/link'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Ombelle home"><img src="/ombelle-symbol.png" alt="" /><img className="wordmark" src="/ombelle-wordmark.png" alt="Ombelle" /></Link>
      <button className="mobile-menu" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation">Menu</button>
      <nav className={open ? 'nav-links open' : 'nav-links'}>
        <Link href="/docs">Documentation</Link><Link href="/components">Components</Link><Link href="/presets">Presets</Link><a href="https://github.com/whritou/ombelle-ui">GitHub</a>
        <Link className="search-pill" href="/components"><span>⌕</span> Search <kbd>⌘ K</kbd></Link>
      </nav>
    </header>
  )
}

export function SiteFooter() { return <footer className="site-footer"><span>© 2026 Ombelle UI · local-first alpha</span><div><Link href="/docs">Docs</Link><Link href="/components">Components</Link><Link href="/presets">Presets</Link></div></footer> }

export function StyleSwitcher({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <div className="style-switcher" role="group" aria-label="Choose style family">{['Flat', 'Minimalist', 'Neo Brutalism'].map((style) => <button key={style} className={value === style ? 'active' : ''} onClick={() => onChange(style)}>{style}</button>)}</div> }

export function Preview({ style = 'Flat' }: { style?: string }) { return <div className={`component-preview preview-${style.toLowerCase().replace(' ', '-')}`}><div className="preview-top"><span className="eyebrow">Ombelle / playground</span><span className="status-dot">● Ready</span></div><div className="preview-card"><div className="avatar">O</div><div><strong>Ship your interface</strong><p>Editable source, your visual language.</p></div></div><div className="preview-actions"><button className="demo-button primary">Get started <span>→</span></button><button className="demo-button">Learn more</button><span className="demo-badge">Alpha</span></div><div className="preview-tabs"><span className="selected">Overview</span><span>Tokens</span><span>Recipes</span><label className="toggle"><input type="checkbox" defaultChecked /><i /></label></div></div> }
