import {
  validateComponentRecipe, validateInstallableRecipe,
  type Artifact, type ComponentRecipeId, type ComponentRecipeCompileResult, type InstallableRecipeCompileResult,
} from '@ombelle/contracts'
import { getCatalog, getTemplate, resolveRecipePreset } from '@ombelle/catalog'
import { format } from 'prettier/standalone'
import typescript from 'prettier/plugins/typescript'
import estree from 'prettier/plugins/estree'
import postcss from 'prettier/plugins/postcss'
import { canonicalize } from './canonicalize.js'
import { compile } from './compile.js'
import { compileComponentRecipeStyles } from './component-recipe-styles.js'
import { recipeTemplateSlots, scopeRecipeGlassFilter, scopeRecipeTemplate } from './component-recipe-source.js'
import { sha256 } from './hash.js'
import { compileRecipe } from './recipe.js'
import { describeComponentRecipe, renderRecipeSpecimen, specimenExports } from './recipe-specimen.js'
import { validateRecipeDarkSelector } from './recipe-styles.js'

type CompileInput = { recipe: unknown; darkSelector?: string }

export function componentRecipeExportName(component: ComponentRecipeId): string {
  return 'Recipe' + component.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('')
}

export async function compileInstallableRecipe(input: CompileInput): Promise<InstallableRecipeCompileResult> {
  const recipe = validateInstallableRecipe(input.recipe)
  return recipe.schemaVersion === '2.0'
    ? compileComponentRecipe({ ...input, recipe })
    : compileRecipe({ ...input, recipe })
}

export async function compileComponentRecipe(input: CompileInput): Promise<ComponentRecipeCompileResult> {
  const data = validateComponentRecipe(input.recipe)
  const builtin = resolveRecipePreset(data.presetRef)
  const { catalogRelease, compilerVersion } = data.presetRef
  const catalog = getCatalog(catalogRelease)
  const template = getTemplate(catalog, data.component)
  const result = await compile({
    preset: builtin, catalogRelease, compilerVersion, componentIds: [data.component], glassContrast: 'report',
  })
  const { preset, provenance } = result
  const darkSelector = validateRecipeDarkSelector(input.darkSelector ?? '.dark')
  const recipe = { data, hash: await sha256(canonicalize(data)) }
  const scope = await sha256(canonicalize({ recipeHash: recipe.hash, presetHash: preset.hash, ...provenance }))
  const base = `recipes/${data.id}/r${data.revision}`
  const component = data.component
  const specimen = describeComponentRecipe(data)
  const name = componentRecipeExportName(component)
  const source = scopeRecipeTemplate(template, '@/lib/utils')
  const glass = preset.data.styleFamily === 'liquid-glass'
  const primitiveNames = specimenExports(specimen).join(', ')
  const jsx = renderRecipeSpecimen(specimen)
  const definition = glass
    ? `\nimport './${component}.css'
import { LiquidGlassFilter } from './liquid-glass-filter'
const scope = ${JSON.stringify(scope)}
export function ${name}() {
  const instanceId = React.useId()
  const instance = scope + instanceId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const { ${primitiveNames} } = React.useMemo(() => createScopedPrimitives(scope, instance), [instance])
  return <><LiquidGlassFilter scope={scope} instance={instance} />${jsx}</>
}\n`
    : `\nimport './${component}.css'\nconst { ${primitiveNames} } = createScopedPrimitives(${JSON.stringify(scope)})\nexport function ${name}() { const instanceId = React.useId(); return ${jsx} }\n`
  const styles = result.artifacts.filter(artifact => artifact.kind === 'style' && artifact.logicalPath !== 'styles/ui-tokens.css')
  const drafts: Omit<Artifact, 'sha256'>[] = [
    { logicalPath: `${base}/${component}.tsx`, kind: 'component',
      content: source + definition },
    { logicalPath: `${base}/${component}.css`, kind: 'style',
      content: compileComponentRecipeStyles({ styles: styles.map(artifact => artifact.content),
        slots: recipeTemplateSlots(template), scope, theme: result.theme, darkSelector, glass }) },
    { logicalPath: `examples/recipes/${data.id}/r${data.revision}.tsx`, kind: 'usage',
      content: `import { ${name} } from '@/components/ui/${base}/${component}'\nexport function Example() { return <${name} /> }` },
    { logicalPath: 'lib/utils.ts', kind: 'utility', content: catalog.utility },
  ]
  if (glass) drafts.push({ logicalPath: `${base}/liquid-glass-filter.tsx`, kind: 'component',
    content: scopeRecipeGlassFilter(catalog.glassFilter) })
  const artifacts = await Promise.all(drafts.sort((a, b) => a.logicalPath < b.logicalPath ? -1 : 1)
    .map(async artifact => {
      const content = await format(artifact.content, {
        parser: artifact.kind === 'style' ? 'css' : 'typescript',
        plugins: [typescript, estree, postcss], endOfLine: 'lf', singleQuote: true, semi: false,
      })
      return { ...artifact, content, sha256: await sha256(content) }
    }))
  return { artifacts, dependencies: template.dependencies, recipe, preset, scope, darkSelector, provenance }
}
