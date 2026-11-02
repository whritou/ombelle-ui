import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { afterEach, expect, it } from 'vitest'
import { writeFileAtomicSync } from '../../scripts/write-atomic.js'

let root: string | undefined
afterEach(async () => {
  if (root && path.dirname(root) === path.resolve(os.tmpdir()) && path.basename(root).startsWith('ombelle-'))
    await fs.rm(root, { recursive: true, force: true })
  root = undefined
})

it('leaves identical files untouched and replaces changed files without temporary leftovers', async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-write-atomic-'))
  const file = path.join(root, 'index.js')
  writeFileAtomicSync(file, 'export const a = 1\n')
  const past = new Date(Date.now() - 60_000)
  await fs.utimes(file, past, past)
  writeFileAtomicSync(file, 'export const a = 1\n')
  expect((await fs.stat(file)).mtimeMs).toBe(past.getTime())
  writeFileAtomicSync(file, new TextEncoder().encode('export const a = 2\n'))
  expect(await fs.readFile(file, 'utf8')).toBe('export const a = 2\n')
  expect(await fs.readdir(root)).toEqual(['index.js'])
})
