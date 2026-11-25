import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { runCli } from '../src/main.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})
async function run(args: string[]) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'ombelle-block-refusal-'))
  roots.push(root)
  let stdout = ''
  const code = await runCli([...args, '--cwd', root, '--yes', '--json'], { stdout: (t) => { stdout += t }, stderr: () => {} })
  return { code, record: JSON.parse(stdout), files: await fs.readdir(root) }
}

for (const args of [['add', 'login-01'], ['update', 'login-01'], ['add', 'button', 'login-01']])
  it('refuses block ids until planning lands: ' + args.join(' '), async () => {
    const { code, record, files } = await run(args)
    expect(code).toBe(2)
    expect(record.error).toMatchObject({ code: 'INVALID_DATA', path: '/componentIds' })
    expect(record.error.message).toContain('Blocks are not installable yet: login-01')
    expect(files).toEqual([])
  })

it('reports an unknown block with its suggestion', async () => {
  const { code, record } = await run(['add', 'button', 'login-1'])
  expect(code).toBe(2)
  expect(record.error.code).toBe('UNKNOWN_COMPONENT')
  expect(record.error.message).toBe('Unknown component or block: login-1 (did you mean login-01?)')
})
