import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { supportedComponentIds } from '@ombelle/contracts'
import { blockManifest, getCatalog } from '@ombelle/catalog'
import { compile } from '../src/index.js'

const catalog = getCatalog('0.1.0')
const run = (edition: 'radix' | 'base', blockIds: readonly ('login-01' | 'settings-01' | 'pricing-01' | 'dashboard-01')[] = ['login-01']) =>
  compile({
    preset: catalog.presets.ombelle,
    componentIds: [],
    blockIds,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    edition,
  })
const source = (result: Awaited<ReturnType<typeof run>>, path: string) =>
  result.artifacts.find((artifact) => artifact.logicalPath === path)!

/**
 * Counts the headings a block writes, by level. A bare `<CardTitle` (no level) is an h3, because
 * CardTitle defaults to level 3. Dialog titles are not counted: they head their own dialog.
 */
const headingLevels = (content: string) => {
  const count = (pattern: RegExp) => (content.match(pattern) ?? []).length
  const levels: Record<number, number> = {}
  for (let level = 1; level <= 6; level += 1) {
    levels[level] =
      count(new RegExp(String.raw`<h${level}\b`, 'g')) +
      count(new RegExp(String.raw`<CardTitle\b[^>]*\blevel=\{${level}\}`, 'g'))
  }
  levels[3] += count(/<CardTitle(?![^>]*\blevel=)[\s>]/g)
  return levels
}

/** The block heading policy: one h2, no h1, h3 only for section titles, nothing deeper, no value as a heading. */
const expectHeadingPolicy = (content: string, sectionTitles: number) => {
  const levels = headingLevels(content)
  expect(levels[1]).toBe(0)
  expect(levels[2]).toBe(1)
  expect(levels[3]).toBe(sectionTitles)
  expect(levels[4] + levels[5] + levels[6]).toBe(0)
  expect(content).not.toMatch(/<(CardTitle|h[1-6])\b[^>]*>\s*\{[^}]*\bvalue\}/)
}

