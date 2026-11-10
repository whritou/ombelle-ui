import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createPresetDraft, glassControlHints, planPresetFamilyChange, presetFieldValue, setPresetEdit } from '../model'
import { styleFamilies } from '@ombelle/contracts'
import { DesignControls, FamilyPicker, TokenList } from './preset-controls'
import { offeredStyleFamilies, ombelleMinimumCli, publishedInstaller } from '../../snapshots/install-command'

const noop = () => {}
const handlers = { onEdit: noop, onReset: noop }

it('FamilyPicker marks only the current family pressed and tags liquid glass as Beta', () => {
  const html = renderToStaticMarkup(<FamilyPicker value="minimalist" onChange={noop} families={styleFamilies} />)
  expect(html.match(/aria-checked="true"/g)).toHaveLength(1)
  expect(html).toMatch(/aria-checked="true"[^>]*>(?:(?!<\/button>).)*Minimalist/)
  expect(html.match(/aria-checked="false"/g)).toHaveLength(4)
  for (const name of ['Flat', 'Neo-brutalism', 'Ombelle', 'Liquid glass']) expect(html).toContain(name)
  expect(html.match(/>Beta</g)).toHaveLength(1)
  expect(html).toMatch(/data-family="liquid-glass"(?:(?!<\/button>).)*>Beta</)
  expect(html).toMatch(/data-family="ombelle"(?:(?!<\/button>).)*Ombelle/)
  expect(html).not.toMatch(/data-family="ombelle"(?:(?!<\/button>).)*>Beta</)
})

it('FamilyPicker offers ombelle only once the published installer supports it', () => {
  const families = (html: string) => [...html.matchAll(/data-family="([^"]+)"/g)].map((match) => match[1])
  const gated = renderToStaticMarkup(
    <FamilyPicker value="flat" onChange={noop} families={offeredStyleFamilies('flat', { version: '0.3.0' })} />,
  )
  expect(families(gated)).toEqual(['minimalist', 'neo-brutalism', 'flat', 'liquid-glass'])
  const offered = renderToStaticMarkup(
    <FamilyPicker value="flat" onChange={noop} families={offeredStyleFamilies('flat', { version: ombelleMinimumCli })} />,
  )
  expect(families(offered)).toEqual(['ombelle', 'minimalist', 'neo-brutalism', 'flat', 'liquid-glass'])
  // The default follows the website's published installer.
  const defaults = renderToStaticMarkup(<FamilyPicker value="flat" onChange={noop} />)
  expect(families(defaults)).toEqual([...offeredStyleFamilies('flat', publishedInstaller)])
})

it('TokenList shows five core tokens and a toggle for the rest', () => {
  const html = renderToStaticMarkup(
    <TokenList draft={createPresetDraft('flat')} {...handlers} warnings={new Set()} />,
  )
  expect(html.match(/class="preset-color-row"/g)).toHaveLength(5)
  for (const name of ['Background', 'Foreground', 'Primary', 'Muted foreground', 'Border'])
    expect(html).toContain(`aria-label="${name} colors:`)
  expect(html).toContain('>Show all 19 tokens</button>')
  expect(html).not.toContain('data-warning')
})

it('TokenList adds edited and warned tokens and flags warnings', () => {
  const draft = setPresetEdit(createPresetDraft('flat'), '/modes/dark/card', '#101010')
  const html = renderToStaticMarkup(
    <TokenList draft={draft} {...handlers} warnings={new Set(['mutedForeground', 'ring'])} />,
  )
  expect(html.match(/class="preset-color-row"/g)).toHaveLength(7)
  expect(html).toContain('aria-label="Card colors:')
  expect(html).toContain('aria-label="Ring colors:')
  expect(html).toMatch(/aria-label="Muted foreground colors:[^"]*contrast warning"[^>]*data-warning="true"/)
  expect(html.match(/data-warning/g)).toHaveLength(2)
})

