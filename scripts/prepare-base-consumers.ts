// Prepares browser-testable consumers that install the whole catalog, one Vite and one Next app per
// edition, from the genuine shadcn fixtures (radix-nova and base-nova): pin React as documented, theme
// add, add every component with the built CLI (keeping shadcn's own button.tsx with --beside), then
// build the app for production. Part of the Foundation gate (TST-13): the ordinary consumer matrix
// installs 12 components, Radix only.
// Needs registry access and pnpm 11.25.0 on PATH. Writes
// .artifacts/base-consumers.json for tests/e2e/base-consumers.spec.ts.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { supportedBlockIds, supportedComponentIds } from '@ombelle/contracts'

export const baseConsumers = [
  { id: 'pnpm-vite-radix', fixture: 'vite', edition: 'radix', framework: 'vite', source: 'src', port: 4303 },
  { id: 'pnpm-next-radix', fixture: 'next', edition: 'radix', framework: 'next', source: '.', port: 4304 },
  { id: 'pnpm-vite-base', fixture: 'vite-base', edition: 'base', framework: 'vite', source: 'src', port: 4301 },
  { id: 'pnpm-next-base', fixture: 'next-base', edition: 'base', framework: 'next', source: '.', port: 4302 },
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

/** The blocks every Base UI consumer installs and renders, each with its exported function. */
export const baseConsumerBlocks = supportedBlockIds
const blockExports: Record<(typeof supportedBlockIds)[number], string> = {
  'login-01': 'Login01', 'settings-01': 'Settings01', 'pricing-01': 'Pricing01', 'dashboard-01': 'Dashboard01',
}

// A page with every component example, every block, shadcn's own Button and the beside one.
export function baseConsumerPage(framework: 'vite' | 'next') {
  const examples = supportedComponentIds.map(
    (id, i) => "import { Example as E" + i + " } from '@/ombelle-examples/" + id + "'",
  )
  return [
    framework === 'next' ? "'use client'" : '',
    "import { Button as ShadcnButton } from '@/components/ui/button'",
    "import { Button as OmbelleButton } from '@/components/ui/ombelle/button'",
    ...examples,
    ...baseConsumerBlocks.map((id) => "import { " + blockExports[id] + " } from '@/components/blocks/" + id + "'"),
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
    ...baseConsumerBlocks.map((id) => '      <div data-block-check="' + id + '"><' + blockExports[id] + ' /></div>'),
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
    JSON.stringify({ owner: repo, framework: spec.framework, edition: spec.edition }),
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
  await cli(['add', ...supportedComponentIds, ...baseConsumerBlocks, '--beside', button])
  const entry = spec.framework === 'next' ? 'app/page.tsx' : 'src/App.tsx'
  await fs.writeFile(path.join(root, entry), baseConsumerPage(spec.framework))
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
