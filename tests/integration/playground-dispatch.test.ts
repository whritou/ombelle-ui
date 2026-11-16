import { it, expect } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { dispatch } from '../../scripts/playground/commands.js'
import { parseArguments } from '../../scripts/playground/model.js'
it('records real prerequisite failure and skips dependent work without creating projects', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-dispatch-'))
  try {
    const code = await dispatch(
      parseArguments(['setup', '--root', root], process.cwd()),
      {
        prerequisite: async () => {
          throw Error('toolchain unavailable')
        },
      },
    )
    expect(code).toBe(1)
    await expect(fs.access(path.join(root, 'projects'))).rejects.toThrow()
    const [run] = await fs.readdir(path.join(root, 'runs'))
    const saved = JSON.parse(
      await fs.readFile(path.join(root, 'runs', run!, 'summary.json'), 'utf8'),
    )
    expect(saved.steps[0].status).toBe('failed')
    expect(
      saved.steps.filter((s: { status: string }) => s.status === 'skipped'),
    ).toHaveLength(4)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})

it('allows stop while foreground invocation holds the root lock', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-stop-'))
  try {
    const { scaffold } = await import('../../scripts/playground/projects.js')
    const { matrix } = await import('../../scripts/playground/model.js')
    const o = parseArguments(
      ['stop', '--root', root, '--project', 'vite-fresh'],
      process.cwd(),
    )
    await scaffold(o, matrix[2])
    await fs.writeFile(path.join(root, '.lock'), String(process.pid))
    expect(await dispatch(o)).toBe(0)
    expect(await fs.readFile(path.join(root, '.lock'), 'utf8')).toBe(
      String(process.pid),
    )
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
