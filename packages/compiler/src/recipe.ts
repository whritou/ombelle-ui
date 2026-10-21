import { validateRecipe, type NormalizedRecipe, type RecipeCompileResult, type Artifact } from '@ombelle/contracts'
import { getCatalog, getTemplate, resolveRecipePreset } from '@ombelle/catalog'
import { format } from 'prettier/standalone'
import typescript from 'prettier/plugins/typescript'
import estree from 'prettier/plugins/estree'
import cssPlugin from 'prettier/plugins/postcss'
import { canonicalize } from './canonicalize.js'
import { sha256 } from './hash.js'
import { resolvePreset } from './resolve.js'
import { compileRecipeStyles, validateRecipeDarkSelector } from './recipe-styles.js'
import { renderRecipeButton } from './recipe-source.js'
export async function compileRecipe(input: { recipe: unknown; darkSelector?: string }): Promise<RecipeCompileResult> {
  const raw = validateRecipe(input.recipe), builtin = resolveRecipePreset(raw.presetRef), catalog = getCatalog(raw.presetRef.catalogRelease)
  const preset = await resolvePreset(builtin,catalog)
  const data: NormalizedRecipe = { ...raw, props: { variant: preset.data.componentDefaults?.button?.variant ?? 'default', size: preset.data.componentDefaults?.button?.size ?? 'default', type:'button', disabled:false, loading:false, ...raw.props } }
  const recipe = { data, hash: await sha256(canonicalize(data)) }, provenance = { catalogRelease:raw.presetRef.catalogRelease, compilerVersion:raw.presetRef.compilerVersion }
  const scope = await sha256(canonicalize({ recipeHash:recipe.hash, presetHash:preset.hash, ...provenance }))
  const darkSelector = validateRecipeDarkSelector(input.darkSelector ?? '.dark')
  const template = getTemplate(catalog,'button'), base = 'recipes/' + data.id + '/r' + data.revision
  const drafts: Omit<Artifact,'sha256'>[] = [
    { logicalPath:base+'/button.tsx',kind:'component',content:renderRecipeButton({template:template.content, recipe:data, scope}) },
    { logicalPath:base+'/button.css',kind:'style',content:compileRecipeStyles({familyCss:catalog.styles[builtin.styleFamily as keyof typeof catalog.styles],preset,overrides:data.overrides,scope,darkSelector}) },
    { logicalPath:'examples/recipes/'+data.id+'/r'+data.revision+'.tsx',kind:'usage',content:`import {RecipeButton} from '@/components/ui/${base}/button'\nexport function Example(){return <RecipeButton variant=${JSON.stringify(data.props.variant)} size=${JSON.stringify(data.props.size)} type=${JSON.stringify(data.props.type)} disabled={${data.props.disabled}} loading={${data.props.loading}}>{${JSON.stringify(data.content)}}</RecipeButton>}` },
    { logicalPath:'lib/utils.ts',kind:'utility',content:catalog.utility },
  ]
  const artifacts: Artifact[] = []
  for (const draft of drafts.sort((a,b)=>a.logicalPath<b.logicalPath?-1:1)) {
    const content = await format(draft.content,{ parser:draft.kind==='style'?'css':'typescript',plugins:[typescript,estree,cssPlugin],endOfLine:'lf',singleQuote:true,semi:false })
    artifacts.push({...draft,content,sha256:await sha256(content)})
  }
  return { artifacts, dependencies:template.dependencies, recipe,preset,scope,darkSelector,provenance }
}
