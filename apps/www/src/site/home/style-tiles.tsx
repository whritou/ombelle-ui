'use client'

import { accessibilityCaveatLabel, type StyleFamily } from '@ombelle/contracts'
import { Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { KitSegmented, KitSwitch, LookPicker, useLookName } from './kit'
import { useLanding } from './landing-state'
import { familyMeta } from './landing-theme'

/** A specimen switch that keeps its own state. */
function SpecimenSwitch({ label }: { label: string }) {
  const [checked, setChecked] = useState(true)
  return <KitSwitch checked={checked} onChange={setChecked} label={label} />
}

function Progress({ label }: { label: string }) {
  return <div className="ol-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={64}><span /></div>
}

function BillingPeriod() {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  return <KitSegmented label="Billing period" value={period} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} onChange={setPeriod} />
}

/**
 * One composition per family, built around what sets it apart. They are
 * illustrations: nothing is sent, and the copy is sample content.
 */
const specimens: Record<StyleFamily, (componentCount: number, familyCount: number) => ReactNode> = {
  ombelle: () => (
    <div className="ol-card ol-spec"><div className="ol-spec-b">
      <div className="ol-spec-r">
        <span className="ol-bdg">New</span>
        <span className="ol-bdg" style={{ background: 'var(--pri)', color: 'var(--prif)' }}>Pro</span>
        <span className="ol-bdg" style={{ background: 'var(--card)', color: 'var(--fg)' }}>Beta</span>
      </div>
      <BillingPeriod />
      <div className="ol-spec-r"><button className="ol-btn sm" type="button">Get started</button><button className="ol-btn out sm" type="button">Details</button></div>
    </div></div>
  ),
  minimalist: () => (
    <div className="ol-card ol-spec"><div className="ol-spec-b">
      <label className="ol-cap" htmlFor="tile-minimalist-mail">Email</label>
      <input className="ol-in" id="tile-minimalist-mail" type="email" placeholder="you@studio.dev" />
      <dl className="ol-kv"><div><dt>Plan</dt><dd>Team</dd></div><div><dt>Seats</dt><dd>12</dd></div><div><dt>Renews</dt><dd>1 March</dd></div></dl>
      <div className="ol-spec-r" style={{ justifyContent: 'space-between' }}>
        <a className="ol-link" href="#styles" style={{ fontSize: 14, fontWeight: 500, textDecorationThickness: 1 }}>Change plan</a>
        <button className="ol-btn sm" type="button">Save</button>
      </div>
    </div></div>
  ),
  'neo-brutalism': () => (
    <div className="ol-card ol-spec">
      <div className="ol-band"><span className="ol-h3">Drop 03</span><span className="ol-bdg" style={{ transform: 'rotate(4deg)', background: 'var(--acc)' }}>Sold out</span></div>
      <div className="ol-spec-b">
        <div className="ol-spec-r" style={{ gap: 12 }}>
          <span className="ol-bdg">New</span>
          <span className="ol-bdg" style={{ transform: 'rotate(3deg)', background: 'var(--pri)', color: 'var(--prif)' }}>Hot</span>
          <span className="ol-bdg" style={{ transform: 'rotate(-5deg)', background: 'var(--acc)' }}>20% off</span>
        </div>
        <input className="ol-in" type="email" aria-label="Email for restock alerts" placeholder="you@studio.dev" />
        <button className="ol-btn" type="button" style={{ width: '100%' }}>Notify me</button>
      </div>
    </div>
  ),
  flat: (componentCount, familyCount) => (
    <>
      <div className="ol-blocks">
        <div style={{ background: 'var(--pri)', color: 'var(--prif)' }}><b>{componentCount}</b>components</div>
        <div style={{ background: 'var(--sec)', color: 'var(--secf)' }}><b>{familyCount}</b>families</div>
        <div style={{ background: 'var(--acc)', color: '#0F172A' }}><b>2</b>editions</div>
      </div>
      <div className="ol-card ol-spec"><div className="ol-spec-b">
        <input className="ol-in" type="email" aria-label="Email for the weekly digest" placeholder="you@studio.dev" />
        <div className="ol-spec-r" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 14, fontWeight: 600 }}>Weekly digest</span><SpecimenSwitch label="Weekly digest" /></div>
      </div></div>
    </>
  ),
  papier: () => (
    <div className="ol-card ol-spec">
      <div className="ol-band"><span className="ol-h3">The evening letter</span><span className="ol-bdg">No. 12</span></div>
      <div className="ol-spec-b">
        <p style={{ fontSize: 14, lineHeight: 1.5 }}>Twelve seats are left. Materials and lunch are included.</p>
        <input className="ol-in" type="text" aria-label="Name for the reservation" placeholder="Your name" />
      </div>
      <div className="ol-spec-f"><a className="ol-link" href="#styles" style={{ fontSize: 16 }}>Read the letter</a><button className="ol-btn sm" type="button">Reserve</button></div>
    </div>
  ),
  organic: () => (
    <div className="ol-card deco ol-spec"><div className="ol-spec-b">
      <span className="ol-h3">Spring workshop</span>
      <p className="ol-mfg" style={{ fontSize: 14, fontWeight: 600 }}>Saturday 14 March, 10:00 to 13:00</p>
      <Progress label="Seats taken" />
      <div className="ol-spec-r" style={{ justifyContent: 'space-between' }}>
        <a className="ol-link" href="#styles" style={{ fontSize: 14 }}>Learn more</a>
        <span className="ol-spec-r">
          <button className="ol-btn sec sm" type="button" aria-label="Add to favourites" style={{ width: 40, padding: 0, borderRadius: '48% 52% 46% 54%/54% 46% 52% 48%' }}><Plus size={16} strokeWidth={2.4} aria-hidden /></button>
          <button className="ol-btn sm" type="button">Reserve</button>
        </span>
      </div>
    </div></div>
  ),
  'retro-futurism': () => (
    <div className="ol-card ol-spec">
      <div className="ol-band sun"><div><span className="ol-h3">Launch window</span><p style={{ fontSize: 13, fontWeight: 600 }}>T minus 4 days</p></div></div>
      <div className="ol-spec-b">
        <Progress label="Fuel loaded" />
        <div className="ol-spec-r"><button className="ol-btn sm" type="button">Ignite</button><button className="ol-btn sec sm" type="button">Hold</button></div>
        <div className="ol-spec-r" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 14, fontWeight: 600 }}>Auto-sequence</span><SpecimenSwitch label="Auto-sequence" /></div>
      </div>
    </div>
  ),
  'liquid-glass': () => (
    <div className="ol-scene"><div className="ol-card ol-spec"><div className="ol-spec-b">
      <span className="ol-h3">Now playing</span>
      <input className="ol-in" type="search" aria-label="Search the queue" placeholder="Search the queue" />
      <div className="ol-spec-r"><button className="ol-btn sm" type="button">Play</button><button className="ol-btn out sm" type="button">Queue</button><SpecimenSwitch label="Shuffle" /></div>
    </div></div></div>
  ),
}

