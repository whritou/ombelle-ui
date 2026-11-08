import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import type { Artifact } from '@ombelle/contracts'

/** Check distributed source with the unused-binding checks enabled by create-vite. */
export async function checkGeneratedTypes(artifacts: readonly Artifact[]) {
  // Nest below the catalog so the generated files resolve its real dependencies.
  const artifactsRoot = path.resolve('packages/catalog/.artifacts')
  await fs.mkdir(artifactsRoot, { recursive: true })
  const root = await fs.mkdtemp(path.join(artifactsRoot, 'generated-types-'))
  try {
    for (const artifact of artifacts.filter(item => ['component', 'utility'].includes(item.kind))) {
      const file = path.join(root, artifact.logicalPath)
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, artifact.content)
    }
    await fs.writeFile(path.join(root, 'styles.d.ts'), "declare module '*.css' {}\n")
    await fs.writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2023', lib: ['ES2023', 'DOM'], module: 'ESNext',
        moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true,
        skipLibCheck: true, noEmit: true, noUnusedLocals: true,
        noUnusedParameters: true, verbatimModuleSyntax: true,
        paths: { '@/*': ['./*'] },
      },
      include: ['**/*.ts', '**/*.tsx'], exclude: ['node_modules'],
    }))
    const child = spawn(process.execPath, [path.resolve('node_modules/typescript/bin/tsc'), '--project', path.join(root, 'tsconfig.json')], {
      cwd: root, windowsHide: true,
    })
    let output = ''
    child.stdout.on('data', chunk => { output += chunk })
    child.stderr.on('data', chunk => { output += chunk })
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once('error', reject)
      child.once('close', resolve)
    })
    return { code, output }
  } finally {
    if (path.dirname(root) !== artifactsRoot) throw new Error('Invalid generated typecheck directory')
    await fs.rm(root, { recursive: true, force: true })
  }
}
