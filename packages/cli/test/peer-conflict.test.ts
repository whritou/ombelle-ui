// A newer React major is accepted (INS-01), so a package manager may refuse a component dependency that
// does not declare it. The failure keeps the rollback and names the package and the React version
// instead of passing the manager's raw output through.
import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { compile } from '@ombelle/compiler'
import example from '../../../examples/preset.example.json'
import { createProject } from '../../../tests/helpers/projects.js'
import { snapshotTree } from '../../../tests/helpers/tree.js'
import { inspectProject } from '../src/project/inspect.js'
import { planAdd } from '../src/plan/components.js'
import { planTheme } from '../src/plan/theme.js'
import { applyPlan } from '../src/apply/transaction.js'
import { peerConflict, runDependencies } from '../src/apply/manager.js'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})

const npmEresolve = [
  'npm error code ERESOLVE',
  'npm error ERESOLVE unable to resolve dependency tree',
  'npm error',
  'npm error While resolving: fixture-app@1.0.0',
  'npm error Found: react@20.0.0',
  'npm error node_modules/react',
  'npm error   react@"20.0.0" from the root project',
  'npm error',
  'npm error Could not resolve dependency:',
  'npm error peer react@"^16.8 || ^17.0 || ^18.0 || ^19.0" from @radix-ui/react-slot@1.5.0',
  'npm error node_modules/@radix-ui/react-slot',
  'npm error   @radix-ui/react-slot@"1.5.0" from the root project',
].join('\n')

it('reads the package and the peer from npm, pnpm and Yarn peer failures', () => {
  expect(peerConflict(npmEresolve)).toEqual({ peer: 'react', range: '^16.8 || ^17.0 || ^18.0 || ^19.0', from: '@radix-ui/react-slot' })
  expect(peerConflict([
    ' ERR_PNPM_PEER_DEP_ISSUES  Unmet peer dependencies',
    '.',
    '└─┬ @radix-ui/react-dialog 1.3.1',
    '  └── ✕ unmet peer react@"^16.8 || ^17.0 || ^18.0 || ^19.0": found 20.0.0',
  ].join('\n'))).toEqual({ from: '@radix-ui/react-dialog', peer: 'react', range: '^16.8 || ^17.0 || ^18.0 || ^19.0' })
  expect(peerConflict('error cmdk@1.1.1 has an unmet peer dependency "react@^18 || ^19".')).toEqual({ from: 'cmdk', peer: 'react', range: '^18' })
  expect(peerConflict('npm error code E404\nnpm error 404 Not Found')).toBeUndefined()
})

it('restores the plan\'s files and names the package and React version when npm refuses a peer (ERESOLVE)', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const pkgFile = path.join(root, 'package.json')
  const pkg = JSON.parse(await fs.readFile(pkgFile, 'utf8'))
  pkg.dependencies.react = pkg.dependencies['react-dom'] = '20.0.0'
  await fs.writeFile(pkgFile, JSON.stringify(pkg))
  const build = (componentIds: 'button'[]) =>
    compile({ preset: example, componentIds, catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  const context = await inspectProject(root)
  expect(context.supportNotices).toEqual([expect.stringMatching(/^React 20 is newer than the versions this release was tested with \(19\.x\)/)])
  await applyPlan(await planTheme(context, await build([])), { dependencies: async () => {} })
  const plan = await planAdd(await inspectProject(root), await build(['button']))
  expect(plan.dependencyPlan.length).toBeGreaterThan(0)

  // A stub manager that fails as npm does on a peer conflict.
  const stubs = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-stub-manager-'))
  roots.push(stubs)
  const stub = path.join(stubs, 'npm-eresolve.cjs')
  await fs.writeFile(stub, 'process.stderr.write(' + JSON.stringify(npmEresolve + '\n') + '); process.exit(1)\n')
  const before = await snapshotTree(root)
  await expect(applyPlan(plan, {
    dependencies: (target, deps, manager, _prepared, bunLockfile, signal) =>
      runDependencies(target, deps, 'npm', { executable: process.execPath, prefixArgs: [stub] }, bunLockfile, signal),
  })).rejects.toMatchObject({
    code: 'DEPENDENCY_FAILURE',
    message: 'npm refused the install because of a peer dependency: @radix-ui/react-slot declares peer react@"^16.8 || ^17.0 || ^18.0 || ^19.0", and the project declares react "20.0.0". The source files of this plan were restored.',
    nextAction: expect.stringContaining('legacy-peer-deps=true'),
  })
  const after = await snapshotTree(root)
  for (const [file, hash] of Object.entries(before)) expect(after[file], file).toBe(hash)
  for (const file of Object.keys(after)) if (!file.startsWith('.ombelle-transactions/')) expect(before[file], file).toBeDefined()
})
