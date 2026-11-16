import { it, expect } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { parseArguments, matrix } from '../../scripts/playground/model.js'
import {
  scaffold,
  assertOwned,
  projectPath,
} from '../../scripts/playground/projects.js'
import {
  snapshot,
  recordManaged,
  restore,
} from '../../scripts/playground/baseline.js'
import { createRun } from '../../scripts/playground/evidence.js'
it('refuses junction escapes and preserves target contents', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-safe-'))
  try {
    const o = parseArguments(
      ['setup', '--root', path.join(root, 'managed')],
      process.cwd(),
    )
    await fs.mkdir(path.join(o.root, 'projects'), { recursive: true })
    await fs.mkdir(path.join(root, 'outside'))
    await fs.writeFile(path.join(root, 'outside', 'keep'), 'safe')
    await fs.symlink(
      path.join(root, 'outside'),
      projectPath(o, matrix[2]),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
    await expect(assertOwned(o, matrix[2])).rejects.toThrow('symlink')
    expect(await fs.readFile(path.join(root, 'outside', 'keep'), 'utf8')).toBe(
      'safe',
    )
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
it('does not adopt unrelated files during later managed operations', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-delta-')),
    app = path.join(root, 'app'),
    base = path.join(root, 'base')
  try {
    await fs.mkdir(app)
    await fs.writeFile(path.join(app, 'file'), 'before')
    await snapshot(app, base)
    await fs.writeFile(path.join(app, 'file'), 'after')
    await recordManaged(app, base)
    await fs.writeFile(path.join(app, 'personal'), 'keep')
    const { files } = await import('../../scripts/playground/baseline.js')
    const previous = await files(app)
    await fs.writeFile(path.join(app, 'generated'), 'managed')
    await recordManaged(app, base, previous)
    await restore(app, base)
    expect(await fs.readFile(path.join(app, 'personal'), 'utf8')).toBe('keep')
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
it('marks unfinished previous work interrupted on next invocation', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-interrupted-'))
  try {
    const dir = path.join(root, 'runs', 'previous')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(
      path.join(dir, 'summary.json'),
      JSON.stringify({
        command: 'setup',
        started: 'earlier',
        steps: [
          {
            name: 'install',
            project: 'next-fresh',
            status: 'running',
            start: 'earlier',
          },
        ],
      }),
    )
    const run = await createRun(root, 'status')
    await run.finish()
    expect(
      JSON.parse(await fs.readFile(path.join(dir, 'summary.json'), 'utf8'))
        .steps[0].status,
    ).toBe('interrupted')
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
it('isolates pnpm and normalizes shadcn Next fonts without changing Button', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-fonts-'))
  try {
    const o = parseArguments(['setup', '--root', root], process.cwd())
    await scaffold(o, matrix[1])
    const app = projectPath(o, matrix[1])
    expect(
      await fs.readFile(path.join(app, 'pnpm-workspace.yaml'), 'utf8'),
    ).toBe('packages: []\n')
    expect(
      await fs.readFile(path.join(app, 'app/layout.tsx'), 'utf8'),
    ).not.toContain('next/font/google')
    expect(
      await fs.readFile(path.join(app, 'components/ui/button.tsx'), 'utf8'),
    ).toBe(
      await fs.readFile(
        'fixtures/shadcn/next/components/ui/button.tsx',
        'utf8',
      ),
    )
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})
