import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { supportedComponentIds } from '@ombelle/contracts'
import { assertKnownComponentIds, closestComponentIds } from '../src/component-ids.js'
import { runCli } from '../src/main.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})
async function emptyRoot() {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'ombelle-unknown-component-'))
  roots.push(root)
  return root
}
async function run(args: string[]) {
  let stdout = '', stderr = ''
  const code = await runCli(args, { stdout: (text) => { stdout += text }, stderr: (text) => { stderr += text } })
  return { code, stdout, stderr }
}

it('accepts every catalog id', () => {
  expect(() => assertKnownComponentIds(supportedComponentIds)).not.toThrow()
})

it('suggests the closest catalog ids, nearest first', () => {
  expect(closestComponentIds('buton')).toEqual(['button'])
  expect(closestComponentIds('Button')).toEqual(['button'])
  expect(closestComponentIds('tab')).toEqual(['tabs', 'table'])
  expect(closestComponentIds('dropdown')).toEqual([])
  expect(closestComponentIds('unknown-component')).toEqual([])
})

it('names every unknown id once with its suggestions', () => {
  expect(() => assertKnownComponentIds(['button', 'buton', 'zzz', 'buton'])).toThrow(
    expect.objectContaining({
      code: 'UNKNOWN_COMPONENT',
      path: '/componentIds',
      message: 'Unknown components: buton (did you mean button?), zzz',
    }),
  )
})

it('refuses add with an unknown id before inspecting the project', async () => {
  const root = await emptyRoot()
  const result = await run(['add', 'button', 'buton', '--cwd', root, '--yes', '--json'])
  expect(result.code, result.stdout).toBe(2)
  const record = JSON.parse(result.stdout)
  expect(record).toMatchObject({ command: 'add', status: 'error' })
  expect(record.error).toEqual({
    code: 'UNKNOWN_COMPONENT',
    message: 'Unknown component: buton (did you mean button?)',
    path: '/componentIds',
    nextAction: 'Choose catalog component ids: ' + supportedComponentIds.join(', ') + '.',
  })
  // An empty directory is not a project; inspection would have failed with UNSUPPORTED_PROJECT.
  expect(await fs.readdir(root)).toEqual([])
})

it('prints the catalog ids as the next step in human output', async () => {
  const root = await emptyRoot()
  const result = await run(['add', 'unknown-component', '--cwd', root, '--dry-run'])
  expect(result.code).toBe(2)
  expect(result.stdout).toBe('')
  expect(result.stderr).toBe(
    'UNKNOWN_COMPONENT: Unknown component: unknown-component (/componentIds)\nNext: Choose catalog component ids: ' +
      supportedComponentIds.join(', ') + '.',
  )
})
