import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import type { Preset, StyleFamily } from '@ombelle/contracts'
import {
  compileButtonPreset,
  rewriteModuleSpecifiers,
  sha256,
} from '@ombelle/compiler'
import { supportedStyleFamilies } from '../../packages/contracts/src/style-families.js'

export type ComponentPresetFixture = {
  family: StyleFamily
  preset: Preset
}

export function componentPresetFixtures(): readonly ComponentPresetFixture[] {
  return supportedStyleFamilies.map((family) => ({
    family,
    preset: JSON.parse(
      fs.readFileSync(
        path.resolve('packages/catalog/src/presets', family + '.json'),
        'utf8',
      ),
    ) as Preset,
  }))
}

export function componentPresetFixtureSource(
  uiAlias = '@/components/ui',
): string {
  return `'use client'
import * as React from 'react'
import { Button as Flat } from '${uiAlias}/presets/builtin-flat/r1/button'
import { Button as Minimalist } from '${uiAlias}/presets/builtin-minimalist/r1/button'
import { Button as Brutalist } from '${uiAlias}/presets/builtin-neo-brutalism/r1/button'

const entries: Record<string, typeof Flat> = {
  'builtin-flat': Flat,
  'builtin-minimalist': Minimalist,
  'builtin-neo-brutalism': Brutalist,
}

export function ComponentPresetFixture() {
  const query = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const Component = entries[query.get('componentPreset') ?? 'builtin-flat'] ?? Flat
  const tamper = query.get('tamper') === '1'
  const [clicks, setClicks] = React.useState(0)

  return (
    <section data-testid="component-preset-fixture" aria-label="Component preset fixture">
      <div data-testid="component-preset-specimen" style={{ width: 360, maxWidth: '100%', padding: 32, background: '#808080', boxSizing: 'border-box' }}>
        <Component
          data-testid="component-preset-default"
          {...(tamper ? { 'data-ombelle-scope': 'tampered', 'data-slot': 'button' } : {})}
          onClick={() => setClicks((count) => count + 1)}
        >
          Scoped action
        </Component>
      </div>
      <output data-testid="component-preset-clicks" aria-label="Component preset activations">{clicks}</output>
    </section>
  )
}
`
}

export async function writeConsumerComponentPresetFixture(
  root: string,
): Promise<void> {
  await fsPromises.writeFile(
    path.join(root, 'src', 'component-preset-fixture.tsx'),
    componentPresetFixtureSource(),
  )
}

export function previewComponentPresetPath(
  logicalPath: string,
  kind: string,
): string {
  if (kind === 'usage') {
    const match = /^examples\/scoped-presets\/([^/]+)\/r(\d+)\.tsx$/.exec(
      logicalPath,
    )
    if (!match) throw new Error('Unexpected component preset usage artifact')
    return 'src/ombelle-examples/presets/' + match[1] + '/r' + match[2] + '.tsx'
  }
  const match = /^scoped-presets\/(.+)$/.exec(logicalPath)
  if (!match) throw new Error('Unexpected component preset artifact')
  return 'src/components/ui/presets/' + match[1]
}

export async function previewComponentPresetContent(
  content: string,
  logicalPath: string,
  kind: string,
): Promise<string> {
  if (kind === 'style') return content
  const dest = previewComponentPresetPath(logicalPath, kind).slice('src/'.length)
  const directory = path.posix.dirname(dest)
  const relative = (target: string) => {
    const value = path.posix.relative(directory, target)
    return value.startsWith('.') ? value : './' + value
  }
  return rewriteModuleSpecifiers(content, (specifier) => {
    if (specifier === '@/lib/utils') return relative('lib/utils')
    const prefix = '@/components/ui/scoped-presets/'
    if (specifier.startsWith(prefix))
      return relative('components/ui/presets/' + specifier.slice(prefix.length))
    return specifier
  })
}

export async function writePreviewComponentPresets(root: string): Promise<void> {
  const manifest: Record<string, unknown> = {},
    transforms: Record<string, unknown> = {}
  for (const { family, preset } of componentPresetFixtures()) {
    const result = await compileButtonPreset({ preset })
    manifest[family] = result
    for (const artifact of result.artifacts) {
      if (artifact.kind === 'utility') continue
      const relative = previewComponentPresetPath(artifact.logicalPath, artifact.kind),
        content = await previewComponentPresetContent(
          artifact.content,
          artifact.logicalPath,
          artifact.kind,
        ),
        target = path.join(root, relative.slice('src/'.length))
      await fsPromises.mkdir(path.dirname(target), { recursive: true })
      await fsPromises.writeFile(target, content)
      transforms[artifact.logicalPath] = {
        path: relative,
        canonicalHash: artifact.sha256,
        previewHash: await sha256(content),
      }
    }
  }
  await fsPromises.writeFile(
    path.join(root, 'component-presets-manifest.json'),
    JSON.stringify(manifest, null, 2),
  )
  await fsPromises.writeFile(
    path.join(root, 'component-presets-transforms.json'),
    JSON.stringify(transforms, null, 2),
  )
  await fsPromises.writeFile(
    path.join(root, 'component-preset-fixture.tsx'),
    componentPresetFixtureSource('./components/ui'),
  )
}
