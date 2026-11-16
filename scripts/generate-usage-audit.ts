import fs from 'node:fs/promises'
import path from 'node:path'
import { compile } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { styleFamilies, type ComponentId } from '@ombelle/contracts'
import { spacedExampleIds } from './playground/example-layout.js'
for (const family of styleFamilies)
  for (const edition of ['radix', 'base'] as const) {
    const result = await compile({
      preset: getCatalog('0.1.0').presets[family],
      componentIds: [
        ...new Set<ComponentId>([
          ...spacedExampleIds,
          'toast',
          'button',
          'dropdown-menu',
        ]),
      ],
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      edition,
    })
    const root = path.join(
      'apps/preview/src/generated/usage-audit',
      family + '-' + edition,
    )
    const absolute = path.resolve(root),
      allowed = path.resolve('apps/preview/src/generated/usage-audit')
    if (path.dirname(absolute) !== allowed)
      throw Error('Invalid usage audit output root')
    await fs.rm(absolute, { recursive: true, force: true })
    await fs.mkdir(root, { recursive: true })
    for (const artifact of result.artifacts) {
      const dest = path.join(root, artifact.logicalPath)
      await fs.mkdir(path.dirname(dest), { recursive: true })
      let content = artifact.content
      if (artifact.kind === 'component')
        content = content.replaceAll('@/lib/utils', '../../lib/utils')
      if (artifact.kind === 'usage')
        content = content.replaceAll('@/components/ui', '../components/ui')
      await fs.writeFile(dest, content)
    }
    const ids = [...spacedExampleIds, 'toast']
    const imports = ids
      .map(
        (id, i) =>
          'import {Example as E' + i + "} from './examples/" + id + "'",
      )
      .join('\n')
    const entry =
      "import * as React from 'react'\nimport {createRoot} from 'react-dom/client'\nimport './audit.css'\n" +
      imports +
      "\ndocument.documentElement.classList.toggle('dark',new URLSearchParams(location.search).get('mode')==='dark')\ncreateRoot(document.getElementById('root')!).render(<main>" +
      ids
        .map(
          (id, i) =>
            '<section data-component="' +
            id +
            '" style={{padding:24,marginBottom:32}}><h2>' +
            id +
            '</h2><div data-example-root><E' +
            i +
            ' /></div></section>',
        )
        .join('') +
      '</main>)\n'
    await fs.writeFile(path.join(root, 'entry.tsx'), entry)
    await fs.writeFile(
      path.join(root, 'audit.css'),
      '@import "../../../base.css";\n@import "./styles/ui-tokens.css";\n@import "./styles/ui-style.css";\n@source "./components";\n@source "./examples";\nbody{margin:0}main{max-width:900px;margin:auto}h2{margin-bottom:16px}\n',
    )
    await fs.writeFile(
      path.join(root, 'index.html'),
      '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Usage example layout audit</title></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>',
    )
  }
await fs.writeFile(
  'apps/preview/src/generated/usage-audit/index.html',
  '<!doctype html><html lang="en"><head><title>Usage example layout audit</title></head><body><h1>Usage example layout audit</h1><ul>' +
    styleFamilies
      .flatMap((family) =>
        (['radix', 'base'] as const).map(
          (edition) =>
            '<li><a href="./' +
            family +
            '-' +
            edition +
            '/index.html">' +
            family +
            ' ' +
            edition +
            '</a></li>',
        ),
      )
      .join('') +
    '</ul></body></html>',
)
console.log('Generated usage examples for every family and edition')
