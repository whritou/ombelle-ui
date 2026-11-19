// Writes what the website's inline component previews need, once per `pnpm generate:preview`:
// per family a base stylesheet and one scoped stylesheet per component, plus the compiled components,
// the shared specimens and a registry that loads each specimen on demand. Nothing compiles at request time.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { compile, stripFontImports } from '@ombelle/compiler'
import { fontById } from '@ombelle/catalog'
import { componentsWithStyleSupport, supportedStyleFamilies } from '@ombelle/contracts'
import { createPresetDraft, materializePreset, previewComponentIds } from '../apps/www/src/preset-editor/model.js'
import { fontLoaders } from '../apps/www/src/inline-preview/family-fonts.js'
import { specimenIndex } from '../fixtures/shared/specimens/index.js'
import { previewTokensCss, scopePreviewCss, type BuiltInFamily } from './www-previews/scope-css.js'
import { scopePreviewTemplate } from './www-previews/scope-template.js'

const repo = fileURLToPath(new URL('../', import.meta.url))
const specimensDir = path.join(repo, 'fixtures/shared/specimens')
const compiledPrefix = 'components/ui/'
const uiImport = /@\/components\/ui\/([\w-]+)/g
const importedComponents = (source: string) => [...source.matchAll(uiImport)].map((match) => match[1]!)
const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const entryFor = (id: string) => specimenIndex[id as keyof typeof specimenIndex]

type Compiled = {
  components: Map<string, string>
  styles: Map<string, string>
  familySheet: string
  theme: Awaited<ReturnType<typeof compile>>['theme']
}

