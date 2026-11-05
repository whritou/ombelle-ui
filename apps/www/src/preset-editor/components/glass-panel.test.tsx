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
import { GlassPanel, glassLimitations, glassPairsId, glassReadoutId } from './glass-panel'
import { DesignControls } from './preset-controls'
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
  // The supported list follows the contracts' support table, so it names every glass component.
  expect(html).toContain(
    'Liquid glass is experimental. Alert, Button, Badge, Card, Dialog, Dropdown Menu, Input, Popover, Tabs and Tooltip support it; the other components are unavailable.',
  )
  expect(html).toContain(`role="status" id="${glassReadoutId}"`)
  expect(html).toContain('Contrast bound passes at glass opacity 0.5')
})

it('names failing pairs and the minimum opacity when the bound fails', () => {
  const report = presetGlassReport(
    setPresetEdit(createPresetDraft('liquid-glass'), '/design/glassOpacity', '0.3'),
  )!
  const html = renderToStaticMarkup(<GlassPanel report={report} />)
  expect(html).toContain('Contrast bound fails at glass opacity 0.3')
  expect(html).toMatch(/light: mutedForeground on card, \d\.\d\d:1 over the darkest filtered backdrop/)
  expect(html).toContain(`Minimum passing glass opacity: ${report.minimumOpacity}.`)
})

it('announces a one-line summary and keeps the pair list outside the live region', () => {
  const report = presetGlassReport(
    setPresetEdit(createPresetDraft('liquid-glass'), '/design/glassOpacity', '0.3'),
  )!
  const failing = report.pairs.filter((pair) => !pair.passes).length
  const html = renderToStaticMarkup(<GlassPanel report={report} />)
  const live = new RegExp(`<p role="status" id="${glassReadoutId}" data-status="fail">([^<]*)</p>`).exec(html)
  expect(live?.[1]).toBe(
    `Contrast bound fails at glass opacity 0.3: ${failing} pairs are below 4.5:1. ` +
      `Minimum passing glass opacity: ${report.minimumOpacity}. ` +
      'The preview shows your settings; Get code and export stay disabled until every pair passes.',
  )
  expect(html).toContain(`<ul id="${glassPairsId}" aria-label="Failing contrast pairs">`)
  expect(html.match(/<li>light: |<li>dark: /g)).toHaveLength(failing)
  expect(html.match(/role="status"/g)).toHaveLength(1)
})

it('renders the glass material controls only for glass drafts', () => {
  const glass = renderToStaticMarkup(
    <DesignControls draft={createPresetDraft('liquid-glass')} onEdit={noop} onReset={noop} />,
  )
  for (const label of [
    'Transparency',
    'Glass blur',
    'Glass opacity',
    'Glass saturation',
    'Backdrop contrast',
    'Backdrop tone',
    'Specular sheen',
    'Rim light',
  ])
    expect(glass).toContain(`>${label}</label>`)
  expect(glass).toContain('0.25 to 1, in steps of 0.01')
  expect(glass).toContain('0 to 40 px')
  const flat = renderToStaticMarkup(
    <DesignControls draft={createPresetDraft('flat')} onEdit={noop} onReset={noop} />,
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
  const names = ['Download preset JSON', 'Copy export']
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
