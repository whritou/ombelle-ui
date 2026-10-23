import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { readPresetFile } from '../src/preset-file.js'
import example from '../../../examples/preset.example.json'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
it('loads valid UTF-8 JSON through the inclusive 256 KiB limit', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-preset-'))
  roots.push(root)
  const file = path.join(root, 'preset.json'),
    json = JSON.stringify(example)
  await fs.writeFile(file, json + ' '.repeat(262144 - Buffer.byteLength(json)))
  expect(await readPresetFile(file)).toEqual(example)
  await fs.appendFile(file, ' ')
  await expect(readPresetFile(file)).rejects.toMatchObject({
    code: 'INVALID_DATA',
    message: 'Preset exceeds 256 KiB',
    path: file,
  })
})
it('rejects missing, non-regular, malformed, invalid-schema and non-UTF-8 files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-preset-'))
  roots.push(root)
  const file = path.join(root, 'preset.json')
  await expect(readPresetFile(file)).rejects.toMatchObject({
    code: 'INVALID_DATA',
    path: file,
  })
  await expect(readPresetFile(root)).rejects.toMatchObject({
    code: 'INVALID_DATA',
  })
  for (const data of ['{', '{}', Buffer.from([0xff, 0xfe])]) {
    await fs.writeFile(file, data)
    await expect(readPresetFile(file)).rejects.toMatchObject({
      code: 'INVALID_DATA',
    })
  }
})
