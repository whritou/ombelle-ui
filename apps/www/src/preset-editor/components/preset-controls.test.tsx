import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createPresetDraft, setPresetEdit } from '../model'
import { styleFamilies } from '@ombelle/contracts'
import { DesignControls, FamilyPicker, TokenList } from './preset-controls'
import { offeredStyleFamilies, ombelleMinimumCli, publishedInstaller } from '../../snapshots/install-command'

const noop = () => {}
const handlers = { onEdit: noop, onReset: noop }

it('FamilyPicker marks only the current family pressed and tags liquid glass as Beta', () => {
  const html = renderToStaticMarkup(<FamilyPicker value="minimalist" onChange={noop} families={styleFamilies} />)
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
  expect(html).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>).)*Minimalist/)
  expect(html.match(/aria-pressed="false"/g)).toHaveLength(4)
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
  expect(families(gated)).toEqual(['flat', 'minimalist', 'neo-brutalism', 'liquid-glass'])
  const offered = renderToStaticMarkup(
    <FamilyPicker value="flat" onChange={noop} families={offeredStyleFamilies('flat', { version: ombelleMinimumCli })} />,
  )
  expect(families(offered)).toEqual(['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'liquid-glass'])
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
  expect(html).toContain('role="group" aria-label="Density"')
  expect(html).toContain('>Comfortable</button>')
  expect(html).toContain('>Compact</button>')
  expect(html).toContain('aria-label="Font family"')
  expect(html).toContain('>Mono</button>')
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
  expect(depth).toContain('Shadow offset')
  expect(depth).toContain('aria-label="Motion"')
  expect(depth).toContain('aria-label="Transparency"')
  expect(depth).toContain('Glass blur')
  expect(depth).not.toContain('Corner radius')
})
