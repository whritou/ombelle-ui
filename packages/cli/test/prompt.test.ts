import { it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createProject } from '../../../tests/helpers/projects.js'
import { runCli } from '../src/main.js'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
const preset = path.resolve('packages/catalog/src/presets/flat.json')
async function project() {
  const root = await createProject('vite')
  roots.push(root)
  // Pretend dependencies are installed so applying needs no package manager.
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
  Object.assign(pkg.dependencies, {
    '@radix-ui/react-slot': '1.5.0', 'class-variance-authority': '0.7.1', clsx: '2.1.1', 'tailwind-merge': '3.7.0',
  })
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify(pkg))
  const io = { stdout() {}, stderr() {} }
  expect(await runCli(['theme', 'add', preset, '--yes', '--cwd', root], io)).toBe(0)
  await fs.mkdir(path.join(root, 'src/components/ui'), { recursive: true })
  await fs.writeFile(path.join(root, 'src/components/ui/button.tsx'), 'export {}\n')
  return root
}
function io(answers: string[]) {
  const asked: string[] = []
  return {
    asked,
    stdout() {},
    stderr() {},
    async question(text: string) {
      asked.push(text)
      return answers.shift() ?? ''
    },
  }
}

it('asks how to resolve an unowned file, then applies the chosen plan', async () => {
  const root = await project()
  const terminal = io(['b', 'y'])
  expect(await runCli(['add', 'button', '--cwd', root], terminal)).toBe(0)
  expect(terminal.asked[0]).toBe(
    'src/components/ui/button.tsx exists and is not managed by Ombelle: [o]verwrite, [b]eside, [c]ancel ',
  )
  expect(terminal.asked[1]).toBe('Apply these changes? [y/N] ')
  expect(await fs.readFile(path.join(root, 'src/components/ui/button.tsx'), 'utf8')).toBe('export {}\n')
  expect(await fs.readFile(path.join(root, 'src/components/ui/ombelle/button.tsx'), 'utf8')).toContain('ombelle-button')
})

it('cancels without writes', async () => {
  const root = await project()
  const terminal = io(['c'])
  expect(await runCli(['add', 'button', '--cwd', root], terminal)).toBe(0)
  expect(terminal.asked).toHaveLength(1)
  await expect(fs.access(path.join(root, 'src/components/ui/ombelle'))).rejects.toThrow()
})

it('never prompts with --yes', async () => {
  const root = await project()
  const terminal = io([])
  expect(await runCli(['add', 'button', '--yes', '--cwd', root], terminal)).toBe(4)
  expect(terminal.asked).toEqual([])
})
