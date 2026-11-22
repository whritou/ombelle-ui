'use client'

import { useId, useState } from 'react'
import { KitSegmented, LookPicker, useLookName } from './kit'
import { useCopyLabel, useLanding } from './landing-state'
import { familyMeta } from './landing-theme'

const managers = [{ value: 'npm', label: 'npm' }, { value: 'pnpm', label: 'pnpm' }, { value: 'yarn', label: 'yarn' }, { value: 'bun', label: 'bun' }] as const
type Manager = (typeof managers)[number]['value']

/**
 * What the installer plans for each way in. `PRESET` stands for the visitor's own
 * published code, so every command here runs once it is replaced. Output is abbreviated from the CLI's plan: a status
 * line, one `action path` row per file (create, update or noop; the paths depend on your project), then the prompt.
 */
const scenarios = [
  {
    id: 'init', label: 'New project', command: 'init --preset PRESET',
    blurb: 'Detect the project, resolve the preset and plan config and CSS. Nothing is written until you accept the plan.',
    output: ['init: planned', 'create ui-library.config.json', 'create ui-preset.json', 'create ui-library.lock.json', 'update app/globals.css', 'Apply these changes? [y/N]'],
  },
  {
    id: 'theme', label: 'Existing shadcn', command: 'theme add PRESET',
    blurb: 'Already ran shadcn init? Merge the palette and tokens into your global stylesheet without reinstalling components.',
    output: ['theme add: planned', 'update app/globals.css', 'create ui-preset.json', 'create ui-library.lock.json', 'Apply these changes? [y/N]'],
  },
  {
    id: 'one', label: 'One button', command: 'add button --preset PRESET',
    blurb: 'Scope the preset to a single Button. Project defaults and other components stay untouched.',
    output: ['add: planned', 'create components/ui/presets/…/button.tsx', 'create components/ui/presets/…/button.css', 'create ombelle-examples/presets/…/r1.tsx', 'Apply these changes? [y/N]'],
  },
  {
    id: 'add', label: 'Then add components', command: 'add button',
    blurb: 'Components use the saved project preset, so no code is needed again. Add several at once, for example button dialog input. If shadcn already installed that component, the plan stops on its file: add --beside components/ui/button.tsx installs Ombelle next to it.',
    output: ['add: planned', 'create components/ui/button.tsx', 'create components/ui/button.css', 'Apply these changes? [y/N]'],
  },
] as const
type ScenarioId = (typeof scenarios)[number]['id']

const sliders = [
  { key: 'radiusPx', label: 'Corner radius', max: 24, step: 1 },
  { key: 'borderPx', label: 'Border width', max: 4, step: 0.5 },
  { key: 'shadowPx', label: 'Shadow offset', max: 8, step: 1 },
] as const

