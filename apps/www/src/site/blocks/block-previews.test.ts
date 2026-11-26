import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { beforeAll, expect, it } from 'vitest'
import { styleFamilies, supportedBlockIds } from '@ombelle/contracts'
import { generateWwwBlockPreviews } from '../../../../../scripts/generate-www-previews'

let root: string
const out = () => ({ public: path.join(root, 'public'), preview: path.join(root, 'preview'), sources: path.join(root, 'blocks.ts') })
const read = (...parts: string[]) => fs.readFile(path.join(root, ...parts), 'utf8')

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'www-block-previews-'))
  await generateWwwBlockPreviews(out())
}, 300_000)

it('writes one complete stylesheet per family and block', async () => {
  for (const family of styleFamilies)
    for (const id of supportedBlockIds) {
      const css = await read('public', family, 'blocks', `${id}.css`)
      // The block's own layout, the family's tokens in both modes, Tailwind's utilities, and no import a browser cannot load.
      expect(css, `${family}/${id}`).toContain(`[data-block=${id}]`)
      expect(css).toMatch(/:root\s*\{[^}]*--primary:/)
      expect(css).toMatch(/\.dark\s*\{[^}]*--primary:/)
      expect(css).toContain('.bg-primary')
      expect(css).not.toMatch(/@import|@source|@theme|@custom-variant/)
    }
  // Each family brings its own look: the stylesheets differ between families.
  expect(await read('public', 'ombelle', 'blocks', 'login-01.css')).not.toBe(await read('public', 'papier', 'blocks', 'login-01.css'))
}, 300_000)

it('writes the compiled blocks for the preview frame without their CSS imports', async () => {
  const index = await read('preview', 'index.ts')
  for (const id of supportedBlockIds) {
    expect(index).toContain(`'${id}': () => import('./blocks/${id}')`)
    const block = await read('preview', 'blocks', `${id}.tsx`)
    expect(block).not.toMatch(/\.css'/)
    expect(block).not.toContain('@/components/ui/')
  }
  expect(await read('preview', 'components', 'ui', 'liquid-glass-filter.tsx')).toContain('LiquidGlassFilter')
})

it('writes each block source per edition for the Code tab', async () => {
  const sources = await read('blocks.ts')
  for (const id of supportedBlockIds) expect(sources).toContain(`"${id}": {`)
  expect(sources).toContain('"radix"')
  expect(sources).toContain('"base"')
  expect(sources).toContain('export function Login01()')
})
