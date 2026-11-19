'use client'

import { ArrowRight, ChevronUp, Moon, RotateCw } from 'lucide-react'
import { useId, useState } from 'react'
import { repository } from '../links'
import { themeStorageKey } from '../theme'
import { KitSegmented, KitSwitch } from './kit'
import { CascadeSection, EditionsSection, MiniEditorSection } from './detail-sections'
import { JourneySection } from './journey'
import { LandingProvider, useLanding, usePageStyle, type LandingData } from './landing-state'
import { familyMeta } from './landing-theme'
import { ShellSection } from './shell-demo'
import { StyleTilesSection } from './style-tiles'
import './landing.css'

/** The landing page. The whole page wears one style family at a time. */
export function Landing({ data }: { data: LandingData }) {
  return (
    <LandingProvider data={data}>
      <Page />
    </LandingProvider>
  )
}

function Page() {
  const { family, instant } = useLanding()
  return (
    <main className="ol" data-family={family} data-instant={instant} style={usePageStyle()}>
      <Hero />
      <Marquee />
      <JourneySection />
      <StyleTilesSection />
      <ShellSection />
      <EditionsSection />
      <MiniEditorSection />
      <CascadeSection />
      <section className="ol-end" aria-labelledby="feedback">
        <div className="ol-wrap rv">
          <h2 className="ol-h2" id="feedback" style={{ marginInline: 'auto' }}>Local-first. Early. Open to feedback.</h2>
          <p className="ol-lead" style={{ marginInline: 'auto' }}>Ombelle is in alpha. Try the components in your own app and help shape what ships next.</p>
          <div className="ol-row">
            <a className="ol-btn lg" href="#get-started">Get started</a>
            <a className="ol-btn out lg" href={`${repository}/issues`}>Share feedback on GitHub</a>
          </div>
        </div>
      </section>
      <StyleDock />
    </main>
  )
}

const plans = [{ value: 'solo', label: 'Solo' }, { value: 'team', label: 'Team' }, { value: 'studio', label: 'Studio' }] as const

