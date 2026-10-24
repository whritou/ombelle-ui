import { expect, it } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import { supportedStyleFamilies, type ComponentId } from '@ombelle/contracts'
import { compile } from '../src/index.js'

it.each(supportedStyleFamilies)(
  'compiles a deterministic standalone Badge in %s without changing existing artifacts',
  async (family) => {
    const preset = getCatalog('0.1.0').presets[family]
    const input = { preset, catalogRelease: '0.1.0', compilerVersion: '0.1.0' }
    const legacy = await compile({
      ...input,
      componentIds: ['button', 'dialog', 'input'],
    })
    const result = await compile({
      ...input,
      componentIds: ['badge' as ComponentId],
    })
    const repeated = await compile({
      ...input,
      componentIds: ['badge', 'badge'] as ComponentId[],
    })
    expect(repeated).toEqual(result)
    expect(result.artifacts.map((a) => a.logicalPath)).toEqual([
      'components/ui/badge.css',
      'components/ui/badge.tsx',
      'examples/badge.tsx',
      'lib/utils.ts',
      'styles/ui-style.css',
      'styles/ui-tokens.css',
    ])
    expect(
      result.artifacts.find((a) => a.logicalPath === 'examples/badge.tsx')
        ?.content,
    ).toContain("import { Badge } from '@/components/ui/badge'")
    expect(
      result.artifacts.find((a) => a.logicalPath === 'components/ui/badge.tsx')
        ?.content,
    ).toContain("import './badge.css'")
    expect(result.dependencies.map((d) => d.name)).toEqual([
      'clsx',
      'react',
      'tailwind-merge',
    ])
    const combined = await compile({
      ...input,
      componentIds: ['input', 'badge', 'button', 'dialog'] as ComponentId[],
    })
    for (const artifact of legacy.artifacts)
      expect(
        combined.artifacts.find((a) => a.logicalPath === artifact.logicalPath),
      ).toEqual(artifact)
  },
)
