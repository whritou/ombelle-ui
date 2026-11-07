import { it, expect } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { compile, duplicatePrefixedRules, prefixSlots, templateSlots } from '../src/index.js'

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

it('keeps shared rules and appends prefixed copies after them', () => {
  const css = `[data-slot="button"]{color:red}@media (hover:hover){[data-slot="button"]:hover{color:blue}}[data-slot="input"]{color:green}`
  const out = duplicatePrefixedRules(css, ['button'])
  expect(out).toBe(
    `[data-slot="button"]{color:red}[data-slot="ombelle-button"]{color:red}@media (hover:hover){[data-slot="button"]:hover{color:blue}[data-slot="ombelle-button"]:hover{color:blue}}[data-slot="input"]{color:green}`,
  )
  expect(duplicatePrefixedRules(css, ['button'])).toBe(out)
})

const run = (prefixedComponents?: ('button' | 'select')[]) =>
  compile({
    preset: getCatalog('0.1.0').presets.flat,
    componentIds: ['button', 'select'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    ...(prefixedComponents ? { prefixedComponents } : {}),
  })

it('compiles beside components with prefixed slots and shared rule copies', async () => {
  const plain = await run(),
    beside = await run(['button', 'select'])
  const at = (r: typeof plain, p: string) => r.artifacts.find((a) => a.logicalPath === p)!.content
  expect(at(beside, 'components/ui/button.tsx')).not.toMatch(/data-slot="button"/)
  expect(at(beside, 'components/ui/button.tsx')).toMatch(/data-slot="ombelle-button"/)
  expect(at(beside, 'components/ui/select.css')).not.toMatch(/data-slot=["']select-trigger["']/)
  const shared = at(beside, 'styles/ui-style.css')
  expect(shared).toContain(`[data-slot='button']`)
  expect(shared).toContain(`[data-slot='ombelle-button']`)
  expect(at(plain, 'styles/ui-style.css')).not.toContain('ombelle-button')
  expect(plain.preset.hash).toBe(beside.preset.hash)
})

it('leaves output byte for byte unchanged without beside components', async () => {
  const a = await run(), b = await run([])
  expect(b.artifacts.map((x) => x.sha256)).toEqual(a.artifacts.map((x) => x.sha256))
})
