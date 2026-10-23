import fs from 'node:fs/promises'
import path from 'node:path'
import type { Artifact, ComponentPresetCompileResult } from '@ombelle/contracts'
import { supportedStyleFamilies } from '../../packages/contracts/src/style-families.ts'

function compiler(): Promise<typeof import('@ombelle/compiler')> {
  // Foundation runs directly under Node, without the tsx/Vitest path aliases.
  return import(
    new URL('../../packages/compiler/dist/index.js', import.meta.url).href
  )
}

let references: Promise<ComponentPresetCompileResult[]> | undefined
export function componentPresetReferences(): Promise<
  ComponentPresetCompileResult[]
> {
  return (references ??= (async () => {
    const { compileButtonPreset } = await compiler()
    const { getCatalog } = await import(
      new URL('../../packages/catalog/dist/index.js', import.meta.url).href
    )
    return Promise.all(
      supportedStyleFamilies.map((family) =>
        compileButtonPreset({ preset: getCatalog('0.1.0').presets[family] }),
      ),
    )
  })())
}

/** Independent expected aliases for these fixture projects, including preview relative imports. */
export async function componentPresetArtifact(
  artifact: Artifact,
  target: 'consumer' | 'preview',
): Promise<{ path: string; content: string }> {
  const logical = artifact.logicalPath
  const local =
    artifact.kind === 'utility'
      ? 'lib/utils.ts'
      : artifact.kind === 'usage'
        ? 'ombelle-examples/presets/' +
          logical.slice('examples/scoped-presets/'.length)
        : 'components/ui/presets/' + logical.slice('scoped-presets/'.length)
  const dest = target === 'consumer' ? 'src/' + local : local
  const relative = (to: string) => {
    const rel = path.posix.relative(path.posix.dirname(dest), to)
    return rel.startsWith('.') ? rel : './' + rel
  }
  const { rewriteModuleSpecifiers } = await compiler()
  const content =
    artifact.kind === 'style'
      ? artifact.content
      : await rewriteModuleSpecifiers(artifact.content, (specifier) => {
          if (specifier === '@/lib/utils')
            return target === 'preview' ? relative('lib/utils') : specifier
          const prefix = '@/components/ui/scoped-presets/'
          if (specifier.startsWith(prefix)) {
            const suffix = 'presets/' + specifier.slice(prefix.length)
            return target === 'preview'
              ? relative('components/ui/' + suffix)
              : '@/components/ui/' + suffix
          }
          return specifier
        })
  return { path: dest, content }
}

export async function componentPresetReferenceBank(): Promise<
  Map<string, Artifact>
> {
  const refs = await componentPresetReferences(),
    entries: [string, Artifact][] = []
  for (const ref of refs)
    for (const a of ref.artifacts) {
      const { content } = await componentPresetArtifact(a, 'consumer')
      const { sha256 } = await compiler()
      entries.push([
        a.logicalPath,
        { ...a, content, sha256: await sha256(content) },
      ])
    }
  return new Map(entries)
}

const fixtureSource = `'use client'
import * as React from 'react'
import { Button as Flat } from '@/components/ui/presets/builtin-flat/r1/button'
import { Button as Minimalist } from '@/components/ui/presets/builtin-minimalist/r1/button'
import { Button as Brutalist } from '@/components/ui/presets/builtin-neo-brutalism/r1/button'
const entries = { flat: Flat, minimalist: Minimalist, 'neo-brutalism': Brutalist }
export function ComponentPresetFixture() {
  const query = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const selected = query.get('componentPreset')
  const Component = entries[selected as keyof typeof entries] ?? Flat
  const [loading,setLoading] = React.useState(false), [disabled,setDisabled] = React.useState(false), [clicks,setClicks] = React.useState(0)
  if (!selected) return null
  return <section data-testid="component-preset-fixture" aria-label="Component preset fixture">
    <div data-testid="component-preset-specimen" style={{width:360,maxWidth:'100%',padding:32,background:'#808080',boxSizing:'border-box',display:'grid',gap:16}}>
      <Component data-testid="component-preset-default" disabled={disabled || loading} aria-busy={loading || undefined} onClick={() => setClicks(n => n + 1)}>Preset action</Component>
      {(['secondary','outline','ghost','link','destructive'] as const).map(variant => <Component key={variant} variant={variant}>{variant} action</Component>)}
      {(['sm','lg','icon'] as const).map(size => <Component key={size} size={size} aria-label={size === 'icon' ? 'Icon action' : undefined}>{size === 'icon' ? '+' : size + ' action'}</Component>)}
    </div>
    <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:24}}>
      <button type="button" onClick={() => setLoading(v => !v)}>Toggle preset loading</button>
      <button type="button" onClick={() => setDisabled(v => !v)}>Toggle preset disabled</button>
      <output data-testid="component-preset-clicks" aria-label="Preset activations">{clicks}</output>
    </div>
  </section>
}
`

export async function writeComponentPresetScenario(
  root: string,
  preview = false,
): Promise<void> {
  const fixture = preview
    ? fixtureSource.replaceAll('@/components/ui', './components/ui')
    : fixtureSource
  await fs.writeFile(path.join(root, 'component-preset-fixture.tsx'), fixture)
  const scenarioPath = path.join(root, 'scenario.tsx')
  const scenario = await fs.readFile(scenarioPath, 'utf8')
  if (scenario.includes("from './component-preset-fixture'")) return
  await fs.writeFile(
    scenarioPath,
    scenario
      .replace(
        'import { StateFixture }',
        "import { ComponentPresetFixture } from './component-preset-fixture'\nimport { StateFixture }",
      )
      .replace(
        '{states && <StateFixture />}',
        '{states && <StateFixture />}\n      {ready && <ComponentPresetFixture />}',
      ),
  )
}

export async function writePreviewComponentPresets(
  root: string,
): Promise<void> {
  const hostScenario = (
    await fs.readFile(path.join(root, 'scenario.tsx'), 'utf8')
  )
    .replace("import { RecipeFixture } from './recipe-fixture'\n", '')
    .replace('{recipes && <RecipeFixture />}', '')
  if (hostScenario.includes('ComponentPresetFixture'))
    throw Error(
      'Generate the isolated host before adding component preset imports',
    )
  await fs.writeFile(
    path.join(root, 'isolation-baseline-scenario.tsx'),
    hostScenario,
  )
  await fs.writeFile(
    path.join(root, 'isolation-baseline-entry.tsx'),
    "import * as React from 'react'\nimport {createRoot} from 'react-dom/client'\nimport './preview.css'\nimport Scenario from './isolation-baseline-scenario'\ncreateRoot(document.getElementById('root')!).render(<Scenario/>)\n",
  )
  await fs.writeFile(
    path.join(root, 'isolation-baseline.html'),
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ordinary host baseline</title></head><body><div id="root"></div><script type="module" src="./isolation-baseline-entry.tsx"></script></body></html>',
  )
  for (const ref of await componentPresetReferences())
    for (const a of ref.artifacts.filter((a) => a.kind !== 'utility')) {
      const transformed = await componentPresetArtifact(a, 'preview'),
        file = path.join(root, transformed.path)
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, transformed.content)
    }
  await writeComponentPresetScenario(root, true)
}
