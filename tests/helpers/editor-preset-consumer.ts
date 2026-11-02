import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import net from 'node:net'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { canonicalize, compile, compileRecipe, recipeImportAlias, rewriteModuleSpecifiers, verifyRecipeSnapshot } from '@ombelle/compiler'
import {
  supportedComponentIds,
  type StyleFamily,
  type CompileResult,
} from '@ombelle/contracts'
import type { SnapshotSource } from '@ombelle/contracts'
import type { RecipeSnapshot } from '@ombelle/contracts'
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
  input: ({
    framework: 'vite' | 'next'
    family: StyleFamily
    presetJson: string
  } | { framework: 'vite' | 'next'; family: StyleFamily; kind: 'snapshot'; source: SnapshotSource; scope?: 'theme' | 'button' }) & { recipeSnapshot?: { snapshot: RecipeSnapshot; origin: string } },
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
    const snapshot = 'kind' in input && input.kind === 'snapshot'
    const file = path.join(root, 'downloaded-preset.json')
    if ('presetJson' in input) await fs.writeFile(file, input.presetJson)
    const source = snapshot ? input.source : null
    const selectedPreset = 'presetJson' in input ? JSON.parse(input.presetJson) : null
    const prefix = source
      ? ['--snapshot-origin', source.origin, '--preset-hash', source.presetHash]
      : []
    const scope = snapshot ? input.scope ?? 'theme' : 'theme'
    const applyArgs = source
      ? scope === 'button'
        ? ['add', 'button', '--preset', source.reference, ...prefix]
        : ['theme', 'add', source.reference, ...prefix]
      : ['theme', 'add', file]
    const ordinaryAdditions = scope === 'button'
      ? supportedComponentIds.filter((id) => id !== 'button')
      : supportedComponentIds
    const cliEnv = { ...process.env }
    cliEnv.NO_COLOR = undefined
    cliEnv.FORCE_COLOR = undefined
    const recipeInput = input.recipeSnapshot
    if (recipeInput) await verifyRecipeSnapshot(recipeInput.snapshot)
    const actions = [applyArgs, ...(recipeInput ? [[
      'add', '--recipe', recipeInput.snapshot.id + '@1', '--snapshot-origin', recipeInput.origin,
      '--recipe-hash', recipeInput.snapshot.recipeHash,
    ]] : []), ['add', ...ordinaryAdditions]]
    let savedDefaults: string | undefined, hostSource: string | undefined
    for (const [index, args] of actions.entries()) {
      if (recipeInput && index === 1) {
        savedDefaults = await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8')
        hostSource = await fs.readFile(path.join(root, 'src/components/ui/button.tsx'), 'utf8')
      }
      const applied = await runBuiltCli(
        'node',
        [...args, '--yes', '--json'],
        root,
        cliEnv,
      )
      if (applied.code !== 0) throw new Error(applied.output)
    }
    if (recipeInput && (savedDefaults !== await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8') ||
      hostSource !== await fs.readFile(path.join(root, 'src/components/ui/button.tsx'), 'utf8')))
      throw new Error('Published recipe changed saved defaults or the host Button.')
    if (recipeInput) {
      const snapshot = recipeInput.snapshot
      const compiled = await compileRecipe({ recipe: snapshot.recipe })
      const lock = JSON.parse(await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'))
      const key = snapshot.recipe.id + '@' + snapshot.recipe.revision
      if (lock.recipeSources?.[key]?.recipeHash !== snapshot.recipeHash ||
        lock.recipeSources[key].reference !== snapshot.id + '@1' ||
        canonicalize(lock.recipes?.[key]?.recipe.data) !== canonicalize(snapshot.recipe))
        throw new Error('Installed recipe bytes/provenance differ from the publication.')
      for (const artifact of compiled.artifacts.filter(item => ['component', 'style'].includes(item.kind))) {
        const expected = artifact.kind === 'style' ? artifact.content : await rewriteModuleSpecifiers(artifact.content, specifier => recipeImportAlias(specifier, '@/lib/utils', '@/components/ui'))
        const actual = await fs.readFile(path.join(root, 'src/components/ui', artifact.logicalPath), 'utf8')
        if (actual !== expected) throw new Error('Installed recipe artifact differs from compiler bytes: ' + artifact.logicalPath)
      }
    }
    const installedPreset = source
      ? JSON.parse(await fs.readFile(path.join(root, 'ui-preset.json'), 'utf8'))
      : selectedPreset
    const result = await compile({
      preset: installedPreset,
      componentIds: supportedComponentIds,
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    if (source && scope === 'theme' && result.preset.hash !== source.presetHash)
      throw new Error('Installed snapshot hash does not match the published preset.')
    if (source && scope === 'button') {
      const lock = JSON.parse(await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'))
      const installedEntry = Object.entries(lock.componentPresetSources ?? {}).find(([, entry]) => (entry as SnapshotSource).presetHash === source.presetHash)
      if (!installedEntry)
        throw new Error('Installed scoped snapshot hash does not match the published preset.')
      const [identity] = installedEntry
      const beforeButton = await fs.readFile(path.join(prepared.root, 'src/components/ui/button.tsx'), 'utf8')
      const [presetId, revision] = identity.split('@')
      const fixture = `import {Button as HostButton} from '@/components/ui/button'\nimport {Button as ScopedButton} from '@/components/ui/presets/${presetId}/r${revision}/button'\nexport default function SnapshotScope(){return <main><HostButton data-testid="global-host-button">Host action</HostButton><ScopedButton data-testid="published-scope-button">Published action</ScopedButton></main>}`
      if (input.framework === 'vite') await fs.writeFile(path.join(root, 'src/main.tsx'), `import * as React from 'react'\nimport {createRoot} from 'react-dom/client'\nimport SnapshotScope from './snapshot-scope'\nimport './index.css'\ncreateRoot(document.getElementById('root')!).render(<SnapshotScope/>)\n`)
      else await fs.writeFile(path.join(root, 'src/app/page.tsx'), `import SnapshotScope from '../snapshot-scope'\nexport default function Page(){return <SnapshotScope/>}`)
      await fs.writeFile(path.join(root, 'src/snapshot-scope.tsx'), fixture)
      if (await fs.readFile(path.join(root, 'src/components/ui/button.tsx'), 'utf8') !== beforeButton)
        throw new Error('Scoped snapshot changed the differently themed host Button.')
    }
    if (recipeInput) {
      const item = recipeInput.snapshot.recipe
      const fixture = `import {Button as HostButton} from '@/components/ui/button'\nimport {RecipeButton} from '@/components/ui/recipes/${item.id}/r${item.revision}/button'\nexport default function RecipeScope(){return <main><HostButton data-testid="global-host-button">Host action</HostButton><RecipeButton data-testid="published-recipe-button" {...${JSON.stringify(item.props)}}>${'{' + JSON.stringify(item.content) + '}'}</RecipeButton></main>}`
      await fs.writeFile(path.join(root, 'src/recipe-scope.tsx'), fixture)
      if (input.framework === 'vite') await fs.writeFile(path.join(root, 'src/main.tsx'), "import * as React from 'react'\nimport {createRoot} from 'react-dom/client'\nimport RecipeScope from './recipe-scope'\nimport './index.css'\ncreateRoot(document.getElementById('root')!).render(<RecipeScope/>)\n")
      else await fs.writeFile(path.join(root, 'src/app/page.tsx'), "import RecipeScope from '../recipe-scope'\nexport default function Page(){return <RecipeScope/>}")
    }
    const gallery = !recipeInput && !(snapshot && scope === 'button')
    const fixture = await fs.readFile(
      new URL('../../fixtures/shared/preset-gallery.tsx', import.meta.url), 'utf8',
    )
    if (gallery) await fs.writeFile(
      path.join(root, 'src/preset-gallery.tsx'), await rewriteModuleSpecifiers(fixture, (s) => s),
    )
    await fs.appendFile(
      path.join(root, 'src/index.css'),
      '\n' +
        (await fs.readFile(
          new URL('../../fixtures/shared/preset-gallery.css', import.meta.url),
          'utf8',
        )),
    )
    if (gallery && input.framework === 'vite')
      await fs.writeFile(
        path.join(root, 'src/main.tsx'),
        "import * as React from 'react'\nimport {createRoot} from 'react-dom/client'\nimport {PresetGallery} from './preset-gallery'\nimport './index.css'\ncreateRoot(document.getElementById('root')!).render(<PresetGallery/>)\n",
      )
    else if (gallery)
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