it('DesignControls renders density as a labelled segmented group', () => {
  const html = renderToStaticMarkup(
    <DesignControls draft={createPresetDraft('flat')} {...handlers} />,
  )
  expect(html).toMatch(/role="radiogroup"[^>]*aria-label="Density"|aria-label="Density"[^>]*role="radiogroup"/)
  expect(html).toMatch(/>Comfortable<\/button>/)
  expect(html).toMatch(/>Compact<\/button>/)
  expect(html).toContain('aria-label="Font family"')
  expect(html).toMatch(/>Mono<\/button>/)
  expect(html).toContain('aria-label="Shadow offset"')
  expect(html).toContain('aria-label="Corner radius slider"')
})

it('DesignControls splits shape from depth by section', () => {
  const draft = createPresetDraft('liquid-glass')
  const shape = renderToStaticMarkup(<DesignControls draft={draft} {...handlers} section="shape" />)
  const depth = renderToStaticMarkup(<DesignControls draft={draft} {...handlers} section="depth" />)
  expect(shape).toContain('Corner radius')
  expect(shape).not.toContain('Shadow')
  expect(shape).not.toContain('Glass blur')
  expect(depth).toContain('aria-label="Glass shadow offset"')
  expect(depth).toContain('aria-label="Motion"')
  expect(depth).toContain('aria-label="Transparency"')
  expect(depth).toContain('Glass blur')
  expect(depth).not.toContain('Corner radius')
})

it('glass drafts relabel the repurposed controls', () => {
  const render = (family: 'flat' | 'liquid-glass') => {
    const draft = createPresetDraft(family)
    // Strip tags so labels split across screen-reader-only spans read as one string.
    return (
      renderToStaticMarkup(<DesignControls draft={draft} {...handlers} />) +
      renderToStaticMarkup(<TokenList draft={draft} {...handlers} warnings={new Set()} />)
    ).replace(/<[^>]+>/g, '')
  }
  const glass = render('liquid-glass')
  for (const label of ['Glass shadow X', 'Glass shadow Y', 'Glass edge width', 'Glass edge colour'])
    expect(glass).toContain(label)
  for (const hint of Object.values(glassControlHints)) expect(glass).toContain(hint)
  expect(glass).not.toContain('Border width')
  expect(glass).not.toContain('Border')
  const flat = render('flat')
  const tokens = (family: 'flat' | 'liquid-glass') =>
    renderToStaticMarkup(<TokenList draft={createPresetDraft(family)} {...handlers} warnings={new Set()} />)
  expect(tokens('liquid-glass')).toContain('aria-label="Glass edge colour: light')
  expect(tokens('flat')).toContain('aria-label="Border colors: light')
  expect(tokens('liquid-glass')).toContain('aria-label="Reset light glass edge colour"')
  expect(tokens('flat')).toContain('aria-label="Reset light border"')
  expect(flat).toContain('Shadow X offset')
  expect(flat).toContain('Border width')
  expect(flat).not.toContain('Glass shadow')
  expect(flat).not.toContain('Glass edge')
  for (const hint of Object.values(glassControlHints)) expect(flat).not.toContain(hint)
})

it('repurposed values survive a family round trip', () => {
  const glass = setPresetEdit(createPresetDraft('liquid-glass'), '/design/shadowOffsetYPx', '20')
  const flat = planPresetFamilyChange(glass, 'flat').draft
  expect(presetFieldValue(flat, '/design/shadowOffsetYPx')).toBe('20')
  expect(renderToStaticMarkup(<DesignControls draft={flat} {...handlers} />).replace(/<[^>]+>/g, '')).toContain('Shadow Y offset')
  const back = planPresetFamilyChange(flat, 'liquid-glass').draft
  expect(presetFieldValue(back, '/design/shadowOffsetYPx')).toBe('20')
  const html = renderToStaticMarkup(<DesignControls draft={back} {...handlers} />)
  expect(html.replace(/<[^>]+>/g, '')).toContain('Glass shadow Y')
  expect(html).toContain('value="20"')
})
