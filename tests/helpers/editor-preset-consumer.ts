import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import net from 'node:net'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { compile, rewriteModuleSpecifiers } from '@ombelle/compiler'
import {
  supportedComponentIds,
  type StyleFamily,
  type CompileResult,
} from '@ombelle/contracts'
import { managerEntry } from '../../packages/cli/src/apply/manager.js'
import { runBuiltCli } from './cli-runtime.js'

async function command(
  entry: string,
  args: string[],
  cwd: string,
  timeout = 120000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], {
      cwd,
      windowsHide: true,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    })
    let output = ''
    const timer = setTimeout(() => {
      stop(child)
      reject(
        new Error('Timed out: ' + args.join(' ') + '\n' + output.slice(-4000)),
      )
    }, timeout)
    child.stdout.on('data', (chunk) => {
      output += chunk
    })
    child.stderr.on('data', (chunk) => {
      output += chunk
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      code === 0 ? resolve(output) : reject(new Error(output.slice(-6000)))
    })
  })
}
function stop(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null) return
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    })
  else child.kill('SIGTERM')
}
async function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port
      server.close(() => resolve(port))
    })
  })
}
export async function withEditorPresetConsumer<T>(
  input: {
    framework: 'vite' | 'next'
    family: StyleFamily
    presetJson: string
  },
  work: (consumer: {
    url: string
    root: string
    result: CompileResult
  }) => Promise<T>,
): Promise<T> {
  const fixtures = JSON.parse(
    await fs.readFile(
      process.env.OMBELLE_PRESET_CONSUMER_MAP || '.artifacts/consumers.json',
      'utf8',
    ),
  ) as Record<string, { root: string }>
  const prepared = fixtures[`npm-${input.framework}-${input.family}`]
  if (!prepared?.root)
    throw new Error(
      `Prepare the npm ${input.framework}/${input.family} consumer before testing downloaded-preset parity.`,
    )
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), 'ombelle-preset-browser-'),
  )
  let server: ChildProcess | undefined
  try {
    await fs.cp(prepared.root, root, {
      recursive: true,
      filter: (source) =>
        !['node_modules', '.next', 'dist', '.git'].includes(
          path.basename(source),
        ),
    })
    const npm = await managerEntry('npm')
    if ((await command(npm, ['--version'], root)).trim() !== '11.19.0')
      throw new Error('Preset browser consumers require npm 11.19.0')
    await command(
      npm,
      ['ci', '--offline', '--ignore-scripts', '--no-audit', '--no-fund'],
      root,
    )
    const file = path.join(root, 'downloaded-preset.json')
    await fs.writeFile(file, input.presetJson)
    for (const args of [
      ['theme', 'add', file],
      ['add', ...supportedComponentIds],
    ]) {
      const applied = await runBuiltCli(
        'node',
        [...args, '--yes', '--json'],
        root,
      )
      if (applied.code !== 0) throw new Error(applied.output)
    }
    const result = await compile({
      preset: JSON.parse(input.presetJson),
      componentIds: supportedComponentIds,
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    const fixture = await fs.readFile(
      new URL('../../fixtures/shared/preset-gallery.tsx', import.meta.url),
      'utf8',
    )
    await fs.writeFile(
      path.join(root, 'src/preset-gallery.tsx'),
      await rewriteModuleSpecifiers(fixture, (s) => s),
    )
    await fs.appendFile(
      path.join(root, 'src/index.css'),
      '\n' +
        (await fs.readFile(
          new URL('../../fixtures/shared/preset-gallery.css', import.meta.url),
          'utf8',
        )),
    )
    if (input.framework === 'vite')
      await fs.writeFile(
        path.join(root, 'src/main.tsx'),
        "import * as React from 'react'\nimport {createRoot} from 'react-dom/client'\nimport {PresetGallery} from './preset-gallery'\nimport './index.css'\ncreateRoot(document.getElementById('root')!).render(<PresetGallery/>)\n",
      )
    else
      await fs.writeFile(
        path.join(root, 'src/app/page.tsx'),
        "import {PresetGallery} from '../preset-gallery'\nexport default function Page(){return <PresetGallery/>}\n",
      )
    const binary = path.join(
      root,
      input.framework === 'vite'
        ? 'node_modules/vite/bin/vite.js'
        : 'node_modules/next/dist/bin/next',
    )
    await command(binary, ['build'], root)
    const port = await availablePort(),
      url = `http://127.0.0.1:${port}`
    server = spawn(
      process.execPath,
      [
        binary,
        input.framework === 'vite' ? 'preview' : 'start',
        '--host' + (input.framework === 'vite' ? '' : 'name'),
        '127.0.0.1',
        '--port',
        String(port),
      ],
      {
        cwd: root,
        windowsHide: true,
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    let output = '',
      serverError: Error | null = null
    server.stdout?.on('data', (chunk) => {
      output += chunk
    })
    server.stderr?.on('data', (chunk) => {
      output += chunk
    })
    server.on('error', (error) => {
      serverError = error
    })
    const deadline = Date.now() + 30000
    while (true) {
      if (serverError || server.exitCode !== null || Date.now() > deadline)
        throw (
          serverError ??
          new Error('Preset consumer server failed: ' + output.slice(-4000))
        )
      try {
        if ((await fetch(url, { signal: AbortSignal.timeout(1500) })).ok) break
      } catch {
        /* Wait for the owned server. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return await work({ url, root, result })
  } finally {
    if (server) stop(server)
    await fs.rm(root, {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 250,
    })
  }
}
