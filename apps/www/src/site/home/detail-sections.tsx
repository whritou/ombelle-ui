'use client'

import { useId, useState } from 'react'
import { KitSegmented, KitSwitch } from './kit'
import { useLanding } from './landing-state'
import { familyMeta } from './landing-theme'

const editions = {
  radix: { label: 'Radix UI', importLine: "import * as SwitchPrimitive from '@radix-ui/react-switch'", style: '"style": "radix-nova"' },
  base: { label: 'Base UI', importLine: "import { Switch as SwitchPrimitive } from '@base-ui/react/switch'", style: '"style": "base-nova"' },
} as const
type Edition = keyof typeof editions

/** Radix UI or Base UI under the same styles. */
export function EditionsSection() {
  const id = useId()
  const [edition, setEdition] = useState<Edition>('radix')
  const [checked, setChecked] = useState(true)
  const current = editions[edition]
  return (
    <section className="ol-sec" id="editions" aria-labelledby={`${id}-title`}>
      <div className="ol-wrap ol-split">
        <div className="rv">
          <p className="ol-eye">Two editions</p>
          <h2 className="ol-h2" id={`${id}-title`}>Radix UI or Base UI. Same look.</h2>
          <p className="ol-lead">Each component ships in both editions. Flip the switch: the primitives under the component change, the styles do not.</p>
          <KitSegmented label="Edition" value={edition} options={[{ value: 'radix', label: 'Radix UI' }, { value: 'base', label: 'Base UI' }]} onChange={setEdition} style={{ marginTop: 32, maxWidth: 320 }} />
          <div className="ol-card ol-pad" style={{ marginTop: 24, maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="ol-row" style={{ justifyContent: 'space-between' }}>
              <span id={`${id}-switch`}>Email me updates</span>
              <KitSwitch checked={checked} onChange={setChecked} labelledBy={`${id}-switch`} />
            </div>
            <div className="ol-row"><button className="ol-btn sm" type="button">Save</button><button className="ol-btn out sm" type="button">Cancel</button><span className="ol-bdg">{current.label}</span></div>
          </div>
        </div>
        <div className="ol-card rv">
          <div className="ol-band"><span className="ol-mono" style={{ fontSize: 13 }}>components/ui/switch.tsx</span><span className="ol-bdg">{current.label}</span></div>
          <div className="ol-codeb" aria-live="polite">
            <div className="dim">&apos;use client&apos;</div>
            <div>import * as React from &apos;react&apos;</div>
            <div className="hl ol-in-anim" key={edition}>{current.importLine}</div>
            <div>{"import { cn } from './utils.js'"}</div>
            <div>import &apos;./switch.css&apos;</div>
          </div>
          <div className="ol-band" style={{ borderTop: 'var(--bandb, var(--div))' }}><span className="ol-mono" style={{ fontSize: 13 }}>components.json</span></div>
          <div className="ol-codeb"><div className="hl ol-in-anim" key={edition}>{current.style}</div></div>
          <p className="ol-mfg" style={{ padding: '0 20px 18px', fontSize: 14 }}>The CLI reads the edition from components.json and records it in ui-library.lock.json. Recipes install in the Radix UI edition for now.</p>
        </div>
      </div>
    </section>
  )
}

/** A two-control component editor: the Button, its preview and the recipe it writes. */
export function MiniEditorSection() {
  const { componentCount, design } = useLanding()
  const id = useId()
  // Until the visitor moves the slider, the Button keeps the worn family's own radius.
  const [radius, setRadius] = useState<number | null>(null)
  const [minHeight, setMinHeight] = useState(44)
  const radiusPx = radius ?? design.radiusPx
  const recipe = [
    { text: '{' },
    { text: '  "component": "button",' },
    { text: '  "props": { "size": "default" },' },
    { text: '  "overrides": {' },
    { text: `    "radiusRem": ${Number((radiusPx / 16).toFixed(4))},`, changed: radius !== null },
    { text: `    "minHeightPx": ${minHeight}`, changed: minHeight !== 44 },
    { text: '  }' },
    { text: '}' },
  ]
  return (
    <section className="ol-sec" id="editors" aria-labelledby={`${id}-title`}>
      <div className="ol-wrap">
        <div className="rv">
          <p className="ol-eye">Component editors</p>
          <h2 className="ol-h2" id={`${id}-title`}>{componentCount} components. Each one has an editor.</h2>
          <p className="ol-lead">Change one component without touching the project preset. The result is a scoped recipe that installs next to your existing components. Try it on a Button.</p>
        </div>
        <div className="ol-edit">
          <div className="ol-card ol-step rv">
            <div className="ol-band"><h3 className="ol-h3">Customize</h3><span className="ol-bdg">Button</span></div>
            <div className="ol-step-b">
              <div className="ol-ctl">
                <label htmlFor={`${id}-radius`}>Corner radius</label>
                <output htmlFor={`${id}-radius`}>{Number((radiusPx / 16).toFixed(3))} rem</output>
                <input id={`${id}-radius`} type="range" min={0} max={24} step={1} value={radiusPx} onChange={(event) => setRadius(Number(event.target.value))} />
              </div>
              <div className="ol-ctl">
                <label htmlFor={`${id}-height`}>Minimum height</label>
                <output htmlFor={`${id}-height`}>{minHeight} px</output>
                <input id={`${id}-height`} type="range" min={36} max={64} step={1} value={minHeight} onChange={(event) => setMinHeight(Number(event.target.value))} />
              </div>
              <div className="ol-row" style={{ marginTop: 'auto' }}><a className="ol-link" href="/editor/component">Open the component editors</a></div>
            </div>
          </div>
          <div className="ol-card ol-step rv">
            <div className="ol-band"><h3 className="ol-h3">Preview</h3><span className="ol-bdg">Live</span></div>
            <div className="ol-step-b">
              <div className="ol-stagebox" style={{ flex: 1 }}>
                <button className="ol-btn" type="button" style={{ minHeight, ...(radius === null ? {} : { borderRadius: radius }) }}>Recipe action</button>
              </div>
            </div>
          </div>
          <div className="ol-card ol-step rv">
            <div className="ol-band"><span className="ol-mono" style={{ fontSize: 13 }}>button.recipe.json</span></div>
            <div className="ol-codeb" aria-label="Recipe JSON" style={{ flex: 1 }}>
              {recipe.map((line) => <div key={line.text} className={line.changed ? 'hl' : undefined}>{line.text}</div>)}
            </div>
            <p className="ol-mfg" style={{ padding: '0 20px 18px', fontSize: 14 }}>Get code in the editor publishes the recipe and gives you its install command.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Token layers and override order, lowest first (docs/03). */
const layers = [
  { name: 'Foundation defaults', who: 'Versioned spacing and type', value: '0.5rem' },
  { name: 'Style family', who: '', value: '0.25rem' },
  { name: 'Project preset', who: 'ui-preset.json · light and dark', value: '0.375rem' },
  { name: 'Component defaults', who: 'Button defaults in the preset', value: '0.5rem' },
  { name: 'Scoped recipe', who: 'rc_primary-button', value: '999px' },
  { name: 'Your props and source', who: 'className, local edits', value: '0' },
] as const

export function CascadeSection() {
  const { family } = useLanding()
  const id = useId()
  const [on, setOn] = useState([true, true, true, true, false, false])
  const winner = on.lastIndexOf(true)
  const value = winner < 0 ? 'unset' : layers[winner]!.value
  return (
    <section className="ol-sec" id="cascade" aria-labelledby={`${id}-title`}>
      <div className="ol-wrap ol-split">
        <div className="rv">
          <p className="ol-eye">Token cascade</p>
          <h2 className="ol-h2" id={`${id}-title`}>Six layers. One predictable answer.</h2>
          <p className="ol-lead">Every value resolves in a fixed order. Later layers replace only allow-listed tokens, and unknown keys fail validation. Toggle layers to watch the radius resolve.</p>
          <div className="ol-row" style={{ marginTop: 36, gap: 20 }}>
            <span className="ol-btn lg" aria-hidden="true" style={{ borderRadius: winner < 0 ? 0 : value }}>Resolved button</span>
            <code className="ol-mono ol-mfg" aria-live="polite">--radius: {value}</code>
          </div>
        </div>
        <ol className="ol-layers rv" aria-label="Token layers, lowest first">
          {layers.map((layer, index) => (
            <li key={layer.name}>
              <button className={index === winner ? 'ol-layer win' : 'ol-layer'} type="button" aria-pressed={on[index]} onClick={() => setOn(on.map((active, i) => (i === index ? !active : active)))}>
                <span className="ol-mono">0{index + 1}</span>
                <span><b>{layer.name}</b>{index === 1 ? `${familyMeta[family].name} defaults` : layer.who}</span>
                <i>{layer.value}</i>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
