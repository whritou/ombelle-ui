import fs from 'node:fs/promises'
import path from 'node:path'
import type { Options, ProjectSpec } from './model.js'
export const projectPath = (o: Options, s: ProjectSpec) =>
  path.join(o.root, 'projects', s.id)
export const baselinePath = (o: Options, s: ProjectSpec) =>
  path.join(o.root, 'baselines', s.id)
const marker = '.ombelle-playground.json'
export async function assertRoot(root: string) {
  // Reject symlinks/junctions in all existing ancestors, including on Windows.
  let at = path.resolve(root)
  for (;;) {
    try {
      if ((await fs.lstat(at)).isSymbolicLink())
        throw Error('Refusing symlink root: ' + at)
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
    const parent = path.dirname(at)
    if (parent === at) break
    at = parent
  }
}
export async function assertOwned(o: Options, s: ProjectSpec) {
  const dir = projectPath(o, s)
  await assertRoot(dir)
  const real = await fs.realpath(dir),
    parent = await fs.realpath(path.join(o.root, 'projects'))
  if (path.dirname(real) !== parent || path.basename(real) !== s.id)
    throw Error('Invalid project containment')
  const m = JSON.parse(await fs.readFile(path.join(dir, marker), 'utf8'))
  if (
    m.version !== 1 ||
    m.repo !== o.repo ||
    m.id !== s.id ||
    m.root !== path.resolve(dir)
  )
    throw Error('Invalid playground ownership')
}
export async function scaffold(o: Options, s: ProjectSpec) {
  const dir = projectPath(o, s)
  await assertRoot(dir)
  await fs.mkdir(path.dirname(dir), { recursive: true })
  await fs.mkdir(dir)
  await fs.writeFile(
    path.join(dir, marker),
    JSON.stringify(
      { version: 1, repo: o.repo, id: s.id, root: path.resolve(dir) },
      null,
      2,
    ),
  )
  await fs.cp(
    path.join(
      o.repo,
      'fixtures',
      ...(s.shadcn ? ['shadcn', s.framework] : [s.framework]),
    ),
    dir,
    {
      recursive: true,
      filter: (source) =>
        !['node_modules', '.git', '.next', 'dist'].includes(
          path.basename(source),
        ),
    },
  )
  const pkgFile = path.join(dir, 'package.json'),
    pkg = JSON.parse(await fs.readFile(pkgFile, 'utf8'))
  pkg.name = 'ombelle-playground-' + s.id
  pkg.packageManager = 'pnpm@11.25.0'
  pkg.dependencies.react = pkg.dependencies['react-dom'] = '19.3.1'
  if (!s.shadcn) {
    for (const name of Object.keys(pkg.dependencies))
      if (!['react', 'react-dom', 'next'].includes(name))
        delete pkg.dependencies[name]
    await fs.writeFile(
      path.join(dir, 'src/index.css'),
      '@import "tailwindcss";\n',
    )
    if (s.framework === 'vite')
      await fs.writeFile(
        path.join(dir, 'src/main.tsx'),
        "import {createRoot} from 'react-dom/client'\nimport App from './App'\nimport './index.css'\ncreateRoot(document.getElementById('root')!).render(<App/>)\n",
      )
    const entry = s.framework === 'next' ? 'src/app/page.tsx' : 'src/App.tsx'
    await fs.writeFile(
      path.join(dir, entry),
      'export default function Page(){return <main>Fresh playground baseline</main>}\n',
    )
  }
  if (s.shadcn && s.framework === 'next')
    await fs.writeFile(
      path.join(dir, 'app/layout.tsx'),
      "import type {ReactNode} from 'react'\nimport './globals.css'\nimport {ThemeProvider} from '@/components/theme-provider'\nexport default function RootLayout({children}:{children:ReactNode}){return <html lang='en' suppressHydrationWarning><body><ThemeProvider>{children}</ThemeProvider></body></html>}\n",
    )
  pkg.scripts = {
    ...pkg.scripts,
    dev: s.framework + ' dev',
    build: s.framework + ' build',
  }
  if (s.framework === 'vite') pkg.scripts.dev = 'vite --host 127.0.0.1'
  await fs.writeFile(pkgFile, JSON.stringify(pkg, null, 2) + '\n')
  await fs.writeFile(path.join(dir, 'pnpm-workspace.yaml'), 'packages: []\n')
}
export async function cleanOwned(o: Options, s: ProjectSpec) {
  await assertOwned(o, s)
  await fs.rm(projectPath(o, s), { recursive: true })
}
