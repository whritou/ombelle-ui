import { it, expect } from 'vitest'
import { supportedComponentIds, supportedStyleFamilies, type ComponentId } from '@ombelle/contracts'
import { componentEditions, getCatalog } from '@ombelle/catalog'
import { compile } from '../src/index.js'
const catalog = getCatalog('0.1.0')
const run = (family: (typeof supportedStyleFamilies)[number], componentIds: readonly ComponentId[], edition?: 'radix' | 'base') =>
  compile({
    preset: catalog.presets[family],
    componentIds,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
    ...(edition ? { edition } : {}),
  })
const baseIds = supportedComponentIds.filter((id) => componentEditions(id).includes('base'))
const sharedIds = baseIds.filter((id) => !catalog.templates[id].content.includes('@radix-ui/'))
const hashes = (r: Awaited<ReturnType<typeof compile>>) => r.artifacts.map((a) => [a.logicalPath, a.sha256])

it.each(supportedStyleFamilies)('defaults %s to the Radix edition byte for byte', async (family) => {
  expect(hashes(await run(family, supportedComponentIds))).toEqual(
    hashes(await run(family, supportedComponentIds, 'radix')),
  )
})

it.each(supportedStyleFamilies)('compiles shared components identically in both editions for %s', async (family) => {
  const radix = await run(family, sharedIds, 'radix'),
    base = await run(family, sharedIds, 'base')
  expect(hashes(base)).toEqual(hashes(radix))
  expect(base.preset.hash).toBe(radix.preset.hash)
})

it.each(supportedStyleFamilies)('compiles every Base UI component deterministically for %s', async (family) => {
  expect(hashes(await run(family, baseIds, 'base'))).toEqual(hashes(await run(family, baseIds, 'base')))
})

it('rejects components without a Base UI template', async () => {
  const unported = supportedComponentIds.find((id) => !componentEditions(id).includes('base'))
  if (!unported) return
  await expect(run('flat', [unported], 'base')).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
})

it('compiles the Base UI Button with project imports and Base UI dependencies', async () => {
  const preset = structuredClone(catalog.presets.flat)
  const result = await run('flat', ['button'], 'base')
  const button = result.artifacts.find((a) => a.logicalPath === 'components/ui/button.tsx')!
  expect(button.content).toContain("from '@base-ui/react/button'")
  expect(button.content).toContain("from '@/lib/utils'")
  expect(button.content).toContain("variant = '" + preset.componentDefaults!.button!.variant + "'")
  const names = result.dependencies.map((d) => d.name)
  expect(names).toContain('@base-ui/react')
  expect(names.filter((n) => n.startsWith('@radix-ui/'))).toEqual([])
})
