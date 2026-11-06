import fs from 'node:fs/promises'
import path from 'node:path'
import net from 'node:net'
import { execFile, spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { compileComponentRecipe, componentRecipeExportName } from '@ombelle/compiler'
import type { ComponentRecipe } from '@ombelle/contracts'
import { managerEntry } from '../../packages/cli/src/apply/manager.js'
import { createProject } from './projects.js'
import { runBuiltCli } from './cli-runtime.js'

const execute = promisify(execFile)

export async function withCatalogRecipeConsumer<T>(framework: 'vite' | 'next', recipes: readonly ComponentRecipe[],
  work: (url: string) => Promise<T>): Promise<T> {
  const root = await createProject(framework)
  let server: ChildProcess | undefined
  try {
    await fs.cp(path.resolve('fixtures', framework), root, { recursive: true })
    await fs.rm(path.join(root, 'pnpm-lock.yaml'), { force: true })
    await fs.copyFile(path.resolve('fixtures/npm', framework, 'package-lock.json'), path.join(root, 'package-lock.json'))
    const manifest = path.join(root, 'package.json')
    const pkg = JSON.parse(await fs.readFile(manifest, 'utf8'))
    pkg.packageManager = 'npm@11.19.0'
    await fs.writeFile(manifest, JSON.stringify(pkg))
    const npm = await managerEntry('npm')
    const run = (entry: string, args: string[]) => execute(process.execPath, [entry, ...args], {
      cwd: root, windowsHide: true, timeout: 120_000,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    })
    await run(npm, ['ci', '--ignore-scripts', '--no-audit', '--no-fund'])
    const compiled = await Promise.all(recipes.map(recipe => compileComponentRecipe({ recipe })))
    const missing = new Map<string, string>()
    for (const result of compiled) for (const dependency of result.dependencies)
      if (pkg.dependencies[dependency.name] !== dependency.version) missing.set(dependency.name, dependency.version)
    if (missing.size) await run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--save-exact',
      ...[...missing].map(([name, version]) => `${name}@${version}`)])
    const cliEnv = { NO_COLOR: undefined, FORCE_COLOR: undefined }
    const cli = async (...args: string[]) => {
      const result = await runBuiltCli('node', [...args, '--yes', '--json'], root, cliEnv)
      if (result.code !== 0) throw new Error(result.output)
    }
    await cli('init', '--preset', path.resolve('packages/catalog/src/presets/flat.json'))
    await cli('add', 'badge', 'popover')
    for (const recipe of recipes) {
      const file = path.join(root, 'recipe.json')
      await fs.writeFile(file, JSON.stringify(recipe))
      await cli('add', '--recipe', file)
    }
    const imports = recipes.map((recipe, index) =>
      `import { ${componentRecipeExportName(recipe.component)} as Recipe${index} } from '@/components/ui/recipes/${recipe.id}/r${recipe.revision}/${recipe.component}'`)
    const entries = recipes.map((recipe, index) => `${JSON.stringify(recipe.id)}: Recipe${index}`)
    const glass = recipes.flatMap((recipe, index) => recipe.id.startsWith('glass_popover_') ? [`<Recipe${index} />`] : [])
    await fs.writeFile(path.join(root, 'src/recipe-stage.tsx'), `'use client'
import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
${imports.join('\n')}
const recipes: Record<string, React.ComponentType> = { ${entries.join(', ')} }
export default function Stage() {
  const [id, setId] = React.useState('')
  React.useEffect(() => {
    const search = new URLSearchParams(location.search)
    document.documentElement.classList.toggle('dark', search.get('mode') === 'dark')
    setId(search.get('recipe') ?? '')
  }, [])
  const Recipe = recipes[id]
  return <main data-ready={Boolean(id)}>
    <Badge>Ordinary badge</Badge>
    {id === 'glass-isolation' && <><Popover><PopoverTrigger>Ordinary popover</PopoverTrigger><PopoverContent>Ordinary content</PopoverContent></Popover>${glass.join('')}</>}
    {Recipe && <div style={{ boxSizing: 'border-box', minHeight: '100vh', display: 'flex',
      justifyContent: 'center', alignItems: 'center', padding: '2rem' }}><Recipe /></div>}
  </main>
}
`)
    if (framework === 'vite') await fs.writeFile(path.join(root, 'src/main.tsx'), `import * as React from 'react'
import { createRoot } from 'react-dom/client'
import Stage from './recipe-stage'
import './index.css'
createRoot(document.getElementById('root')!).render(<Stage />)
`)
    else await fs.writeFile(path.join(root, 'src/app/page.tsx'), "export { default } from '../recipe-stage'\n")
    const binary = path.join(root, framework === 'vite' ? 'node_modules/vite/bin/vite.js' : 'node_modules/next/dist/bin/next')
    await run(binary, ['build'])
    const port = await new Promise<number>((resolve, reject) => {
      const socket = net.createServer().once('error', reject).listen(0, '127.0.0.1', () => {
        const { port } = socket.address() as net.AddressInfo
        socket.close(() => resolve(port))
      })
    })
    const url = `http://127.0.0.1:${port}`
    server = spawn(process.execPath, [binary, framework === 'vite' ? 'preview' : 'start',
      framework === 'vite' ? '--host' : '--hostname', '127.0.0.1', '--port', String(port)],
    { cwd: root, windowsHide: true, stdio: 'ignore' })
    const deadline = Date.now() + 30_000
    for (;;) {
      if (Date.now() > deadline || server.exitCode !== null) throw new Error('Catalog consumer failed to start')
      try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) break } catch { /* wait */ }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return await work(url)
  } finally {
    if (server?.pid && server.exitCode === null) {
      if (process.platform === 'win32')
        spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
      else server.kill()
    }
    await fs.rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 200 })
  }
}
