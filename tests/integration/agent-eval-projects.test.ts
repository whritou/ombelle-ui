import fs from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { evalTasks } from '../../scripts/agent-evals/tasks.js'
import { prepareEvalProject, prepareTaskProject, taskProjectOptions } from '../../scripts/agent-evals/projects.js'

const roots: string[] = []
const prepare = async (...args: Parameters<typeof prepareEvalProject>) => {
  const root = await prepareEvalProject(...args)
  roots.push(root)
  return root
}
const exists = (root: string, file: string) =>
  fs.access(path.join(root, file)).then(
    () => true,
    () => false,
  )
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((r) => fs.rm(r, { recursive: true, force: true })),
  )
})
const SLOW = 300_000

describe('evalTasks', () => {
  it('defines eight unique tasks that name only Ombelle UI', () => {
    expect(evalTasks).toHaveLength(8)
    expect(new Set(evalTasks.map((t) => t.id)).size).toBe(8)
    for (const task of evalTasks) {
      expect(task.prompt).toMatch(/Ombelle/)
      expect(task.prompt).not.toMatch(/https?:|@ombelle|npx/)
    }
  })

  it('requires doctor wherever the loop ends with it, and nowhere else', () => {
    const required = Object.fromEntries(evalTasks.map((t) => [t.id, t.expected.requiredCommands ?? []]))
    expect(required['check-install']).toEqual(['doctor'])
    expect(required['no-preset']).toEqual([])
    expect(required['edited-button']).toEqual([])
    for (const task of evalTasks)
      if (task.expected.lockIds.length > 0 || task.expected.presetChanged)
        expect(task.expected.requiredCommands, task.id).toEqual(['doctor'])
  })
})

describe('taskProjectOptions', () => {
  const task = (id: string) => evalTasks.find((t) => t.id === id)!
  it('hands no preset to the no-preset task', () => {
    expect(taskProjectOptions(task('no-preset')).withoutPreset).toBe(true)
    expect(taskProjectOptions(task('init-button-dialog')).withoutPreset).toBeUndefined()
  })
  it('adds new.preset.json for switch-theme and a button for check-install', async () => {
    expect(Object.keys(taskProjectOptions(task('switch-theme')).files ?? {})).toEqual(['new.preset.json'])
    expect(taskProjectOptions(task('check-install')).components).toEqual(['button'])
  })
})

// Installs fixture dependencies from the registry (pnpm install, npm ci): run where OMBELLE_REGISTRY_TESTS is set,
// as pnpm check:foundation does.
describe.skipIf(!process.env.OMBELLE_REGISTRY_TESTS)('prepareEvalProject', () => {
  it('prepares an installed pnpm Vite app', async () => {
    const root = await prepare('vite-pnpm')
    for (const f of ['package.json', 'pnpm-lock.yaml', 'brand.preset.json'])
      expect(await exists(root, f)).toBe(true)
    expect(await exists(root, 'node_modules/react')).toBe(true)
    expect(await exists(root, 'new.preset.json')).toBe(false)
    expect(await exists(root, 'ui-library.lock.json')).toBe(false)
  }, SLOW)

  it('writes no preset with withoutPreset', async () => {
    const root = await prepare('vite-pnpm', undefined, { withoutPreset: true })
    expect(await exists(root, 'brand.preset.json')).toBe(false)
    expect(await exists(root, 'package.json')).toBe(true)
  }, SLOW)

  it('prepares an installed npm Next app', async () => {
    const root = await prepare('next-npm')
    const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
    expect(pkg.packageManager).toMatch(/^npm@/)
    expect(await exists(root, 'package-lock.json')).toBe(true)
    expect(await exists(root, 'pnpm-lock.yaml')).toBe(false)
    expect(await exists(root, 'brand.preset.json')).toBe(true)
    expect(await exists(root, 'node_modules/react')).toBe(true)
  }, SLOW)

  it('writes a hand-written button for edited-button', async () => {
    const root = await prepare('vite-pnpm', 'edited-button')
    const text = await fs.readFile(path.join(root, 'src/components/ui/button.tsx'), 'utf8')
    const catalog = path.resolve('packages/catalog/src/templates/button.tsx')
    expect(text).not.toBe(await fs.readFile(catalog, 'utf8'))
    expect(await exists(root, 'ui-library.lock.json')).toBe(false)
  }, SLOW)

  it('initializes Ombelle for the initialized setup and writes extra files', async () => {
    const root = await prepare('vite-pnpm', 'initialized', {
      files: { 'new.preset.json': '{}' },
      components: ['button'],
    })
    expect(await exists(root, 'ui-library.lock.json')).toBe(true)
    expect(await exists(root, 'new.preset.json')).toBe(true)
    const lock = await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8')
    expect(lock).toContain('src/components/ui/button.tsx')
  }, SLOW)

  it('adds the switch-theme preset through prepareTaskProject', async () => {
    const task = evalTasks.find((t) => t.id === 'switch-theme')!
    const root = await prepareTaskProject(task)
    roots.push(root)
    expect(await exists(root, 'new.preset.json')).toBe(true)
    expect(await exists(root, 'ui-library.lock.json')).toBe(true)
  }, SLOW)
})
