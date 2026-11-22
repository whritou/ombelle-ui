// INS-01: projects declared exactly as today's generators declare them install without edits to React.
// create-vite 9.3.4 (react-ts) writes "^19.3.1"; create-next-app 16.4.6 pins "19.3.0"; shadcn's Vite template
// writes "^19.3.1" (covered by shadcn-theme-merge.test.ts on the genuine fixture).
import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { snapshotTree } from '../helpers/tree.js'

const roots: string[] = []
const preset = path.resolve('packages/catalog/src/presets/flat.json')
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})

const generators = {
  'create-vite 9.3.4 with Tailwind v4': {
    kind: 'vite' as const,
    dependencies: { react: '^19.3.1', 'react-dom': '^19.3.1' },
    devDependencies: { vite: '^8.3.4', typescript: '~7.0.2', tailwindcss: '^4.3.5', '@tailwindcss/vite': '^4.3.5', '@vitejs/plugin-react': '^6.0.1' },
  },
  'create-next-app 16.4.6 (--tailwind)': {
    kind: 'next' as const,
    dependencies: { react: '19.3.0', 'react-dom': '19.3.0', next: '16.4.6' },
    devDependencies: { tailwindcss: '^4', '@tailwindcss/postcss': '^4', typescript: '^5' },
  },
}

async function generated(name: keyof typeof generators): Promise<string> {
  const template = generators[name]
  const root = await createProject(template.kind)
  roots.push(root)
  const file = path.join(root, 'package.json')
  const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
  pkg.dependencies = template.dependencies
  pkg.devDependencies = template.devDependencies
  await fs.writeFile(file, JSON.stringify(pkg, null, 2) + '\n')
  return root
}

it.each(Object.keys(generators) as (keyof typeof generators)[])('initializes and plans components in a stock %s project', async (name) => {
  const root = await generated(name)
  const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
  const init = await command(['init', '--preset', preset, '--yes'])
  expect(init.code, init.output).toBe(0)
  expect(jsonRecord(init.data)).toMatchObject({ outputVersion: 1, command: 'init', status: 'success' })
  const before = await snapshotTree(root)
  const add = await command(['add', 'button', 'dialog', '--dry-run'])
  expect(add.code, add.output).toBe(0)
  expect(jsonRecord(add.data).status).toBe('planned')
  expect(await snapshotTree(root)).toEqual(before)
  const doctor = await command(['doctor'])
  expect(jsonRecord(doctor.data).checks).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'project', status: 'pass' })]))
}, 120000)

it.each([
  ['React 18', '^18.3.1', /react "\^18\.3\.1" is not supported; Ombelle components need React 19/],
  ['React 20', '20.0.0', /react "20\.0\.0" is not supported/],
])('refuses %s before any write', async (_, version, message) => {
  const root = await generated('create-vite 9.3.4 with Tailwind v4')
  const file = path.join(root, 'package.json')
  const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
  pkg.dependencies.react = pkg.dependencies['react-dom'] = version
  await fs.writeFile(file, JSON.stringify(pkg))
  const before = await snapshotTree(root)
  const refused = await runBuiltCli('node', ['init', '--preset', preset, '--yes', '--cwd', root, '--json'], root)
  expect(refused.code, refused.output).toBe(3)
  expect(jsonRecord(jsonRecord(refused.data).error)).toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
    message: expect.stringMatching(message),
    nextAction: expect.stringContaining('React 19'),
  })
  expect(await snapshotTree(root)).toEqual(before)
}, 60000)
