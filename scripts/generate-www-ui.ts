// Compiles the catalog components the website editor uses into apps/www/src/generated/ui, once per
// `pnpm generate:preview` (which predev, the hosted build and the CI gate run). Pages load the compiled source like any other code;
// nothing compiles at request time. The site's own tokens in apps/www/src/app/globals.css style them.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { compile } from '@ombelle/compiler'

export const wwwUiComponents = ['slider', 'toggle-group', 'chip', 'combobox', 'command', 'button', 'toggle', 'collapsible', 'scroll-area', 'button-group', 'number-input', 'color-picker', 'code-block', 'switch', 'checkbox', 'field', 'dialog', 'alert-dialog', 'breadcrumb', 'toolbar'] as const

const wwwUtils = `import { clsx, type ClassValue } from 'clsx'
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
`

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
    // The site styles these components with their stylesheets and passes no conflicting Tailwind utilities, so it needs no tailwind-merge (about 9 kB gzip).
    const content = artifact.logicalPath === 'lib/utils.ts' ? wwwUtils : artifact.content.replaceAll('@/lib/utils', '../../lib/utils')
    await fs.writeFile(dest, content)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await generateWwwUi()
