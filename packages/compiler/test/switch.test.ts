import { expect, it } from 'vitest'
import { format } from 'prettier/standalone'
import * as postcss from 'prettier/plugins/postcss'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies, type ComponentId } from '@ombelle/contracts'
import { compile } from '../src/index.js'

it.each(supportedStyleFamilies)(
  'compiles deterministic Switch artifacts in %s',
  async (family) => {
    const catalog = getCatalog('0.1.0')
    const input = {
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      preset: catalog.presets[family],
      componentIds: ['switch' as ComponentId],
    }
    const result = await compile(input)
    expect(result.artifacts.map((a) => a.logicalPath)).toEqual([
      'components/ui/switch.css',
      'components/ui/switch.tsx',
      'examples/switch.tsx',
      'lib/utils.ts',
      'styles/ui-style.css',
      'styles/ui-tokens.css',
    ])
    const find = (path: string) =>
      result.artifacts.find((a) => a.logicalPath === path)!.content
    expect(find('components/ui/switch.css')).toBe(
      await format(catalog.templates[input.componentIds[0]!].styles![family], {
        parser: 'css',
        plugins: [postcss],
        endOfLine: 'lf',
        singleQuote: true,
        semi: false,
      }),
    )
    expect(find('components/ui/switch.tsx')).toContain("import './switch.css'")
    expect(find('components/ui/switch.tsx')).toContain("from '@/lib/utils'")
    for (const text of [
      "from '@/components/ui/switch'",
      'htmlFor="notifications"',
      'name="notifications"',
      'value="enabled"',
      'SwitchThumb',
    ])
      expect(find('examples/switch.tsx')).toContain(text)
    expect(result.dependencies).toEqual([
      { name: '@radix-ui/react-switch', version: '1.4.1' },
      { name: 'clsx', version: '2.1.1' },
      { name: 'react', version: '19.3.1' },
      { name: 'tailwind-merge', version: '3.7.0' },
    ])
    expect(await compile(input)).toEqual(result)
    expect(
      await compile({
        ...input,
        componentIds: [...input.componentIds, ...input.componentIds],
      }),
    ).toEqual(result)
    const combined = await compile({
      ...input,
      componentIds: ['button', ...input.componentIds],
    })
    expect(
      await compile({
        ...input,
        componentIds: [...input.componentIds, 'button', ...input.componentIds],
      }),
    ).toEqual(combined)
    for (const artifact of result.artifacts)
      expect(
        combined.artifacts.find((a) => a.logicalPath === artifact.logicalPath),
      ).toEqual(artifact)
  },
)
