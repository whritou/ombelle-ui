import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { glassFailingPairLine } from '../../../../../tests/helpers/glass-readout'
import {
  canonicalize,
  compile,
  glassContrastPairs,
  glassContrastReportFor,
} from '@ombelle/compiler'
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
import { publishedInstaller } from '../../snapshots/install-command'

const noop = () => {}

it('lists every limitation and a passing readout for the built-in glass draft', () => {
  const html = renderToStaticMarkup(
    <GlassPanel report={presetGlassReport(createPresetDraft('liquid-glass'))} />,
  )
  expect(html).toContain(
    '<section aria-labelledby="glass-limitations-heading"><h2 id="glass-limitations-heading">Liquid glass limitations</h2>',
  )
  // The limitations sit in a closed Collapsible: its trigger is a collapsed button and its content is not rendered.
  expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>5 known limitations/)
  expect(html).not.toContain('<details')
  for (const item of glassLimitations) expect(html).not.toContain(`<li>${item}</li>`)
  // Every form control is experimental in glass now, so the panel no longer claims they are unavailable.
  expect(glassLimitations).toHaveLength(5)
  expect(html).not.toContain('form controls other than Input')
  // The supported list follows the contracts' support table, so it names every component.
  expect(html).toContain(
    'Liquid glass is experimental. Alert, Accordion, Button, Badge, Avatar, Card, Checkbox, Dialog, Dropdown Menu, Input, Label, Popover, Progress, Native Select, Radio Group, Select, Switch, Separator, Skeleton, Tabs, Table, Textarea, Tooltip, Input Group, Sheet, Alert Dialog, Breadcrumb, Pagination, Toast, Spinner, Kbd, Empty State, Field, Meter, Stepper, Slider, Toggle Group, Chip, Tag Input, Input OTP, Combobox, Command, Hover Card, Context Menu, Calendar, Toggle, Collapsible, Scroll Area, Button Group, Item, Number Input and Color Picker support it.',
  )
  // No component is unavailable in glass any more, so the panel names none.
  expect(html).not.toContain('unavailable')
  expect(html).toContain(`role="status" id="${glassReadoutId}"`)
  expect(html).toContain('Contrast bound passes at glass opacity 0.57:')
})

it('names failing pairs and the minimum opacity when the bound fails', () => {
  const report = presetGlassReport(
    setPresetEdit(createPresetDraft('liquid-glass'), '/design/glassOpacity', '0.3'),
  )!
  const html = renderToStaticMarkup(<GlassPanel report={report} />)
  expect(html).toContain('Contrast bound fails at glass opacity 0.3')
  // Pairs painted at part of the glass opacity name their coverage.
  expect(html).toMatch(/light: mutedForeground on background at 55% coverage, \d\.\d\d:1 over the darkest filtered backdrop/)
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
      'You can still export or publish this preset.',
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
    'Shine',
    'Refraction',
    'Refraction width',
    'Pointer halo',
    'Relief',
    'Motion',
    'Dispersion',
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

it('keeps exports available for a compiled draft with a contrast warning', async () => {
  const draft = setPresetEdit(createPresetDraft('liquid-glass'), '/design/glassOpacity', '0.3')
  expect(presetGlassReport(draft)?.passes).toBe(false)
  const state: PresetCompilerState = {
    status: 'compiled',
    result: await compile({
      preset: materializePreset(draft),
      componentIds: previewComponentIds('liquid-glass'),
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      glassContrast: 'report',
    }),
    draftKey: canonicalize(draft),
    diagnostic: null,
    stale: false,
  }
  const html = renderToStaticMarkup(
    <PresetExportPanel draft={draft} state={state} announce={noop} contrastWarning describedBy={glassReadoutId} />,
  )
  for (const name of ['Download preset JSON', 'Copy export'])
    expect(html).toContain(`<button type="button" aria-describedby="${glassReadoutId}">${name}</button>`)
  expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>Dependencies/)
  expect(html).not.toContain('<details')
  expect(html).toContain(`npx ${publishedInstaller.packageName}@${publishedInstaller.version} init --preset ./project-preset.json`)
})

it('lists the tint in a failing tinted pair', () => {
  // The tinted foreground-on-card pair still passes at the draft minimum of
  // 0.25 (4.61:1), so the report is built at 0.1, below what the editor offers.
  const preset = materializePreset(createPresetDraft('liquid-glass'))
  preset.design = { ...preset.design, glassOpacity: 0.1 }
  const report = glassContrastReportFor(preset, glassContrastPairs)
  const html = renderToStaticMarkup(<GlassPanel report={report} />)
  expect(html).toMatch(
    /light: foreground on card \+ primary 18%, \d\.\d\d:1 over the darkest filtered backdrop/,
  )
  // The Button pairs share surface and text; each is listed with its own tint.
  for (const tint of ['primary 26%', 'destructive 16%', 'destructive 24%'])
    expect(html).toContain('light: foreground on card + ' + tint)
  // Every listed line, tinted, covered or both, matches the pattern the e2e readout check uses.
  const list = /aria-label="Failing contrast pairs">(.*?)<\/ul>/.exec(html)![1]
  const lines = [...list.matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1].replace(/<!-- -->/g, ''))
  expect(lines.some((line) => line.includes(' + foreground 6% at 60% coverage, '))).toBe(true)
  expect(lines.some((line) => line.includes(' at 55% coverage, '))).toBe(true)
  expect(lines.some((line) => !line.includes(' + ') && !line.includes(' coverage, '))).toBe(true)
  for (const line of lines) expect(line).toMatch(glassFailingPairLine)
})
