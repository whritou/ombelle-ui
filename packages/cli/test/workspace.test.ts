import { it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { assertStandaloneProject } from '../src/project/workspace.js'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
async function app(workspace: string, where: 'app' | 'parent' = 'app') {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-ws-'))
  roots.push(parent)
  const root = path.join(parent, 'app')
  await fs.mkdir(root)
  await fs.writeFile(path.join(root, 'package.json'), '{"name":"app"}')
  await fs.writeFile(
    path.join(where === 'app' ? root : parent, 'pnpm-workspace.yaml'),
    workspace,
  )
  return root
}
// shadcn init under pnpm 10+ writes this settings-only file into a single app.
const shadcnSettings = 'packages: []\n\nallowBuilds:\n  esbuild: true\n  msw: false\n'
it.each([
  shadcnSettings,
  'allowBuilds:\n  sharp: true\n',
  'packages: [] # none\r\nonlyBuiltDependencies: []\r\n',
  'packages:\nallowBuilds:\n  sharp: true\n',
  '',
])('accepts an app-root pnpm settings file without packages: %j', async (text) => {
  await expect(assertStandaloneProject(await app(text))).resolves.toBeUndefined()
})
it.each([
  'packages:\n  - apps/*\n',
  'packages: [apps/*]\n',
  'packages:\n  # members\n  - "."\n',
  'packages: &members\n  - apps/*\n',
  ' packages: []\n',
  'packages: []\npackages:\n  - apps/*\n',
])('rejects an app-root pnpm workspace that declares packages: %j', async (text) => {
  await expect(assertStandaloneProject(await app(text))).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})
it('still rejects a settings-only pnpm workspace in an ancestor', async () => {
  await expect(
    assertStandaloneProject(await app(shadcnSettings, 'parent')),
  ).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT' })
})
