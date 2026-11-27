import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runBuiltCli } from '../../tests/helpers/cli-runtime.js'
import type { EvalTask } from './tasks.js'

export type EvalProjectKind = 'vite-pnpm' | 'next-npm'

export type EvalProjectOptions = {
  /** Extra files written into the project root before setup runs (path -> text). */
  files?: Record<string, string>
  /** Components added with the built CLI after `initialized` setup. */
  components?: string[]
}

const repo = (...parts: string[]) => path.resolve(process.cwd(), ...parts)
const win = process.platform === 'win32'

// Fixed argument lists only; the shell is needed to launch .cmd shims on Windows.
function exec(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: win,
      windowsHide: true,
      env: { ...process.env, CI: '1' },
    })
    let out = ''
    child.stdout.on('data', (s) => (out += s))
    child.stderr.on('data', (s) => (out += s))
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(command + ' ' + args.join(' ') + '\n' + out.slice(-4000)),
          ),
    )
  })
}

const handWrittenButton = `export function Button(props: React.ComponentProps<'button'>) {
  return <button className="my-own-button" {...props} />
}
`

const plainApp = `export default function Scenario() {
  return <main className="p-8">Hello</main>
}
`

async function copyFixture(source: string, root: string, skip: string[]) {
  await fs.cp(source, root, {
    recursive: true,
    filter: (file) => !skip.includes(path.basename(file)),
  })
}

/**
 * Builds a temp consumer project for an eval task and returns its absolute root.
 * `brand.preset.json` (flat) is always written; nothing else Ombelle-related
 * exists unless the setup names it.
 */
export async function prepareEvalProject(
  kind: EvalProjectKind,
  setup?: EvalTask['setup'],
  options: EvalProjectOptions = {},
): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-eval-'))
  try {
    if (kind === 'vite-pnpm') {
      await copyFixture(repo('fixtures/vite'), root, ['node_modules'])
      await exec(
        win ? 'corepack.cmd' : 'corepack',
        ['pnpm', 'install', '--frozen-lockfile', '--ignore-scripts'],
        root,
      )
    } else {
      await copyFixture(repo('fixtures/next'), root, [
        'node_modules',
        'pnpm-lock.yaml',
      ])
      await fs.copyFile(
        repo('fixtures/npm/next/package-lock.json'),
        path.join(root, 'package-lock.json'),
      )
      const file = path.join(root, 'package.json')
      const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
      pkg.packageManager = 'npm@11.19.0'
      await fs.writeFile(file, JSON.stringify(pkg, null, 2) + '\n')
      await exec('npm', ['ci', '--ignore-scripts'], root)
    }
    // The fixtures import ./scenario and index.css, which the consumer matrix
    // supplies; give the eval app a plain, Ombelle-free version of both.
    await fs.writeFile(
      path.join(root, 'src/index.css'),
      '@import "tailwindcss";' + String.fromCharCode(10),
    )
    await fs.writeFile(path.join(root, 'src/scenario.tsx'), plainApp)
    await fs.copyFile(
      repo('packages/catalog/src/presets/flat.json'),
      path.join(root, 'brand.preset.json'),
    )
    for (const [name, text] of Object.entries(options.files ?? {})) {
      await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true })
      await fs.writeFile(path.join(root, name), text)
    }
    if (setup === 'edited-button') {
      const file = path.join(root, 'src/components/ui/button.tsx')
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, handWrittenButton)
    }
    if (setup === 'initialized') {
      const run = async (args: string[]) => {
        const result = await runBuiltCli('node', args, root)
        if (result.code !== 0)
          throw new Error('CLI ' + args.join(' ') + ' failed: ' + result.output)
      }
      await run(['init', '--preset', 'brand.preset.json', '--yes', '--json'])
      for (const component of options.components ?? [])
        await run(['add', component, '--yes', '--json'])
    }
    return root
  } catch (error) {
    await fs.rm(root, { recursive: true, force: true })
    throw error
  }
}

/** Task-aware wrapper: adds new.preset.json (minimalist) for switch-theme and a button for check-install. */
export async function prepareTaskProject(task: EvalTask): Promise<string> {
  const options: EvalProjectOptions = {}
  if (task.id === 'switch-theme')
    options.files = {
      'new.preset.json': await fs.readFile(
        repo('packages/catalog/src/presets/minimalist.json'),
        'utf8',
      ),
    }
  if (task.id === 'check-install') options.components = ['button']
  return prepareEvalProject(task.project, task.setup, options)
}
