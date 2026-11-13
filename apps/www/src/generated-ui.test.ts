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

// The compiled Button and Dialog are styled by the family stylesheet, not by a component stylesheet of their own;
// the site carries the Ombelle Dialog rules in globals.css (between the catalog dialog markers).
const stylelessComponents = new Set<string>(['button', 'dialog'])

// Set inline by the component itself (Collapsible Content), so the site never defines it.
const setByComponent = new Set(['--collapsible-height'])

it('compiles the same catalog component sources on every build', async () => {
  expect(wwwUiComponents).toContain('code-block')
  const [a, b] = await Promise.all([1, 2].map(() => fs.mkdtemp(path.join(os.tmpdir(), 'www-ui-'))))
  await generateWwwUi(a!)
  await generateWwwUi(b!)
  const first = await read(a!)
  expect(await read(b!)).toEqual(first)
  expect(Object.keys(first).sort()).toEqual([
    ...wwwUiComponents.flatMap(id => (stylelessComponents.has(id) ? [] : [`components/ui/${id}.css`]).concat(`components/ui/${id}.tsx`)),
    'lib/utils.ts',
  ].sort())
  expect(first['components/ui/slider.tsx']).toContain("from '../../lib/utils'")
  // The site needs no Tailwind conflict merging, so its cn is clsx only and tailwind-merge stays out of the bundles.
  expect(first['lib/utils.ts']).toContain("from 'clsx'")
  expect(first['lib/utils.ts']).not.toContain('tailwind-merge')
})

it('defines in the site stylesheet every token the compiled styles read without a fallback', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'www-ui-'))
  await generateWwwUi(dir)
  const globals = await fs.readFile(path.resolve(__dirname, 'app/globals.css'), 'utf8')
  const root = /:root\s*\{([^}]*)\}/.exec(globals)![1]!
  const defined = new Set([...root.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]))
  const read_ = await read(dir)
  const needed = new Set<string>()
  for (const id of wwwUiComponents.filter(id => !stylelessComponents.has(id))) {
    const css = read_[`components/ui/${id}.css`]!
    // A stylesheet's own custom properties (the Code Block surface and token colours) need no site token.
    const own = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]))
    for (const match of css.matchAll(/var\((--[\w-]+)\)/g)) if (!setByComponent.has(match[1]!) && !own.has(match[1]!)) needed.add(match[1]!)
  }
  expect([...needed].filter(name => !defined.has(name)).sort()).toEqual([])
})

it('keeps the site stylesheet, with its copied catalog Dialog rules, valid CSS', async () => {
  const { default: postcss } = await import('postcss')
  const globals = await fs.readFile(path.resolve(__dirname, 'app/globals.css'), 'utf8')
  expect(() => postcss.parse(globals)).not.toThrow()
  const block = globals.slice(globals.indexOf('/* catalog dialog */'), globals.indexOf('/* end catalog dialog */'))
  for (const slot of ['dialog-content', 'dialog-body', 'dialog-footer']) expect(block).toContain(`[data-slot='${slot}']`)
  expect(block).toContain("[data-slot='dialog-content']:is([data-size='lg'], [data-size='fullscreen'])")
})
