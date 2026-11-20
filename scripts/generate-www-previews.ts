// Writes what the website's inline component previews need, once per `pnpm generate:preview`:
// per family a base stylesheet and one scoped stylesheet per component, plus the compiled components,
// the shared specimens and a registry that loads each specimen on demand, and Ombelle's self-hosted fonts
// with the faces each specimen preloads. Nothing compiles at request time.
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { compile, stripFontImports } from '@ombelle/compiler'
import { fontById } from '@ombelle/catalog'
import { componentsWithStyleSupport, supportedStyleFamilies } from '@ombelle/contracts'
import { createPresetDraft, materializePreset, previewComponentIds } from '../apps/www/src/preset-editor/model.js'
import { familyFontIds, fontLoaders } from '../apps/www/src/inline-preview/family-fonts.js'
import { specimenIndex } from '../fixtures/shared/specimens/index.js'
import { previewTokensCss, relativeToStage, scopePreviewCss, stageContainerCss, unsetTokensCss, type BuiltInFamily } from './www-previews/scope-css.js'
import { scopePreviewTemplate } from './www-previews/scope-template.js'
import { latinFaceUrl, rehostFontCss, slotsUsingFont } from './www-previews/self-hosted-fonts.js'

const repo = fileURLToPath(new URL('../', import.meta.url))
const specimensDir = path.join(repo, 'fixtures/shared/specimens')
const compiledPrefix = 'components/ui/'
const uiImport = /@\/components\/ui\/([\w-]+)/g
const importedComponents = (source: string) => [...source.matchAll(uiImport)].map((match) => match[1]!)
const slotNames = (source: string) =>
  [...source.matchAll(/(?:data-slot=|["']data-slot["']\s*:\s*)(["'])([\w-]+)\1/g)].map((match) => match[2]!)
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
  const ombelleSheets = { base: '', byId: new Map<string, string>() }
  for (const family of families) {
    const { styles, familySheet, theme } = compiled.get(family)!
    const dir = path.join(out.public, family)
    const available = new Set<string>(componentsWithStyleSupport(family, ['stable', 'experimental']))
    const componentSheets = new Map<string, string>()
    for (const id of ids) {
      // The stage links `<family>/<id>.css` for every component; one the family does not offer shows a notice and needs no rules.
      if (!available.has(id)) {
        componentSheets.set(id, '')
        continue
      }
      const sheets = moduleComponents(entryFor(id).module).flatMap((component) => {
        const css = styles.get(component)
        return css === undefined ? [] : [scopePreviewCss(css, family)]
      })
      componentSheets.set(id, sheets.join('\n') + (sheets.length ? '\n' : ''))
    }
    const sheets = [
      scopePreviewCss(familySheet, family),
      scopePreviewCss(gallery, family),
      scopePreviewCss(relativeToStage(focus), family),
      stageContainerCss(family),
    ]
    const unset = unsetTokensCss(family, theme, [...sheets, ...componentSheets.values()])
    // The reset comes first: the family's tokens and the stage rules that follow set their own properties.
    await write(path.join(dir, 'base.css'), [...(unset ? [unset] : []), previewTokensCss(family, theme), ...sheets].join('\n') + '\n')
    for (const [id, css] of componentSheets) await write(path.join(dir, `${id}.css`), css)
    if (family === 'ombelle') Object.assign(ombelleSheets, { base: sheets.join('\n'), byId: componentSheets })
  }

  // Ombelle is the family a component page renders first, so its fonts ship in the page CSS from a fixed public
  // path, which lets the page preload the faces its specimen shows before layout asks for them.
  const fontBase = '/previews/fonts'
  const requireFromWww = createRequire(path.join(repo, 'apps/www/package.json'))
  const fontCss: string[] = []
  for (const font of familyFontIds('ombelle'))
    for (const specifier of fontById(font)?.fontsource.imports ?? []) {
      const file = requireFromWww.resolve(specifier)
      const { css, files } = rehostFontCss(await fs.readFile(file, 'utf8'), fontBase)
      for (const name of files) {
        await fs.mkdir(path.join(out.public, 'fonts'), { recursive: true })
        await fs.copyFile(path.join(path.dirname(file), 'files', name), path.join(out.public, 'fonts', name))
      }
      fontCss.push(`/* ${specifier} */\n${css.trim()}\n`)
    }
  const fontsCss = fontCss.join('\n')
  await write(path.join(out.src, 'fonts.css'), fontsCss)
  const { light } = compiled.get('ombelle')!.theme
  const face = (variable: string) => {
    const url = latinFaceUrl(fontsCss, light[variable] ?? '')
    if (!url) throw new Error(`Ombelle's ${variable} has no self-hosted Latin face`)
    return url
  }
  const preloads: Record<string, string[]> = {}
  for (const id of ids) {
    const slots = new Set(moduleComponents(entryFor(id).module).flatMap((component) => slotNames(componentSource(component) ?? '')))
    const css = ombelleSheets.base + '\n' + (ombelleSheets.byId.get(id) ?? '')
    const shows = (variable: string) => [...slotsUsingFont(css, variable)].some((slot) => slots.has(slot))
    preloads[id] = [face('--font-family'), ...['--font-heading', '--font-mono'].filter(shows).map(face)]
  }
  await write(
    path.join(out.src, 'fonts.ts'),
    '// Generated by scripts/generate-www-previews.ts. The upright Latin Ombelle faces each specimen shows, which its page preloads.\n' +
      `export const ombelleFontPreloads: Record<string, readonly string[]> = ${JSON.stringify(preloads, null, 2)}\n`,
  )

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
