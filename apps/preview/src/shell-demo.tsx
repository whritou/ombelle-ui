import * as React from 'react'
import { createRoot } from 'react-dom/client'

const families = [
  ['ombelle', 'Ombelle'], ['papier', 'Papier'], ['organic', 'Organic'], ['retro-futurism', 'Retro futurism'],
  ['minimalist', 'Minimalist'], ['flat', 'Flat'], ['neo-brutalism', 'Neo-brutalism'], ['liquid-glass', 'Liquid glass'],
] as const
const components = [
  ['sidebar', 'Sidebar'], ['navigation-menu', 'Navigation Menu'], ['resizable', 'Resizable'],
  ['data-table', 'Data Table'], ['menubar', 'Menubar'], ['prose', 'Prose'],
] as const

/** Each family's audit page, filtered to the chosen shell components, side by side. */
function ShellDemo() {
  const [mode, setMode] = React.useState<'light' | 'dark'>('light')
  const [edition, setEdition] = React.useState<'radix' | 'base'>('radix')
  const [chosen, setChosen] = React.useState<string[]>(components.map(([id]) => id))
  const [height, setHeight] = React.useState(760)
  const base = window.location.pathname.startsWith('/ombelle-preview') ? '/ombelle-preview' : ''
  const dark = mode === 'dark'
  const ink = dark ? '#f4f4f5' : '#18181b'
  const panel = dark ? '#18181b' : '#ffffff'
  const button = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', border: `1px solid ${ink}`, borderRadius: 8, cursor: 'pointer', font: '600 13px system-ui, sans-serif',
    background: active ? ink : 'transparent', color: active ? panel : ink,
  })
  return <main style={{ minHeight: '100vh', padding: 24, background: dark ? '#09090b' : '#f4f4f5', color: ink, font: '14px system-ui, sans-serif' }}>
    <h1 style={{ margin: '0 0 4px', font: '700 24px system-ui, sans-serif' }}>App shell components in every style</h1>
    <p style={{ margin: '0 0 16px', opacity: 0.75 }}>Sidebar, Navigation Menu, Resizable, Data Table, Menubar and Prose, as each family draws them.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 20 }}>
      <div role="group" aria-label="Mode" style={{ display: 'flex', gap: 6 }}>
        {(['light', 'dark'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} style={button(mode === value)} onClick={() => setMode(value)}>{value === 'light' ? 'Light' : 'Dark'}</button>)}
      </div>
      <div role="group" aria-label="Edition" style={{ display: 'flex', gap: 6 }}>
        {(['radix', 'base'] as const).map(value => <button key={value} type="button" aria-pressed={edition === value} style={button(edition === value)} onClick={() => setEdition(value)}>{value === 'radix' ? 'Radix' : 'Base UI'}</button>)}
      </div>
      <div role="group" aria-label="Components" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {components.map(([id, name]) => {
          const on = chosen.includes(id)
          return <button key={id} type="button" aria-pressed={on} style={button(on)}
            onClick={() => setChosen(previous => on ? (previous.length > 1 ? previous.filter(item => item !== id) : previous) : [...previous, id])}>{name}</button>
        })}
      </div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>Frame height
        <input type="range" min={400} max={1600} step={40} value={height} onChange={event => setHeight(Number(event.target.value))} />
      </label>
    </div>
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 560px), 1fr))' }}>
      {families.map(([id, name]) => <section key={id} style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0, font: '700 16px system-ui, sans-serif' }}>{name}</h2>
        <iframe title={`${name} app shell components`} loading="lazy"
          src={`${base}/audit/${id}/${edition}/?mode=${mode}&only=${chosen.join(',')}`}
          style={{ inlineSize: '100%', blockSize: height, border: `1px solid ${ink}`, borderRadius: 12, background: panel }} />
      </section>)}
    </div>
  </main>
}

export function mountShellDemo(root: HTMLElement): void {
  document.title = 'App shell components in every style'
  createRoot(root).render(<ShellDemo />)
}
