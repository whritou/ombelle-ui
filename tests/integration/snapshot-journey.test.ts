import { randomUUID } from 'node:crypto'
import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getCatalog } from '@ombelle/catalog'
import { type PresetSnapshot } from '@ombelle/contracts'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'
import { startSnapshotService } from '../helpers/snapshot-service.js'
import { runNative } from '../helpers/bun-command.js'

it('allows child test environments to explicitly remove inherited variables', async () => {
  const key = 'OMBELLE_TEST_EXPLICIT_UNSET'
  const previous = process.env[key]
  process.env[key] = 'inherited'
  try {
    const result = await runNative(process.execPath, ['-e', `process.stdout.write(process.env.${key} ?? 'absent')`], process.cwd(), { [key]: undefined })
    expect(result.code).toBe(0)
    expect(result.output).toBe('absent')
  } finally {
    if (previous === undefined) delete process.env[key]
    else process.env[key] = previous
  }
})

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})

it.each(['vite', 'next'] as const)('published preset persists across fresh offline additions in %s', async (framework) => {
 for (const manager of ['pnpm', 'npm', 'yarn', 'bun'] as const) {
  const service = await startSnapshotService()
    let serviceClosed = false
    const closeService = async () => { if (!serviceClosed) { serviceClosed = true; await service.close() } }
  try {
    const preset = JSON.parse(await fs.readFile('examples/preset.example.json', 'utf8'))
    const response = await fetch(service.origin + '/api/v1/presets', {
      method: 'POST',
      headers: {
        origin: service.origin,
        'content-type': 'application/json',
        'idempotency-key': randomUUID(),
      },
      body: JSON.stringify({ preset }),
    })
    expect(response.status).toBe(201)
    const publishedPreset = await response.json() as PresetSnapshot
    const source = {
      origin: service.origin,
      reference: `${publishedPreset.id}@${publishedPreset.revision}`,
      presetHash: publishedPreset.presetHash,
    }
    const root = await createProject(framework)
    roots.push(root)
    const pkgPath = path.join(root, 'package.json')
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'))
    for (const component of Object.values(getCatalog('0.1.0').templates))
      for (const dependency of component.dependencies)
        pkg.dependencies[dependency.name] = dependency.version
    pkg.packageManager = { pnpm: 'pnpm@11.25.0', npm: 'npm@11.19.0', yarn: 'yarn@4.18.1', bun: 'bun@1.4.3' }[manager]
    await fs.writeFile(pkgPath, JSON.stringify(pkg))
    if (manager !== 'pnpm') {
      await fs.rm(path.join(root, 'pnpm-lock.yaml'))
      const lock = { npm: 'package-lock.json', yarn: 'yarn.lock', bun: 'bun.lock' }[manager]
      await fs.writeFile(path.join(root, lock), manager === 'npm' ? '{}' : '')
    }
    const initialized = await runBuiltCli('node', [
      'init', '--preset', source.reference, '--snapshot-origin', source.origin,
      '--preset-hash', source.presetHash, '--yes', '--json',
    ], root)
    expect(initialized.code, initialized.output).toBe(0)
    expect(jsonRecord(initialized.data).presetHash).toBe(source.presetHash)
    const localPreset = JSON.parse(await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8'))
    expect(localPreset).toEqual(publishedPreset.preset)
    expect(jsonRecord(JSON.parse(await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'))).presetSource).toEqual(source)
    const read = await fetch(service.origin + response.headers.get('location'))
    expect(read.status).toBe(200)
    expect((await read.json()).presetHash).toBe(source.presetHash)
    const theme = await runBuiltCli('node', [
      'theme', 'add', source.reference, '--snapshot-origin', source.origin,
      '--preset-hash', source.presetHash, '--yes', '--json',
    ], root)
    expect(theme.code, theme.output).toBe(0)
    expect(jsonRecord(theme.data).presetHash).toBe(source.presetHash)
    const button = await runBuiltCli('node', [
      'add', 'button', '--preset', source.reference, '--snapshot-origin', source.origin,
      '--preset-hash', source.presetHash, '--yes', '--json',
    ], root)
    expect(button.code, button.output).toBe(0)
    expect(jsonRecord(button.data).presetHash).toBe(source.presetHash)
    await closeService()
    const added = await runBuiltCli('node', ['add', 'input', '--yes', '--json'], root)
    expect(added.code, added.output).toBe(0)
    expect(jsonRecord(added.data).presetHash).toBe(source.presetHash)
    expect(jsonRecord(JSON.parse(await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'))).presetSource).toEqual(source)
  } finally {
    await closeService()
  }
 }
})
