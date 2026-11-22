import { it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createProject } from '../../../tests/helpers/projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { safePath } from '../src/project/paths.js'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
it.each(['vite', 'next'] as const)(
  'detects %s without writes',
  async (kind) => {
    const root = await createProject(kind)
    roots.push(root)
    const context = await inspectProject(root)
    expect(context.framework).toBe(kind)
    expect(context.componentsDir.replaceAll('\\\\', '/')).toBe(
      'src/components/ui',
    )
    expect(context.manager).toBe('pnpm')
  },
)
it.each(['package-lock.json', 'yarn.lock'])(
  'rejects conflicting manager evidence %s',
  async (file) => {
    const root = await createProject('vite')
    roots.push(root)
    await fs.writeFile(path.join(root, file), '{}')
    await expect(inspectProject(root)).rejects.toMatchObject({
      code: 'UNSUPPORTED_PROJECT',
    })
  },
)
it('rejects an npm app missing the required ReactDOM baseline', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await fs.rm(root + '/pnpm-lock.yaml')
  await fs.writeFile(
    root + '/package.json',
    JSON.stringify({
      packageManager: 'npm@11.0.0',
      dependencies: { vite: '8.3.4', react: '19.3.1', tailwindcss: '4.3.3' },
    }),
  )
  await expect(inspectProject(root)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})
it('rejects ambiguous aliases and missing CSS', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await fs.writeFile(
    root + '/tsconfig.json',
    JSON.stringify({
      compilerOptions: { paths: { '@/*': ['./src/*', './other/*'] } },
    }),
  )
  await expect(inspectProject(root)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
  await fs.writeFile(
    root + '/tsconfig.json',
    JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }),
  )
  await fs.rm(root + '/src/index.css')
  await expect(inspectProject(root)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})
it.each([
  '../outside',
  '..\\\\outside',
  'C:\\\\outside',
  '/outside',
  'src/../../outside',
])('rejects escaping path %s', async (relative) => {
  const root = await createProject('vite')
  roots.push(root)
  await expect(safePath(root, relative)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})
it('rejects a junction escaping the app', async () => {
  const root = await createProject('vite'),
    outside = await createProject('vite')
  roots.push(root, outside)
  await fs.symlink(
    outside,
    root + '/escape',
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  await expect(safePath(root, 'escape/test.ts')).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})

it.each([
  ['18.3.1', '18.3.1'],
  ['^18.3.1', '^19.3.1'],
  ['19.3.1', '^20.0.0'],
  ['>=19.0.0 <21', '19.3.1'],
  ['latest', '19.3.1'],
  ['19.0.0-rc.1', '19.0.0-rc.1'],
  ['19.3.1', undefined],
])(
  'rejects unsupported React pair %s / %s without writes',
  async (react, dom) => {
    const root = await createProject('vite')
    roots.push(root)
    const file = root + '/package.json'
    const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
    pkg.dependencies.react = react
    pkg.dependencies['react-dom'] = dom
    const before = JSON.stringify(pkg)
    await fs.writeFile(file, before)
    await expect(inspectProject(root)).rejects.toMatchObject({
      code: 'UNSUPPORTED_PROJECT',
    })
    expect(await fs.readFile(file, 'utf8')).toBe(before)
  },
)
it('rejects component destinations inconsistent with the import alias', async () => {
  const root = await createProject('vite')
  roots.push(root)
  await fs.writeFile(
    root + '/ui-library.config.json',
    JSON.stringify({
      configVersion: 1,
      platform: 'react-web',
      language: 'tsx',
      presetFile: './ui-preset.json',
      lockFile: './ui-library.lock.json',
      theme: { strategy: 'merge', cssEntry: 'src/index.css' },
      paths: {
        components: 'src/widgets',
        styleOutput: 'src/styles/ui-style.css',
      },
    }),
  )
  await expect(inspectProject(root)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
  })
})
// shadcn init templates declare the bare major range "^4".
it.each([
  ['^4', true],
  ['~4.3', true],
  ['4', true],
  ['^3', false],
  ['^3.4.17', false],
  ['^40', false],
])('reads tailwindcss %s as Tailwind v4: %s', async (range, supported) => {
  const root = await createProject('vite')
  roots.push(root)
  const file = root + '/package.json'
  const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
  pkg.dependencies.tailwindcss = range
  await fs.writeFile(file, JSON.stringify(pkg))
  const result = inspectProject(root)
  if (supported) await expect(result).resolves.toMatchObject({ framework: 'vite' })
  else
    await expect(result).rejects.toMatchObject({
      code: 'UNSUPPORTED_PROJECT',
      message: 'Support is limited to React Vite/Next with Tailwind v4',
    })
})

// INS-01: the declarations create-vite (^19.3.1), create-next-app (19.3.0) and shadcn's Vite template
// (^19.3.1) write today, plus the other React 19 forms package managers write.
it.each([
  ['^19.3.1', '^19.3.1'],
  ['19.3.0', '19.3.0'],
  ['19.2.0', '19.2.0'],
  ['~19.3.1', '~19.3.1'],
  ['19.x', '^19'],
  ['>=19.0.0 <20', '19.3.1'],
  ['19.3.0-canary-a1b2c3', '19.3.0-canary-a1b2c3'],
])('accepts the React 19 declaration %s / %s', async (react, dom) => {
  const root = await createProject('vite')
  roots.push(root)
  const file = root + '/package.json'
  const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
  pkg.dependencies.react = react
  pkg.dependencies['react-dom'] = dom
  await fs.writeFile(file, JSON.stringify(pkg))
  await expect(inspectProject(root)).resolves.toMatchObject({ framework: 'vite' })
})
it('names the declaration and the React 19 requirement when refusing React 18', async () => {
  const root = await createProject('next')
  roots.push(root)
  const file = root + '/package.json'
  const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
  pkg.dependencies.react = pkg.dependencies['react-dom'] = '^18.3.1'
  await fs.writeFile(file, JSON.stringify(pkg))
  await expect(inspectProject(root)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
    message: expect.stringMatching(/react "\^18\.3\.1" is not supported; Ombelle components need React 19/),
    nextAction: expect.stringMatching(/React 19/),
  })
})
it('refuses an installed React outside 19 even when the declaration is a React 19 range', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const file = root + '/package.json'
  const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
  pkg.dependencies.react = pkg.dependencies['react-dom'] = '^19.3.1'
  await fs.writeFile(file, JSON.stringify(pkg))
  await fs.mkdir(root + '/node_modules/react', { recursive: true })
  await fs.writeFile(root + '/node_modules/react/package.json', JSON.stringify({ name: 'react', version: '18.3.1' }))
  await expect(inspectProject(root)).rejects.toMatchObject({
    code: 'UNSUPPORTED_PROJECT',
    message: expect.stringMatching(/Installed react 18\.3\.1 is not React 19/),
  })
  await fs.writeFile(root + '/node_modules/react/package.json', JSON.stringify({ name: 'react', version: '19.3.2' }))
  await expect(inspectProject(root)).resolves.toMatchObject({ framework: 'vite' })
})
