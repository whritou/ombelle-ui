import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { compile, sha256 } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { supportedComponentIds } from '@ombelle/contracts'
import {
  assertSceneSources,
  writePresetGallery,
  transformGallerySource,
} from '../../scripts/generate-preset-gallery.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
it('generates deterministic reviewed source, fixture and Tailwind mappings', async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'ombelle-preset-gallery-'),
  )
  roots.push(root)
  await writePresetGallery(root)
  const before: Record<string, string> = {}
  for await (const name of fs.glob('**/*', { cwd: root }))
    if ((await fs.stat(path.join(root, name))).isFile())
      before[name] = await fs.readFile(path.join(root, name), 'utf8')
  await writePresetGallery(root)
  for (const [name, value] of Object.entries(before))
    expect(await fs.readFile(path.join(root, name), 'utf8')).toBe(value)
  const result = await compile({
    preset: getCatalog('0.1.0').presets.flat,
    componentIds: supportedComponentIds,
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const manifest = JSON.parse(
    await fs.readFile(path.join(root, 'manifest.json'), 'utf8'),
  )
  for (const artifact of result.artifacts.filter((item) =>
    ['component', 'utility'].includes(item.kind),
  )) {
    expect(manifest.sources[artifact.logicalPath].canonicalHash).toBe(
      artifact.sha256,
    )
    expect(manifest.sources[artifact.logicalPath].transformedHash).toBe(
      await sha256(
        await fs.readFile(path.join(root, artifact.logicalPath), 'utf8'),
      ),
    )
  }
  const fixture = await fs.readFile(path.join(root, 'gallery.tsx'), 'utf8')
  for (const id of supportedComponentIds)
    expect(fixture).toContain(`data-component="${id}"`)
  expect(fixture).toContain('Open dialog')
  // One family-independent fixture: placeholders are chosen at runtime.
  expect(fixture).toContain('aria-disabled="true"')
  expect(fixture).toContain('Unavailable in {familyLabel}')
  const css = await fs.readFile(path.join(root, 'tailwind.css'), 'utf8')
  expect(css).toContain('--color-primary:var(--primary)')
  expect(css).not.toContain('#FFFFFF')
  expect(css).toContain('@custom-variant dark')
})
it('removes only known stylesheet imports and rewrites imports without touching text literals', async () => {
  const source =
    "import './card.css'\nimport {cn} from '@/lib/utils'\nexport const text = '@/lib/utils'\n"
  const result = await transformGallerySource(
    source,
    'components/ui/card.tsx',
    new Set(['components/ui/card.css']),
  )
  expect(result).not.toContain("import './card.css'")
  expect(result).toContain('../../lib/utils')
  expect(result).toContain("export const text = '@/lib/utils'")
  await expect(
    transformGallerySource(
      "import './unknown.css'",
      'components/ui/card.tsx',
      new Set(),
    ),
  ).rejects.toThrow('Unknown gallery stylesheet')
})
const reviewed = ['components/ui/button.tsx']
const gallery = '../generated/preset-gallery/components/ui/button'
async function sceneRoot() {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-scenes-'))
  roots.push(base)
  const scenes = path.join(base, 'scenes')
  await fs.mkdir(path.join(scenes, 'nested'), { recursive: true })
  return scenes
}
it('lets preview scenes import reviewed gallery components, react and their own files', async () => {
  const scenes = await sceneRoot()
  await fs.writeFile(
    path.join(scenes, 'ok.tsx'),
    `import * as React from 'react'
import { Button } from '${gallery}'
import { local } from './nested/local'
export * from './nested/local'
void [React, Button, local]
`,
  )
  await fs.writeFile(
    path.join(scenes, 'nested', 'local.tsx'),
    `import { Button } from '../${gallery}'
export const local = Button
`,
  )
  await expect(assertSceneSources(scenes, reviewed)).resolves.toBeUndefined()
})
it.each([
  ['a missing manifest key', `import { R } from '${gallery.replace('button', 'rogue')}'`, 'unreviewed source'],
  ['a side-effect import', `import '${gallery.replace('button', 'rogue')}'`, 'unreviewed source'],
  ['a dynamic import', `export const load = () => import('${gallery.replace('button', 'rogue')}')`, 'unreviewed source'],
  ['a lib import', `import { cn } from '../generated/preset-gallery/lib/utils'`, 'unreviewed source'],
  ['a re-export', `export { R } from '${gallery.replace('button', 'rogue')}'`, 'unreviewed source'],
  ['a type import', `export type T = import('${gallery.replace('button', 'rogue')}').R`, 'unreviewed source'],
  ['a disallowed relative file', `import { x } from '../../elsewhere/module'`, 'a disallowed file'],
  ['a disallowed package', `import { x } from 'lodash'`, 'a disallowed package'],
  ['a non-literal dynamic import', `export const load = (n: string) => import(n)`, 'Non-literal module specifier'],
])('rejects %s in a scene', async (_name, source, message) => {
  const scenes = await sceneRoot()
  await fs.writeFile(path.join(scenes, 'ok.tsx'), `import { Button } from '${gallery}'
`)
  await fs.writeFile(path.join(scenes, 'bad.tsx'), source + '\n')
  await expect(assertSceneSources(scenes, reviewed)).rejects.toThrow(message)
})
it('checks nested scene files', async () => {
  const scenes = await sceneRoot()
  await fs.writeFile(
    path.join(scenes, 'nested', 'deep.tsx'),
    `import { R } from '../${gallery.replace('button', 'rogue')}'
`,
  )
  await expect(assertSceneSources(scenes, reviewed)).rejects.toThrow('nested/deep.tsx')
})