describe('block artifacts', () => {
  it('emits the block files and every component the block imports', async () => {
    const result = await run('radix')
    const paths = result.artifacts.map((artifact) => artifact.logicalPath)
    expect(source(result, 'blocks/login-01.tsx').kind).toBe('block')
    expect(source(result, 'blocks/login-01.css').kind).toBe('block')
    for (const id of blockManifest['login-01'].components) {
      expect(paths).toContain(`components/ui/${id}.tsx`)
      expect(paths).toContain(`examples/${id}.tsx`)
    }
    expect(source(result, 'blocks/login-01.tsx').content).toContain("'./login-01.css'")
  })

  it('is deterministic', async () => {
    const hashes = async () => (await run('radix')).artifacts.map((artifact) => artifact.sha256)
    expect(await hashes()).toEqual(await hashes())
  })

  it.each(['radix', 'base'] as const)('keeps the %s source example-only and landmark-correct', async (edition) => {
    const content = source(await run(edition), 'blocks/login-01.tsx').content
    if (edition === 'base') expect(content).not.toContain('asChild')
    // The heading is the Card title rendered as an h2; no other heading is written.
    expectHeadingPolicy(content, 0)
    expect(content).toContain('showExampleNotice')
    expect(content).toContain("Example only: this form doesn't sign anyone in")
    expect(content).not.toContain('fetch(')
    expect(content).not.toContain('Acme')
  })

  it.each(['radix', 'base'] as const)('compiles the %s settings-01 block', async (edition) => {
    const result = await run(edition, ['settings-01'])
    const paths = result.artifacts.map((artifact) => artifact.logicalPath)
    expect(source(result, 'blocks/settings-01.tsx').kind).toBe('block')
    expect(source(result, 'blocks/settings-01.css').kind).toBe('block')
    for (const id of blockManifest['settings-01'].components) expect(paths).toContain(`components/ui/${id}.tsx`)
    const content = source(result, 'blocks/settings-01.tsx').content
    expect(content).toContain("'./settings-01.css'")
    if (edition === 'base') expect(content).not.toContain('asChild')
    else expect(content).toContain('asChild')
    expect(content).toContain('export function Settings01')
    expect(content).toContain('<Tabs')
    expect(content).toContain('<AlertDialog')
    // The Card title is the h2; the three panel titles are h3 section titles.
    expectHeadingPolicy(content, 3)
    expect(content.match(/<h3 data-block-part="panel-title">/g) ?? []).toHaveLength(3)
    expect(content).toContain('showExampleNotice')
    expect(content).toContain('Example only: nothing was saved')
    expect(content).toContain('Example only: no account was deleted')
    expect(content).not.toContain('fetch(')
    expect(content).not.toContain('Acme')
  })

  it('never sets display on a settings-01 panel outside a visible-only selector or the phone query', () => {
    const css = catalog.blockStyles['settings-01']!
    const desktop = css.split('@media (max-width: 767.98px)')[0]
    const rules = [...desktop.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    for (const [, selector, body] of rules) {
      if (!selector.includes('[data-block-part="panel"]') || !/(^|;|\s)display\s*:/.test(body)) continue
      expect(selector).toContain(':not([hidden]):not([data-state="inactive"])')
    }
  })

  it.each(['radix', 'base'] as const)('compiles the %s pricing-01 block', async (edition) => {
    const result = await run(edition, ['pricing-01'])
    const paths = result.artifacts.map((artifact) => artifact.logicalPath)
    expect(source(result, 'blocks/pricing-01.tsx').kind).toBe('block')
    expect(source(result, 'blocks/pricing-01.css').kind).toBe('block')
    for (const id of blockManifest['pricing-01'].components) expect(paths).toContain(`components/ui/${id}.tsx`)
    const content = source(result, 'blocks/pricing-01.tsx').content
    expect(content).toContain("'./pricing-01.css'")
    if (edition === 'base') expect(content).not.toContain('asChild')
    expect(content).toContain('export function Pricing01')
    expect(content).toContain('<ToggleGroup')
    expect(content).toContain('Monthly')
    expect(content).toContain('Yearly')
    expect(content).toContain('aria-label=')
    // Three plan cards are rendered from exampleData.plans, exactly one of them highlighted.
    expect(content).toContain('exampleData.plans.map')
    expect(content.match(/highlighted: (true|false)/g) ?? []).toHaveLength(3)
    expect(content.match(/highlighted: true/g) ?? []).toHaveLength(1)
    expect(content).toContain('Recommended')
    expect(content).toContain('<Badge')
    expect(content).toContain('exampleData')
    expect(content).toContain('Example prices')
    expect(content).toContain('showExampleNotice')
    expect(content).toContain('Example only:')
    // The plan name (one CardTitle in the plans map) is the only h3.
    expectHeadingPolicy(content, 1)
    expect(content).not.toContain('fetch(')
    expect(content).not.toContain('Acme')
  })

  it.each(['radix', 'base'] as const)('compiles the %s dashboard-01 block', async (edition) => {
    const result = await run(edition, ['dashboard-01'])
    const paths = result.artifacts.map((artifact) => artifact.logicalPath)
    expect(source(result, 'blocks/dashboard-01.tsx').kind).toBe('block')
    expect(source(result, 'blocks/dashboard-01.css').kind).toBe('block')
    for (const id of blockManifest['dashboard-01'].components) expect(paths).toContain(`components/ui/${id}.tsx`)
    const content = source(result, 'blocks/dashboard-01.tsx').content
    expect(content).toContain("'./dashboard-01.css'")
    if (edition === 'base') expect(content).not.toContain('asChild')
    else expect(content).toContain('asChild')
    expect(content).toContain('export function Dashboard01')
    expect(content).not.toContain('Sidebar')
    expect(content).toContain('<Meter')
    expect(content).toContain('<Progress')
    expect(content).toContain('<Table')
    expect(content).toContain('<Badge')
    expect(content).toContain('>7 days<')
    expect(content).toContain('>30 days<')
    expect(content).toContain('<DropdownMenu')
    expect(content).toContain('<DropdownMenuItem')
    expect(content).toContain('aria-label=')
    expect(content).toContain('exampleData')
    expect(content).toContain('showExampleNotice')
    expect(content).toContain('Example only:')
    // "Recent activity" is the only h3; stat values are styled text, never headings.
    expectHeadingPolicy(content, 1)
    expect(content).toContain('<p data-block-part="stat-value">{stat.value}</p>')
    expect(content).not.toContain('fetch(')
    expect(content).not.toContain('Acme')
  })

  it('never sets display on a dashboard-01 panel outside a visible-only selector', () => {
    const css = catalog.blockStyles['dashboard-01']!
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (!selector.includes('[data-block-part="panel"]') || !/(^|;|\s)display\s*:/.test(body)) continue
      expect(selector).toContain(':not([hidden]):not([data-state="inactive"])')
    }
  })

  it.each(['radix', 'base'] as const)('keeps %s pricing-01 and dashboard-01 toast regions and styles clean', async (edition) => {
    for (const id of ['pricing-01', 'dashboard-01'] as const) {
      const result = await run(edition, [id])
      expect(source(result, `blocks/${id}.tsx`).content).toContain('<ToastViewport')
      const css = source(result, `blocks/${id}.css`).content
      expect(css).not.toContain('data-slot')
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/)
    }
  })

  it('starts the dashboard-01 and pricing-01 desktop layout at 768px', () => {
    for (const id of ['pricing-01', 'dashboard-01'] as const) {
      const widths = [...catalog.blockStyles[id]!.matchAll(/min-width:\s*(\d+)px/g)].map((m) => Number(m[1]))
      expect(Math.min(...widths)).toBe(768)
    }
  })

  it('leaves output without blockIds byte-identical', async () => {
    const result = await compile({
      preset: catalog.presets.ombelle,
      componentIds: supportedComponentIds,
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      edition: 'radix',
    })
    const expected = JSON.parse(
      readFileSync(new URL('./fixtures/no-block-hashes.json', import.meta.url), 'utf8'),
    ) as [string, string][]
    expect(result.artifacts.map((artifact) => [artifact.logicalPath, artifact.sha256])).toEqual(expected)
  }, 120000)
})
