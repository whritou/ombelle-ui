// Prepares browser-testable Base UI consumers from the genuine shadcn base-nova
// fixtures: pin React as documented, theme add, add every component (keeping
// shadcn's own button.tsx with --beside), then build the app for production.
// Needs registry access and pnpm 11.25.0 on PATH. Writes
// .artifacts/base-consumers.json for tests/e2e/base-consumers.spec.ts.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { supportedComponentIds } from '@ombelle/contracts'

export const baseConsumers = [
  { id: 'pnpm-vite-base', fixture: 'vite-base', framework: 'vite', source: 'src', port: 4301 },
  { id: 'pnpm-next-base', fixture: 'next-base', framework: 'next', source: '.', port: 4302 },
] as const

const run = (command: string, args: string[], cwd: string) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: process.platform === 'win32', windowsHide: true })
    let output = ''
    child.stdout.on('data', (c) => (output += c))
    child.stderr.on('data', (c) => (output += c))
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0 ? resolve(output) : reject(new Error(command + ' ' + args.join(' ') + ' failed\n' + output)),
    )
  })

// A page with every component example, shadcn's own Button and the beside one.
function page(framework: 'vite' | 'next') {
  const examples = supportedComponentIds.map(
    (id, i) => "import { Example as E" + i + " } from '@/ombelle-examples/" + id + "'",
  )
  return [
    framework === 'next' ? "'use client'" : '',
    "import { Button as ShadcnButton } from '@/components/ui/button'",
    "import { Button as OmbelleButton } from '@/components/ui/ombelle/button'",
    ...examples,
    '',
    (framework === 'next' ? 'export default function Page' : 'export default function App') + '() {',
    '  return (',
    '    <main data-ready="true">',
    '      <section data-check="buttons">',
    '        <ShadcnButton data-check="shadcn-button">shadcn</ShadcnButton>',
    '        <OmbelleButton data-check="ombelle-button">Ombelle</OmbelleButton>',
    '      </section>',
    ...supportedComponentIds.map(
      (id, i) => '      <section data-component="' + id + '"><E' + i + ' /></section>',
    ),
    '    </main>',
    '  )',
    '}',
    '',
  ].join('\n')
}

export async function prepareBaseConsumer(spec: (typeof baseConsumers)[number]) {
  const repo = process.cwd()
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-' + spec.id + '-'))
  await fs.cp(path.join(repo, 'fixtures/shadcn', spec.fixture), root, { recursive: true })
  await fs.writeFile(
    path.join(root, '.ombelle-fixture.json'),
    JSON.stringify({ owner: repo, framework: spec.framework, edition: 'base' }),
  )
  // The documented baseline: exact React declarations (the Vite template uses ^19.3.1).
  const pkgPath = path.join(root, 'package.json')
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'))
  pkg.dependencies.react = pkg.dependencies['react-dom'] = '19.3.1'
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  await run('pnpm', ['install', '--ignore-scripts', '--no-frozen-lockfile'], root)
  const cli = (args: string[]) =>
    run(process.execPath, [path.join(repo, 'packages/cli/dist/main.js'), ...args, '--yes', '--json'], root)
  await cli(['theme', 'add', path.join(repo, 'packages/catalog/src/presets/flat.json')])
  const button = path.posix.join(spec.source, 'components/ui/button.tsx')
  await cli(['add', ...supportedComponentIds, '--beside', button])
  const entry = spec.framework === 'next' ? 'app/page.tsx' : 'src/App.tsx'
  await fs.writeFile(path.join(root, entry), page(spec.framework))
  await run('pnpm', ['exec', spec.framework === 'next' ? 'next' : 'vite', 'build'], root)
  return { ...spec, root }
}

if (import.meta.url === 'file:///' + path.resolve(process.argv[1] ?? '').replaceAll('\\', '/') ||
    import.meta.url === 'file://' + path.resolve(process.argv[1] ?? '')) {
  const rows = []
  for (const spec of baseConsumers) {
    console.log('Preparing ' + spec.id)
    rows.push(await prepareBaseConsumer(spec))
  }
  await fs.mkdir('.artifacts', { recursive: true })
  await fs.writeFile('.artifacts/base-consumers.json', JSON.stringify(rows, null, 2) + '\n')
}
