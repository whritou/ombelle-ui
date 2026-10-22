import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { readPresetFile } from '../src/preset-file.js'
import presetExample from '../../../examples/preset.example.json'

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-preset-'))
  roots.push(root)
  return { root, file: path.join(root, 'preset.json') }
}

it('reads and validates a local preset JSON file', async () => {
  const { file } = await fixture()
  await fs.writeFile(file, JSON.stringify(presetExample))

  expect(await readPresetFile(file)).toEqual(presetExample)
})

it('accepts a preset whose UTF-8 file is exactly 256 KiB', async () => {
  const { file } = await fixture()
  const json = JSON.stringify(presetExample)
  await fs.writeFile(
    file,
    json + ' '.repeat(262144 - Buffer.byteLength(json, 'utf8')),
  )

  expect(await readPresetFile(file)).toEqual(presetExample)
})

it('rejects preset files larger than 256 KiB', async () => {
  const { file } = await fixture()
  const json = JSON.stringify(presetExample)
  await fs.writeFile(
    file,
    json + ' '.repeat(262145 - Buffer.byteLength(json, 'utf8')),
  )

  await expect(readPresetFile(file)).rejects.toMatchObject({
    code: 'INVALID_DATA',
    message: 'Preset exceeds 256 KiB',
  })
})

it('rejects malformed JSON and schema-invalid preset data', async () => {
  const { file } = await fixture()
  await fs.writeFile(file, '{')
  await expect(readPresetFile(file)).rejects.toMatchObject({
    code: 'INVALID_DATA',
  })

  await fs.writeFile(file, JSON.stringify({ platform: 'react-web' }))
  await expect(readPresetFile(file)).rejects.toMatchObject({
    code: 'INVALID_DATA',
  })
})

it('rejects non-regular and invalid UTF-8 preset files', async () => {
  const { root, file } = await fixture()
  await expect(readPresetFile(root)).rejects.toMatchObject({
    code: 'INVALID_DATA',
  })

  await fs.writeFile(file, Buffer.from([0xff, 0xfe]))
  await expect(readPresetFile(file)).rejects.toMatchObject({
    code: 'INVALID_DATA',
  })
})