function Tile({ family, index }: { family: StyleFamily; index: number }) {
  const { family: worn, wear, lookStyle, componentCount, families } = useLanding()
  const meta = familyMeta[family]
  const glass = family === 'liquid-glass'
  const lookName = useLookName(family)
  return (
    <article className="ol-tile rv" data-family={family} style={lookStyle(family)} aria-labelledby={`tile-${family}`}>
      <div className="ol-tile-hd">
        <div><h3 className="ol-tile-h" id={`tile-${family}`}>{meta.name}</h3><p className="ol-tile-p">{meta.blurb}</p></div>
        <div className="ol-tile-top"><span>Style {String(index + 1).padStart(2, '0')}</span><span>{glass ? `Stable · ${accessibilityCaveatLabel}` : 'Stable'}</span></div>
      </div>
      {specimens[family](componentCount, families.length)}
      <div className="ol-tile-ft">
        <div><p className="ol-tile-s"><b>Look for:</b> {meta.signature}</p><p className="ol-tile-f" style={{ marginTop: 10 }}>{meta.fonts}</p></div>
        <div>
          <p className="ol-tile-f" style={{ marginBottom: 8 }}>{glass ? 'Preset' : 'Palette'} · {lookName}</p>
          <LookPicker family={family} label={`${meta.name} ${glass ? 'presets' : 'palettes'}`} />
        </div>
      </div>
      <button className="ol-btn sec ol-wear" type="button" aria-pressed={family === worn} onClick={(event) => wear(family, event)}>
        {family === worn ? 'Wearing it now' : 'Wear this style'}
      </button>
    </article>
  )
}

/** One tile per family, each showing what that family does best. */
export function StyleTilesSection() {
  const { families } = useLanding()
  return (
    <section className="ol-sec" id="styles" aria-labelledby="styles-title">
      <div className="ol-wrap">
        <div className="rv">
          <p className="ol-eye">One catalog. {families.length} style families.</p>
          <h2 className="ol-h2" id="styles-title">Try one on. The whole page changes.</h2>
          <p className="ol-lead">Each tile shows what its family does best. Press its buttons, pick one of its palettes, then wear it: this page re-renders in that family, in light or dark.</p>
        </div>
        <div className="ol-tiles">{families.map((family, index) => <Tile family={family} index={index} key={family} />)}</div>
      </div>
    </section>
  )
}
