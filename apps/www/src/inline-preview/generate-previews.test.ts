import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import postcss from 'postcss'
import { beforeAll, expect, it } from 'vitest'
import { componentsWithStyleSupport, supportedStyleFamilies } from '@ombelle/contracts'
import { specimenIndex } from '../../../../fixtures/shared/specimens/index'
import { generateWwwPreviews } from '../../../../scripts/generate-www-previews'

const read = async (root: string) => {
  const files: Record<string, string> = {}
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else files[path.relative(root, full).replaceAll(path.sep, '/')] = await fs.readFile(full, 'utf8')
    }
  }
  await walk(root)
  return files
}

const generate = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'www-previews-'))
  const out = { src: path.join(root, 'src'), public: path.join(root, 'public') }
  await generateWwwPreviews(out)
  return { src: await read(out.src), public: await read(out.public) }
}

let first: Awaited<ReturnType<typeof generate>>
beforeAll(async () => {
  first = await generate()
}, 120_000)

it('writes base and component sheets for every built-in family', () => {
  for (const family of supportedStyleFamilies) {
    expect(first.public[`${family}/base.css`]).toContain(`[data-preview-family="${family}"]`)
    const available = new Set<string>(componentsWithStyleSupport(family, ['stable', 'experimental']))
    const expected = Object.keys(specimenIndex).filter((id) => available.has(id)).map((id) => `${family}/${id}.css`)
    const written = Object.keys(first.public).filter((file) => file.startsWith(`${family}/`) && !file.endsWith('/base.css'))
    expect(written.sort()).toEqual(expected.sort())
  }
  expect(Object.keys(first.public).filter((file) => file.endsWith('/base.css'))).toHaveLength(7)
})

it('is deterministic', async () => {
  expect(await generate()).toEqual(first)
}, 120_000)

it('ships no unscoped rule', () => {
  const keyframes = new Map<string, string>()
  for (const [file, css] of Object.entries(first.public)) {
    const family = file.split('/')[0]!
    postcss.parse(css).walk((node) => {
      if (node.type === 'rule' && !(node.parent?.type === 'atrule' && /keyframes$/i.test((node.parent as postcss.AtRule).name)))
        for (const selector of node.selectors) expect(selector, file).toMatch(/^(\.dark )?\[data-preview-family=/)
      if (node.type === 'atrule' && /keyframes$/i.test(node.name)) {
        const owner = keyframes.get(node.params)
        expect(owner === undefined || owner === family, `${node.params} in ${owner} and ${family}`).toBe(true)
        keyframes.set(node.params, family)
      }
    })
  }
})

it('ships no font imports', () => {
  for (const css of Object.values(first.public)) expect(css).not.toMatch(/@import/)
})

it('registers every specimen', () => {
  const index = first.src['index.ts']!
  for (const id of Object.keys(specimenIndex)) expect(index).toContain(`'${id}':`)
  expect(index).toContain("from 'next/dynamic'")
  expect(first.src['specimens/shared.tsx']).toBeDefined()
  expect(first.src['specimens/index.ts']).toBeUndefined()
})
