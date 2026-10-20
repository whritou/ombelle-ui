import fs from 'node:fs/promises'
import { createProject } from './projects.js'
export async function createNpmProject(kind: 'vite' | 'next') {
  const root = await createProject(kind)
  await fs.rm(root + '/pnpm-lock.yaml')
  const pkg = JSON.parse(await fs.readFile(root + '/package.json', 'utf8'))
  pkg.packageManager = 'npm@11.19.0'
  pkg.scripts = {
    preinstall:
      "node -e \"require('fs').writeFileSync('lifecycle-ran','bad')\"",
  }
  await fs.writeFile(root + '/package.json', JSON.stringify(pkg))
  await fs.writeFile(
    root + '/package-lock.json',
    JSON.stringify({
      name: pkg.name,
      version: pkg.version,
      lockfileVersion: 3,
      requires: true,
      packages: {
        '': {
          name: pkg.name,
          version: pkg.version,
          dependencies: pkg.dependencies,
        },
      },
    }),
  )
  return root
}
