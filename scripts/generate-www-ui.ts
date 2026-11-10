// Compiles the catalog components the website editor uses, once per build (build-hosted-www.mjs
// and predev), into apps/www/src/generated/ui. Pages load the compiled source like any other code;
// nothing compiles at request time. The site's own tokens in apps/www/src/app/globals.css style them.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { compile } from '@ombelle/compiler'

export const wwwUiComponents = ['slider', 'toggle-group', 'chip'] as const

const repo = fileURLToPath(new URL('../', import.meta.url))

export async function generateWwwUi(outDir = path.join(repo, 'apps/www/src/generated/ui')): Promise<void> {
  const preset = JSON.parse(await fs.readFile(path.join(repo, 'packages/catalog/src/presets/ombelle.json'), 'utf8'))
  const result = await compile({ preset, componentIds: [...wwwUiComponents], catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  await fs.rm(outDir, { recursive: true, force: true })
  for (const artifact of result.artifacts) {
    // Only the components, their stylesheets and their helper: the site keeps its own tokens and family stylesheet.
    if (!artifact.logicalPath.startsWith('components/ui/') && artifact.logicalPath !== 'lib/utils.ts') continue
    const dest = path.join(outDir, artifact.logicalPath)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.writeFile(dest, artifact.content.replaceAll('@/lib/utils', '../../lib/utils'))
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await generateWwwUi()
