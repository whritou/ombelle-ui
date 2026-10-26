import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { sha256 } from '@ombelle/compiler'
import { prepareComponentPresetConsumer } from '../../scripts/prepare-component-preset-consumer.js'
import { prepareRecipeConsumer } from '../../scripts/prepare-recipe-consumer.js'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli } from '../helpers/cli-runtime.js'
import { writeScenarioFixture } from '../helpers/scenario-fixture.js'

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})

it('records and preserves existing usage files across successful scoped preset installs', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await writeScenarioFixture(root, 'flat', { recipes: true, componentPresets: true })

  const initialized = await runBuiltCli(
    'node',
    [
      'init',
      '--preset',
      path.resolve('examples/preset.example.json'),
      '--cwd',
      root,
      '--yes',
      '--json',
    ],
    root,
  )
  expect(initialized.code, initialized.output).toBe(0)
  for (const args of [
    ['add', 'button', 'dialog'],
    ['add', 'input'],
  ]) {
    const installed = await runBuiltCli(
      'node',
      [...args, '--cwd', root, '--yes', '--json'],
      root,
    )
    expect(installed.code, installed.output).toBe(0)
  }

  await prepareRecipeConsumer({ root, cliRuntime: 'node', family: 'flat' })
  const lock = JSON.parse(
      await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
    ),
    expectedUsageHashes = new Map<string, string>()
  for (const [file, artifact] of Object.entries(lock.artifacts) as [
    string,
    { kind?: string },
  ][])
    if (artifact.kind === 'usage')
      expectedUsageHashes.set(
        file,
        await sha256(await fs.readFile(path.join(root, file), 'utf8')),
      )
  expect(expectedUsageHashes.size).toBeGreaterThan(0)

  const rows = await prepareComponentPresetConsumer({
    root,
    manager: 'pnpm',
    managerVersion: '11.25.0',
    cliRuntime: 'node',
  })

  for (const [file, hash] of expectedUsageHashes)
    expect(rows.protectedHashes[file]).toBe(hash)
  for (const row of Object.values(rows.presets)) {
    const record = row as { installed: { artifacts: Record<string, { kind: string; sha256: string }> }; checks: { preservation: boolean } }
    expect(record.checks.preservation).toBe(true)
    const newUsage = Object.entries(record.installed.artifacts).find(([, artifact]) => artifact.kind === 'usage')
    expect(newUsage).toBeDefined()
    expectedUsageHashes.set(newUsage![0], newUsage![1].sha256)
  }

  for (const [file, hash] of expectedUsageHashes)
    expect(await sha256(await fs.readFile(path.join(root, file), 'utf8'))).toBe(hash)
})