async function compileFamily(family: BuiltInFamily): Promise<Compiled> {
  // The preset the iframe preview compiles (compile-protocol.ts): the catalog preset with its style's fonts.
  const preset = materializePreset(createPresetDraft(family))
  // The page loads fonts itself (family-fonts.ts), so each registry font needs a loader there.
  for (const id of [preset.design.fontFamilyId, preset.design.headingFontFamilyId, preset.design.monoFontFamilyId])
    if (id && fontById(id) && !(id in fontLoaders))
      throw new Error(`Built-in family ${family} uses font ${id}, which has no loader in apps/www/src/inline-preview/family-fonts.ts`)
  const result = await compile({
    preset,
    componentIds: previewComponentIds(family),
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const components = new Map<string, string>()
  const styles = new Map<string, string>()
  let familySheet = ''
  for (const artifact of result.artifacts) {
    // A browser cannot resolve the package imports of the fonts; the page loads those files itself.
    if (artifact.logicalPath === 'styles/ui-style.css') familySheet = stripFontImports(artifact.content)
    else if (artifact.logicalPath.startsWith(compiledPrefix)) {
      const name = artifact.logicalPath.slice(compiledPrefix.length)
      if (name.endsWith('.tsx')) components.set(name.slice(0, -4), artifact.content)
      else if (name.endsWith('.css')) styles.set(name.slice(0, -4), artifact.content)
    }
  }
  // Font imports are stripped above and the page loads those fonts itself; any other @import has no way in.
  if (/@import\b/.test(familySheet)) throw new Error(`Built-in family ${family} has a non-font @import, which preview CSS cannot load`)
  return { components, styles, familySheet, theme: result.theme }
}

export async function generateWwwPreviews(
  out: { src: string; public: string } = {
    src: path.join(repo, 'apps/www/src/generated/previews'),
    public: path.join(repo, 'apps/www/public/previews'),
  },
): Promise<void> {
  const families = [...supportedStyleFamilies] as BuiltInFamily[]
  const compiled = new Map<BuiltInFamily, Compiled>()
  for (const family of families) compiled.set(family, await compileFamily(family))

  const modules = [...new Set(Object.values(specimenIndex).map((entry) => entry.module))].sort(byName)
  const moduleSource = new Map<string, string>()
  for (const name of [...modules, 'shared'])
    moduleSource.set(name, await fs.readFile(path.join(specimensDir, `${name}.tsx`), 'utf8'))

  // Components compile to the same source in every family, so the first family that has one supplies it.
  const componentSource = (id: string) =>
    families.map((family) => compiled.get(family)!.components.get(id)).find((source) => source !== undefined)
  const closure = (roots: Iterable<string>) => {
    const seen = new Set<string>()
    const visit = (id: string) => {
      if (seen.has(id)) return
      seen.add(id)
      const source = componentSource(id)
      if (source) for (const dependency of importedComponents(source)) visit(dependency)
    }
    for (const id of roots) visit(id)
    return [...seen].sort(byName)
  }
  const moduleComponents = (module: string) => {
    const source = moduleSource.get(module)!
    const roots = importedComponents(source)
    if (/from '\.\/shared'/.test(source)) roots.push(...importedComponents(moduleSource.get('shared')!))
    return closure(roots)
  }
  const used = closure([...modules, 'shared'].flatMap((module) => importedComponents(moduleSource.get(module)!)))

  await fs.rm(out.src, { recursive: true, force: true })
  await fs.rm(out.public, { recursive: true, force: true })
  const write = async (file: string, content: string) => {
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, content)
  }

  for (const id of used) {
    const source = componentSource(id)
    if (source === undefined) throw new Error(`Specimens need component ${id}, which no built-in family compiles`)
    await write(
      path.join(out.src, 'ui', `${id}.tsx`),
      await scopePreviewTemplate(source, { utils: '../../ui/lib/utils', portal: '../../../inline-preview/preview-portal' }),
    )
  }
  for (const name of [...modules, 'shared'])
    await write(path.join(out.src, 'specimens', `${name}.tsx`), moduleSource.get(name)!.replaceAll('@/components/ui/', '../ui/'))

  const gallery = await fs.readFile(path.join(repo, 'fixtures/shared/preset-gallery.css'), 'utf8')
  const focus = await fs.readFile(path.join(repo, 'fixtures/shared/preset-focus.css'), 'utf8')
  const ids = Object.keys(specimenIndex).sort(byName)
  for (const family of families) {
    const { styles, familySheet, theme } = compiled.get(family)!
    const dir = path.join(out.public, family)
    await write(
      path.join(dir, 'base.css'),
      [
        previewTokensCss(family, theme),
        scopePreviewCss(familySheet, family),
        scopePreviewCss(gallery, family),
        scopePreviewCss(focus, family),
        `[data-preview-family="${family}"] .preset-gallery{min-height:100%}`,
      ].join('\n') + '\n',
    )
    const available = new Set<string>(componentsWithStyleSupport(family, ['stable', 'experimental']))
    for (const id of ids) {
      if (!available.has(id)) continue
      const sheets = moduleComponents(entryFor(id).module).flatMap((component) => {
        const css = styles.get(component)
        return css === undefined ? [] : [scopePreviewCss(css, family)]
      })
      await write(path.join(dir, `${id}.css`), sheets.join('\n') + (sheets.length ? '\n' : ''))
    }
  }

  await write(
    path.join(out.src, 'index.ts'),
    [
      '// Generated by scripts/generate-www-previews.ts. Each specimen loads on demand and renders on the server too.',
      "import type { ComponentType } from 'react'",
      "import dynamic from 'next/dynamic'",
      '',
      'type Specimen = ComponentType<{ only?: string }>',
      '',
      'export const inlineSpecimens: Record<string, Specimen> = {',
      ...ids.map((id) => `  '${id}': dynamic(() => import('./specimens/${entryFor(id).module}').then((m) => m.Specimen as Specimen)),`),
      '}',
      '',
      'export const specimenOnly: Record<string, string | undefined> = {',
      ...ids.map((id) => `  '${id}': ${JSON.stringify(entryFor(id).only)},`),
      '}',
      '',
    ].join('\n'),
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await generateWwwPreviews()
