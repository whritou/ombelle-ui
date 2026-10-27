import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { compile, sha256 } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { supportedComponentIds } from '@ombelle/contracts'
import {
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
