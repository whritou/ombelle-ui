import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { canonicalize, compile } from '@ombelle/compiler'
import {
  createPresetDraft,
  materializePreset,
  presetGlassReport,
  previewComponentIds,
  setPresetEdit,
} from '../model'
import type { PresetCompilerState } from '../use-preset-compiler'
import { GlassPanel, glassLimitations, glassReadoutId } from './glass-panel'
import { PresetControls } from './preset-controls'
import { PresetExportPanel } from './preset-export-panel'

const noop = () => {}

it('lists every limitation and a passing readout for the built-in glass draft', () => {
  const html = renderToStaticMarkup(
    <GlassPanel report={presetGlassReport(createPresetDraft('liquid-glass'))} />,
  )
  expect(html).toContain(
    '<section aria-labelledby="glass-limitations-heading"><h2 id="glass-limitations-heading">Liquid glass limitations</h2>',
  )
  for (const item of glassLimitations) expect(html).toContain(`<li>${item}</li>`)
  expect(html).toContain(`role="status" id="${glassReadoutId}"`)
  expect(html).toContain('Contrast bound passes at glass opacity 0.87')
})

it('names failing pairs and the minimum opacity when the bound fails', () => {
  const report = presetGlassReport(
    setPresetEdit(createPresetDraft('liquid-glass'), '/design/glassOpacity', '0.6'),
  )!
  const html = renderToStaticMarkup(<GlassPanel report={report} />)
  expect(html).toContain('Contrast bound fails at glass opacity 0.6')
  expect(html).toMatch(/light: mutedForeground on card, \d\.\d\d:1 over a black backdrop/)
  expect(html).toContain(`Minimum passing glass opacity: ${report.minimumOpacity}.`)
})

it('renders transparency, blur and opacity controls only for glass drafts', () => {
  const glass = renderToStaticMarkup(
    <PresetControls draft={createPresetDraft('liquid-glass')} onEdit={noop} onReset={noop} />,
  )
  for (const label of ['Transparency', 'Glass blur', 'Glass opacity'])
    expect(glass).toContain(`>${label}</label>`)
  expect(glass).toContain('0.6 to 1, in steps of 0.01')
  expect(glass).toContain('0 to 24 px')
  const flat = renderToStaticMarkup(
    <PresetControls draft={createPresetDraft('flat')} onEdit={noop} onReset={noop} />,
  )
  expect(flat).not.toContain('Glass opacity')
  expect(flat).not.toContain('>Transparency</label>')
})

it('disables otherwise-ready export and publish with a description while blocked', async () => {
  const draft = createPresetDraft('liquid-glass')
  const state: PresetCompilerState = {
    status: 'compiled',
    result: await compile({
      preset: materializePreset(draft),
      componentIds: previewComponentIds('liquid-glass'),
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    }),
    draftKey: canonicalize(draft),
    diagnostic: null,
    stale: false,
  }
  const render = (blocked: boolean) =>
    renderToStaticMarkup(
      <PresetExportPanel
        draft={draft}
        state={state}
        announce={noop}
        blocked={blocked}
        describedBy={glassReadoutId}
      />,
    )
  const names = ['Download preset JSON', 'Copy export', 'Publish preset…']
  const button = (name: string, disabled: boolean) =>
    new RegExp(
      `<button type="button"${disabled ? ' disabled=""' : ''} aria-describedby="${glassReadoutId}"[^>]*>${name}</button>`,
    )
  const ready = render(false), blocked = render(true)
  for (const name of names) {
    expect(ready).toMatch(button(name, false))
    expect(blocked).toMatch(button(name, true))
  }
})
