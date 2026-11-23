import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { managerEntry } from '../../packages/cli/src/apply/manager.js'

const roots: string[] = []
const originalExecPath = process.env.npm_execpath
const originalPath = process.env.PATH

afterEach(async () => {
  if (originalExecPath === undefined) delete process.env.npm_execpath
  else process.env.npm_execpath = originalExecPath
  if (originalPath === undefined) delete process.env.PATH
  else process.env.PATH = originalPath
  await Promise.all(roots.splice(0).map((folder) => fs.rm(folder, { recursive: true, force: true })))
})

async function root() {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-pnpm-manager-'))
  roots.push(folder)
  return folder
}

// The shape `pnpm self-update` writes into PNPM_HOME/bin (pnpm 11, and
// pnpm/action-setup 6.1.1 on CI): a shell script whose last line names its target.
function posixShim(target: string) {
  return `#!/bin/sh\nbasedir=$(dirname "$0")\nexec node  "$basedir/../global/v11/x/node_modules/pnpm/bin/pnpm.mjs" "$@"\n# cmd-shim-target=${target}\n`
}

it('resolves a POSIX pnpm cmd-shim to the JavaScript entry it records', async () => {
  const folder = await root()
  const entry = path.join(folder, 'global', 'pnpm.mjs')
  await fs.mkdir(path.dirname(entry), { recursive: true })
  await fs.writeFile(entry, '')
  const bin = path.join(folder, 'bin')
  await fs.mkdir(bin)
  await fs.writeFile(path.join(bin, 'pnpm'), posixShim(entry))
  delete process.env.npm_execpath
  process.env.PATH = bin
  expect(await managerEntry('pnpm')).toBe(entry)
})

it.each([
  ['a relative target', 'global/pnpm.mjs'],
  ['a target that is not a pnpm entry', '/usr/bin/env'],
])('rejects a POSIX pnpm cmd-shim with %s', async (_label, target) => {
  const folder = await root()
  const bin = path.join(folder, 'bin')
  await fs.mkdir(bin)
  await fs.writeFile(path.join(bin, 'pnpm'), posixShim(target))
  delete process.env.npm_execpath
  process.env.PATH = bin
  await expect(managerEntry('pnpm')).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
})
