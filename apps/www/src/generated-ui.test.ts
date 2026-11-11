import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'
import { generateWwwUi, wwwUiComponents } from '../../../scripts/generate-www-ui'

const read = async (root: string) => {
  const files: Record<string, string> = {}
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else files[path.relative(root, full).replaceAll('\\', '/')] = await fs.readFile(full, 'utf8')
    }
  }
  await walk(root)
  return files
}

it('compiles the same Slider, Toggle Group and Chip sources on every build', async () => {
  const [a, b] = await Promise.all([1, 2].map(() => fs.mkdtemp(path.join(os.tmpdir(), 'www-ui-'))))
  await generateWwwUi(a!)
  await generateWwwUi(b!)
  const first = await read(a!)
  expect(await read(b!)).toEqual(first)
  expect(Object.keys(first).sort()).toEqual([
    ...wwwUiComponents.flatMap(id => [`components/ui/${id}.css`, `components/ui/${id}.tsx`]),
    'lib/utils.ts',
  ].sort())
  expect(first['components/ui/slider.tsx']).toContain("from '../../lib/utils'")
})

it('defines in the site stylesheet every token the compiled styles read without a fallback', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'www-ui-'))
  await generateWwwUi(dir)
  const globals = await fs.readFile(path.resolve(__dirname, 'app/globals.css'), 'utf8')
  const root = /:root\s*\{([^}]*)\}/.exec(globals)![1]!
  const defined = new Set([...root.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]))
  const read_ = await read(dir)
  const needed = new Set<string>()
  for (const id of wwwUiComponents)
    for (const match of read_[`components/ui/${id}.css`]!.matchAll(/var\((--[\w-]+)\)/g)) needed.add(match[1]!)
  expect([...needed].filter(name => !defined.has(name)).sort()).toEqual([])
})