function Hero() {
  const { family, families, componentCount } = useLanding()
  const meta = familyMeta[family]
  const id = useId()
  const [plan, setPlan] = useState<(typeof plans)[number]['value']>('team')
  const [notify, setNotify] = useState(true)
  const [sent, setSent] = useState(false)
  return (
    <section className="ol-hero" id="hero-section" aria-labelledby="hero">
      <div className="ol-motif" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="ol-wrap ol-hero-in">
        <div>
          <p className="ol-eye">React · shadcn · Radix UI / Base UI · Tailwind v4</p>
          <h1 className="ol-h1" id="hero">Your components.<br /><span className="ol-hl ol-in-anim" key={family}>Your style.</span></h1>
          <p className="ol-lead">Ombelle installs editable React component source into your Vite or Next.js app, with Radix UI and Base UI editions, shared project presets and scoped component recipes.</p>
          <div className="ol-row" style={{ marginTop: 30 }}>
            <a className="ol-btn lg" href="#get-started">Get started <ArrowRight size={16} strokeWidth={2.4} aria-hidden /></a>
            <a className="ol-btn out lg" href="#styles">Try on a style</a>
          </div>
          <p className="ol-now">
            <span className="ol-mono ol-mfg">Style {String(families.indexOf(family) + 1).padStart(2, '0')}</span>
            <b className="ol-in-anim" key={family}>{meta.name}</b>
            <span className="ol-mfg">{meta.blurb}</span>
          </p>
          <p className="ol-stats">
            <span><b>{componentCount}</b>components</span>
            <span><b>{families.length}</b>style families</span>
            <span><b>2</b>editions</span>
            <span><b>2</b>modes, light and dark</span>
          </p>
        </div>
        <div className="ol-stage">
          <div className="ol-card ol-form">
            <div className="ol-band sun"><h2 className="ol-h3">Create workspace</h2><span className="ol-bdg">Step 1/2</span></div>
            {/* An illustrative form; nothing is sent anywhere. */}
            <form className="ol-form-b" onSubmit={(event) => { event.preventDefault(); setSent(true) }}>
              <label htmlFor={`${id}-name`}>Workspace name</label>
              <input className="ol-in" id={`${id}-name`} type="text" placeholder="acme-design" />
              <KitSegmented label="Plan" value={plan} options={plans} onChange={setPlan} />
              <div className="ol-row" style={{ justifyContent: 'space-between' }}>
                <span id={`${id}-notify`}>Email me updates</span>
                <KitSwitch checked={notify} onChange={setNotify} labelledBy={`${id}-notify`} />
              </div>
              <div className="ol-row">
                <button className="ol-btn" type="submit" style={{ flex: 1 }}>{sent ? 'Workspace created' : 'Continue'}</button>
                <button className="ol-btn gh" type="button" onClick={() => { setSent(false); setPlan('team'); setNotify(true) }}>Reset</button>
              </div>
            </form>
          </div>
          <div className="ol-side">
            <div className="ol-card deco ol-pad">
              <p className="ol-lb">Accessibility</p>
              <p className="ol-big">WAI-ARIA</p>
              <p className="ol-mfg" style={{ fontSize: 14, marginTop: 6 }}>Keyboard, focus and roles from Radix UI or Base UI.</p>
            </div>
            <div className="ol-card ol-pad">
              <div className="ol-row" style={{ gap: 8 }}>
                {['Radix UI', 'Base UI', 'shadcn', 'Tailwind v4', 'TypeScript'].map((name) => <span className="ol-bdg" key={name}>{name}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Every catalog component by name, in two rows that drift in opposite directions. */
function Marquee() {
  const { components, componentCount } = useLanding()
  const half = Math.ceil(components.length / 2)
  const rows = [components.slice(0, half), components.slice(half)]
  return (
    <section className="ol-mqs" aria-label={`${componentCount} components in the catalog`}>
      {rows.map((row, index) => (
        <div className={index ? 'ol-mq rev' : 'ol-mq'} key={index}>
          {/* The second copy only closes the loop, so it is hidden from assistive technology. */}
          {[false, true].map((copy) => (
            <ul key={String(copy)} aria-hidden={copy || undefined}>
              {row.map((component) => <li className={component.fresh ? 'ol-chip new' : 'ol-chip'} key={component.name}>{component.name}</li>)}
            </ul>
          ))}
        </div>
      ))}
      <p className="ol-wrap" style={{ width: '100%', textAlign: 'center' }}>
        <a className="ol-link" href="/components">Explore all {componentCount} components</a>
      </p>
    </section>
  )
}

/** The style dock: wear any family from anywhere on the page. On a phone it folds into one button. */
function StyleDock() {
  const { family, families, wear, dark, playing, setPlaying } = useLanding()
  const [open, setOpen] = useState(false)
  // The dock drives the site theme, the same one the header toggle sets.
  const setDark = (next: boolean) => {
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem(themeStorageKey, next ? 'dark' : 'light')
    } catch {}
  }
  return (
    <div className="ol-dock" role="group" aria-label="Page style" data-open={open}>
      <span>Style</span>
      <div className="ol-dock-list">
        {families.map((id) => (
          <button className="ol-dk" type="button" key={id} aria-pressed={id === family} onClick={(event) => { setOpen(false); wear(id, event) }}>
            <i className="ol-dot" data-family={id} aria-hidden="true" />{familyMeta[id].short}
          </button>
        ))}
        <hr aria-hidden="true" />
        <button className="ol-dk" type="button" aria-pressed={dark} onClick={() => setDark(!dark)}><Moon size={16} aria-hidden />Dark</button>
        <button className="ol-dk play" type="button" aria-pressed={playing} onClick={() => setPlaying(!playing)}><RotateCw size={16} aria-hidden />Cycle</button>
      </div>
      <button className="ol-dk ol-dock-t" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        <i className="ol-dot" data-family={family} aria-hidden="true" />{familyMeta[family].short}<ChevronUp size={14} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  )
}
