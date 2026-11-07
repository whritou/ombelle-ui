import { it, expect } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { compile, prefixSharedRules, prefixSlots, templateSlots } from '../src/index.js'

it('prefixes listed data-slot literals in component source', () => {
  const source = `<b data-slot="button" /><i data-slot='button-spinner' /><u data-slot="input" />`
  expect(prefixSlots(source, 'tsx', ['button', 'button-spinner'])).toBe(
    `<b data-slot="ombelle-button" /><i data-slot='ombelle-button-spinner' /><u data-slot="input" />`,
  )
})

it('prefixes listed slot selectors in CSS only', () => {
  const css = `[data-slot='button']:hover,[data-slot="input"]{color:red}[data-slot="button-group"]{}`
  expect(prefixSlots(css, 'css', ['button'])).toBe(
    `[data-slot='ombelle-button']:hover,[data-slot="input"]{color:red}[data-slot="button-group"]{}`,
  )
})

it('lists the literal slots a template emits', () => {
  expect(templateSlots(`<b data-slot="button" /><i data-slot='button-spinner' />`)).toEqual(['button', 'button-spinner'])
})

it('moves shared rules for beside slots to the prefixed slots only', () => {
  const css = `[data-slot="button"],[data-slot="input"]{color:red}@media (hover:hover){[data-slot="button"]:hover{color:blue}}[data-slot="input"]{color:green}`
  const out = prefixSharedRules(css, ['button'])
  expect(out).toBe(
    `[data-slot="ombelle-button"],[data-slot="input"]{color:red}@media (hover:hover){[data-slot="ombelle-button"]:hover{color:blue}}[data-slot="input"]{color:green}`,
  )
  expect(prefixSharedRules(css, ['button'])).toBe(out)
  expect(prefixSharedRules(css, [])).toBe(css)
})

const run = (prefixedComponents?: ('button' | 'select')[]) =>
  compile({
    preset: getCatalog('0.1.0').presets.flat,
    componentIds: ['button', 'select'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    ...(prefixedComponents ? { prefixedComponents } : {}),
  })

it('compiles beside components with prefixed slots and moves their shared rules', async () => {
  const plain = await run(),
    beside = await run(['button', 'select'])
  const at = (r: typeof plain, p: string) => r.artifacts.find((a) => a.logicalPath === p)!.content
  expect(at(beside, 'components/ui/button.tsx')).not.toMatch(/data-slot="button"/)
  expect(at(beside, 'components/ui/button.tsx')).toMatch(/data-slot="ombelle-button"/)
  expect(at(beside, 'components/ui/select.css')).not.toMatch(/data-slot=["']select-trigger["']/)
  const shared = at(beside, 'styles/ui-style.css')
  // shadcn's own button keeps data-slot="button"; no Ombelle rule may reach it.
  expect(shared).not.toContain(`[data-slot='button']`)
  expect(shared).toContain(`[data-slot='ombelle-button']`)
  expect(at(plain, 'styles/ui-style.css')).not.toContain('ombelle-button')
  expect(plain.preset.hash).toBe(beside.preset.hash)
})

it('leaves output byte for byte unchanged without beside components', async () => {
  const a = await run(), b = await run([])
  expect(b.artifacts.map((x) => x.sha256)).toEqual(a.artifacts.map((x) => x.sha256))
})

it('leaves no unprefixed slot name behind in beside Base UI components', async () => {
  const catalog = getCatalog('0.1.0')
  const ids = Object.keys(catalog.baseTemplates) as ('accordion' | 'button')[]
  const result = await compile({
    preset: catalog.presets.flat,
    componentIds: ids,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    edition: 'base',
    prefixedComponents: ids,
  })
  for (const artifact of result.artifacts.filter((a) => a.kind === 'component' && a.logicalPath !== 'components/ui/liquid-glass-filter.tsx')) {
    const slots = templateSlots(catalog.baseTemplates[artifact.logicalPath.slice(14, -4) as 'button']!.content)
    for (const slot of slots)
      expect(artifact.content, artifact.logicalPath + ' still names ' + slot).not.toMatch(
        // Slot names used in code (dataset.slot, [data-slot=...]) must be prefixed too.
        new RegExp("slot[^\\n]{0,40}(?<!ombelle-)['\"]" + slot + "['\"]"),
      )
  }
})

it('points the liquid-glass halo at beside components instead of the app ones', async () => {
  const catalog = getCatalog('0.1.0')
  const run = (prefixedComponents?: 'button'[]) =>
    compile({
      preset: catalog.presets['liquid-glass'],
      componentIds: ['button'],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      glassContrast: 'report',
      ...(prefixedComponents ? { prefixedComponents } : {}),
    })
  const filter = (r: Awaited<ReturnType<typeof run>>) =>
    r.artifacts.find((a) => a.logicalPath === 'components/ui/liquid-glass-filter.tsx')!.content
  const plain = filter(await run()),
    beside = filter(await run(['button']))
  expect(plain).toContain('[data-slot="button"]')
  expect(beside).not.toContain('[data-slot="button"]')
  expect(beside).toContain('[data-slot="ombelle-button"]')
  expect(beside).toContain('[data-slot="card"]')
})