/** Design, publish, install: the one flow that takes a design into a project. */
export function JourneySection() {
  const { family, design, setTweak, resetDesign, code, runners, cliVersion } = useLanding()
  const meta = familyMeta[family]
  const lookName = useLookName(family)
  const id = useId()
  const [manager, setManager] = useState<Manager>('npm')
  const [scenario, setScenario] = useState<ScenarioId>('init')
  const copyCode = useCopyLabel('Copy example')
  const copyCommand = useCopyLabel()
  const current = scenarios.find((item) => item.id === scenario)!
  const command = `${runners[manager]} ${current.command}`
  const values = { radiusPx: design.radiusPx, borderPx: design.borderWidthPx, shadowPx: design.shadowPx }
  const readout = { radiusPx: `${Number((design.radiusPx / 16).toFixed(3))} rem`, borderPx: `${design.borderWidthPx} px`, shadowPx: `${design.shadowPx} px` }

  return (
    <section className="ol-sec" id="get-started" aria-labelledby={`${id}-title`}>
      <div className="ol-wrap">
        <div className="rv">
          <p className="ol-eye">From design to install</p>
          <h2 className="ol-h2" id={`${id}-title`}>Design it. Publish it. Install the code.</h2>
          <p className="ol-lead">One preset code carries your whole design into a project. Shape it in step 1, publish it in the preset editor, and install it with a single command.</p>
        </div>
        <div className="ol-flow">
          <article className="ol-card ol-step rv" aria-labelledby={`${id}-design`}>
            <div className="ol-band sun"><h3 className="ol-h3" id={`${id}-design`}><span className="ol-step-n">01</span>Design</h3><span className="ol-bdg">{meta.name}</span></div>
            <div className="ol-step-b">
              <div>
                <p className="ol-lb" style={{ marginBottom: 10 }}>{family === 'liquid-glass' ? 'Preset' : 'Palette'} · {lookName}</p>
                <LookPicker family={family} label={family === 'liquid-glass' ? 'Preset' : 'Palette'} />
              </div>
              {sliders.map((slider) => (
                <div className="ol-ctl" key={slider.key}>
                  <label htmlFor={`${id}-${slider.key}`}>{slider.label}</label>
                  <output htmlFor={`${id}-${slider.key}`}>{readout[slider.key]}</output>
                  <input id={`${id}-${slider.key}`} type="range" min={0} max={slider.max} step={slider.step} value={values[slider.key]} onChange={(event) => setTweak(slider.key, Number(event.target.value))} />
                </div>
              ))}
              <div className="ol-row" style={{ marginTop: 'auto' }}>
                <button className="ol-btn out sm" type="button" onClick={resetDesign}>Reset to {meta.name} defaults</button>
              </div>
            </div>
          </article>

          <article className="ol-card ol-step rv" aria-labelledby={`${id}-publish`}>
            <div className="ol-band"><h3 className="ol-h3" id={`${id}-publish`}><span className="ol-step-n">02</span>Publish</h3><span className="ol-bdg">Example code</span></div>
            <div className="ol-step-b">
              <p>Publishing gives your preset a code like this one. The same design always gets the same code, so change step 1 and it changes.</p>
              <p className="ol-pcode-v ol-in-anim" key={code} aria-live="polite">{code}</p>
              <p className="ol-mfg" style={{ fontSize: 15 }}>This code is only an example and does not install. Publish your design in the preset editor to get a real one. There are no accounts, and drafts stay in your browser until you publish.</p>
              <div className="ol-row" style={{ marginTop: 'auto' }}>
                <a className="ol-btn" href="/editor/preset">Open the preset editor</a>
                <button className="ol-btn gh" type="button" onClick={() => copyCode.copy(code)}>{copyCode.label}</button>
              </div>
            </div>
          </article>

          <article className="ol-card ol-step wide rv" aria-labelledby={`${id}-install`}>
            <div className="ol-band"><h3 className="ol-h3" id={`${id}-install`}><span className="ol-step-n">03</span>Install</h3><span className="ol-bdg">CLI {cliVersion}</span></div>
            <div className="ol-inst">
              <div>
                <p>Run it from your app folder, with <code className="ol-mono">PRESET</code> replaced by your preset code (such as <code className="ol-mono">ps_…@1</code>). The installer shows every file and dependency change and asks before writing anything. Dependency installs run with lifecycle scripts disabled.</p>
                <KitSegmented label="Package runner" value={manager} options={managers} onChange={setManager} mono />
                <p className="ol-mfg" style={{ fontSize: 14 }}>You need Node 24.19.0 or newer Node 24 and a Vite React TSX or Next.js App Router TSX app with Tailwind v4. React Native is not supported.</p>
                <p><a className="ol-link" href="/docs/getting-started">Follow the step-by-step installation guide</a></p>
              </div>
              {/* The key restarts the typing animation when the command changes. */}
              <div className="ol-term ta" key={`${manager}-${scenario}`}>
                <div className="ol-term-top" role="group" aria-label="What to install">
                  {scenarios.map((item) => <button type="button" key={item.id} aria-pressed={item.id === scenario} onClick={() => setScenario(item.id)}>{item.label}</button>)}
                </div>
                <div className="ol-term-b">
                  <p>{current.blurb}</p>
                  <div className="ol-term-cmd">
                    <span aria-hidden="true">$</span>
                    <code>{command}<i className="ol-caret" aria-hidden="true" /></code>
                    <button className="ol-term-copy" type="button" onClick={() => copyCommand.copy(command)}>{copyCommand.label}</button>
                  </div>
                  <ul className="ol-term-out" aria-label="Example output">
                    {current.output.map((line) => <li key={line} className={line.startsWith('create') || line.startsWith('update') ? 'hi' : undefined}>{line}</li>)}
                  </ul>
                  <p style={{ marginTop: 18, fontSize: 13 }}>Abbreviated output; your paths and files differ. Add --json for the machine-readable plan, then run again with --yes to apply it.</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
