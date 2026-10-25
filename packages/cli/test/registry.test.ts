import { it, expect } from 'vitest'
import { registryItemSchema, registrySchema } from 'shadcn/schema'
import { compile } from '@ombelle/compiler'
import example from '../../../examples/preset.example.json'
import { buildRegistry } from '../src/registry/build.js'
it('exports schema-valid source and themes with exact compiler bytes', async () => {
  const r = await compile({
    preset: example,
    componentIds: ['button'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const registry = buildRegistry(r)
  expect(registrySchema.safeParse(registry.index).success).toBe(true)
  for (const item of Object.values(registry.items))
    expect(registryItemSchema.safeParse(item).success).toBe(true)
  expect(registry.items.button.files[0].content).toBe(
    r.artifacts.find((a) => a.logicalPath === 'components/ui/button.tsx')!
      .content,
  )
  expect(registry.items.theme.cssVars.light.primary).toBe('#facc15')
  expect(registry.items.button).not.toHaveProperty('presetHash')
})

it('includes the Badge stylesheet alongside the exact component source', async () => {
  const result = await compile({
    preset: example,
    componentIds: ['badge' as import('@ombelle/contracts').ComponentId],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const item = buildRegistry(result).items.badge
  expect(registryItemSchema.safeParse(item).success).toBe(true)
  for (const file of ['components/ui/badge.tsx', 'components/ui/badge.css'])
    expect(
      item.files.find((entry: { path: string }) => entry.path === file)
        ?.content,
    ).toBe(result.artifacts.find((a) => a.logicalPath === file)?.content)
  expect(item.dependencies).toEqual(['clsx@2.1.1', 'tailwind-merge@3.7.0'])
})

it('registers Card component, utility, and colocated CSS with exact compiler bytes', async () => {
  const result = await compile({
    preset: example,
    componentIds: ['card'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const registry = buildRegistry(result)
  expect(registrySchema.safeParse(registry.index).success).toBe(true)
  const item = registry.items.card
  expect(registryItemSchema.safeParse(item).success).toBe(true)
  expect(item.files.map((file: { path: string }) => file.path)).toEqual([
    'components/ui/card.tsx',
    'lib/utils.ts',
    'components/ui/card.css',
  ])
  for (const file of item.files)
    expect(file.content).toBe(
      result.artifacts.find((artifact) => artifact.logicalPath === file.path)!
        .content,
    )
  expect(item.dependencies).toEqual(['clsx@2.1.1', 'tailwind-merge@3.7.0'])
})

it.each([
  ['label', ['clsx@2.1.1', 'tailwind-merge@3.7.0']],
  ['textarea', ['clsx@2.1.1', 'tailwind-merge@3.7.0']],
  [
    'native-select',
    ['clsx@2.1.1', 'tailwind-merge@3.7.0', 'lucide-react@1.55.0'],
  ],
  [
    'dialog',
    [
      '@radix-ui/react-dialog@1.3.1',
      'clsx@2.1.1',
      'tailwind-merge@3.7.0',
      'lucide-react@1.55.0',
    ],
  ],
] as const)(
  'registers %s component, utility, and colocated CSS with exact compiler bytes',
  async (id, dependencies) => {
    const result = await compile({
      preset: example,
      componentIds: [id],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    const registry = buildRegistry(result)
    expect(registrySchema.safeParse(registry.index).success).toBe(true)
    const item = registry.items[id]
    expect(registryItemSchema.safeParse(item).success).toBe(true)
    expect(item.files.map((file: { path: string }) => file.path)).toEqual(
      id === 'dialog'
        ? ['components/ui/dialog.tsx', 'lib/utils.ts']
        : [
            `components/ui/${id}.tsx`,
            'lib/utils.ts',
            `components/ui/${id}.css`,
          ],
    )
    for (const file of item.files)
      expect(file.content).toBe(
        result.artifacts.find((artifact) => artifact.logicalPath === file.path)!
          .content,
      )
    expect(item.dependencies).toEqual(dependencies)
  },
)
