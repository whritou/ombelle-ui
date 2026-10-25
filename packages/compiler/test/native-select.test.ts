import { expect, it } from 'vitest'
import { format } from 'prettier/standalone'
import * as postcss from 'prettier/plugins/postcss'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies, type ComponentId } from '@ombelle/contracts'
import { compile } from '../src/index.js'
import baseline from './fixtures/style-baseline.json'

const id = 'native-select' as ComponentId
const base = { catalogRelease: '0.1.0', compilerVersion: '0.1.0' }

it.each(supportedStyleFamilies)(
  'compiles standalone Native Select artifacts with colocated CSS in %s',
  async (family) => {
    const result = await compile({
      ...base,
      preset: getCatalog('0.1.0').presets[family],
      componentIds: [id],
    })
    expect(result.artifacts.map((a) => a.logicalPath)).toEqual([
      'components/ui/native-select.css',
      'components/ui/native-select.tsx',
      'examples/native-select.tsx',
      'lib/utils.ts',
      'styles/ui-style.css',
      'styles/ui-tokens.css',
    ])
    const find = (path: string) =>
      result.artifacts.find((a) => a.logicalPath === path)!.content
    expect(find('components/ui/native-select.tsx')).toContain(
      "import './native-select.css'",
    )
    const catalogCss = getCatalog('0.1.0').templates[id].styles![family]
    expect(find('components/ui/native-select.css')).toBe(
      await format(catalogCss, {
        parser: 'css',
        plugins: [postcss],
        endOfLine: 'lf',
        singleQuote: true,
        semi: false,
      }),
    )
  },
)

it('emits the Native Select usage example', async () => {
  const result = await compile({
    ...base,
    preset: getCatalog('0.1.0').presets.flat,
    componentIds: [id],
  })
  const usage = result.artifacts.find(
    (a) => a.logicalPath === 'examples/native-select.tsx',
  )!.content
  expect(usage).toContain("from '@/components/ui/native-select'")
  expect(usage).toContain('NativeSelectOption')
  expect(usage).toContain('aria-invalid="true"')
  expect(usage).toContain('aria-describedby="region-error"')
  expect(usage).toContain('size="sm"')
  expect(result.dependencies).toContainEqual({
    name: 'lucide-react',
    version: '1.55.0',
  })
})

it.each(supportedStyleFamilies)(
  'deduplicates and orders Native Select inputs without changing existing %s artifacts',
  async (family) => {
    const input = { ...base, preset: getCatalog('0.1.0').presets[family] }
    const single = await compile({ ...input, componentIds: [id] })
    expect(await compile({ ...input, componentIds: [id, id] })).toEqual(single)
    const legacyIds = [
      'button',
      'badge',
      'card',
      'dialog',
      'input',
    ] as ComponentId[]
    const legacy = await compile({ ...input, componentIds: legacyIds })
    const combined = await compile({
      ...input,
      componentIds: [id, ...legacyIds],
    })
    expect(
      await compile({
        ...input,
        componentIds: [...[...legacyIds].reverse(), id, id],
      }),
    ).toEqual(combined)
    for (const legacyId of legacyIds) {
      const alone = await compile({ ...input, componentIds: [legacyId] })
      for (const artifact of alone.artifacts.filter((a) =>
        a.logicalPath.includes(legacyId),
      ))
        expect(
          combined.artifacts.find(
            (a) => a.logicalPath === artifact.logicalPath,
          ),
        ).toEqual(artifact)
    }
    for (const artifact of legacy.artifacts.filter((a) =>
      a.logicalPath.startsWith('components/ui/'),
    ))
      expect(
        combined.artifacts.find((a) => a.logicalPath === artifact.logicalPath),
      ).toEqual(artifact)
    if (family === 'flat' || family === 'neo-brutalism')
      for (const artifact of baseline.families[family].artifacts)
        expect(
          combined.artifacts.find((a) => a.logicalPath === artifact.logicalPath)
            ?.sha256,
        ).toBe(artifact.sha256)
  },
)
