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
it('rejects an npm-only app rather than converting its manager', async () => {
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
  ['19.2.0', '19.2.0'],
  ['19.3.1', '19.2.0'],
  ['^19.3.1', '^19.3.1'],
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
