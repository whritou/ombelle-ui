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

// TODO(Task 8): update plans block ids; until then it refuses them before reading the project.
for (const args of [['update', 'login-01'], ['update', 'button', 'login-01']])
  it('refuses block ids in update until update plans them: ' + args.join(' '), async () => {
    const { code, record, files } = await run(args)
    expect(code).toBe(2)
    expect(record.error).toMatchObject({ code: 'INVALID_DATA', path: '/componentIds' })
    expect(record.error.message).toBe('update does not take block ids yet: login-01; run add login-01')
    expect(files).toEqual([])
  })

it('accepts block ids in add and goes on to read the project', async () => {
  const { code, record, files } = await run(['add', 'button', 'login-01'])
  expect(code).toBe(3)
  expect(record.error.code).toBe('UNSUPPORTED_PROJECT')
  expect(files).toEqual([])
})

it('reports an unknown block with its suggestion', async () => {
  const { code, record } = await run(['add', 'button', 'login-1'])
  expect(code).toBe(2)
  expect(record.error.code).toBe('UNKNOWN_COMPONENT')
  expect(record.error.message).toBe('Unknown component or block: login-1 (did you mean login-01?)')
})
