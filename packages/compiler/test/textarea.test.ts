import { expect, it } from 'vitest'
import { format } from 'prettier/standalone'
import * as postcss from 'prettier/plugins/postcss'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies, type ComponentId } from '@ombelle/contracts'
import { compile } from '../src/index.js'
import baseline from './fixtures/style-baseline.json'

const id = 'textarea' as ComponentId
const base = { catalogRelease: '0.1.0', compilerVersion: '0.1.0' }

it.each(supportedStyleFamilies)(
  'compiles standalone Textarea artifacts with colocated CSS in %s',
  async (family) => {
    const result = await compile({
      ...base,
      preset: getCatalog('0.1.0').presets[family],
      componentIds: [id],
    })
    expect(result.artifacts.map((a) => a.logicalPath)).toEqual([
      'components/ui/textarea.css',
      'components/ui/textarea.tsx',
      'examples/textarea.tsx',
      'lib/utils.ts',
      'styles/ui-style.css',
      'styles/ui-tokens.css',
    ])
    const find = (path: string) =>
      result.artifacts.find((a) => a.logicalPath === path)!.content
    expect(find('components/ui/textarea.tsx')).toContain(
      "import './textarea.css'",
    )
    const catalogCss = getCatalog('0.1.0').templates[id].styles![family]
    expect(find('components/ui/textarea.css')).toBe(
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

it('emits the Textarea usage example', async () => {
  const result = await compile({
    ...base,
    preset: getCatalog('0.1.0').presets.flat,
    componentIds: [id],
  })
  const usage = result.artifacts.find(
    (a) => a.logicalPath === 'examples/textarea.tsx',
  )!.content
  expect(usage).toContain("from '@/components/ui/textarea'")
  expect(usage).toContain('aria-invalid="true"')
  expect(usage).toContain('aria-describedby="summary-error"')
})

it.each(supportedStyleFamilies)(
  'deduplicates and orders Textarea inputs without changing existing %s artifacts',
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
