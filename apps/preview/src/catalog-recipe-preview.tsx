import * as React from 'react'
import { describeComponentRecipe, type RecipeSpecimen } from '@ombelle/compiler'
import type { CatalogPreviewRender } from '../../www/src/editor/catalog-preview-protocol'
import { glassPresetBackdrop, glassPresetId } from '../../www/src/site/glass-presets'
import { scopedCatalogComponents } from './generated/catalog-recipes'
import { LiquidGlassFilter } from './generated/catalog-recipes/liquid-glass-filter'
import { GlassBackdropArt } from './glass-backdrop-art'

type Primitives = Record<string, React.ElementType>
function renderSpecimen(specimen: RecipeSpecimen, primitives: Primitives, instanceId: string): React.ReactElement {
  const props = Object.fromEntries(Object.entries(specimen.props).map(([key, value]) =>
    [key, value && typeof value === 'object' && 'localId' in value ? instanceId + value.localId : value]))
  return React.createElement(primitives[specimen.tag] ?? specimen.tag, props, ...specimen.children.map(child =>
    typeof child === 'string' ? child : renderSpecimen(child, primitives, instanceId)))
}

export function CatalogRecipePreview({ message }: { message: CatalogPreviewRender }) {
  const { component, result, mode, viewport } = message
  const [loaded, setLoaded] = React.useState<{ scope: string; primitives: Primitives }>()
  const instanceId = React.useId()
  const glass = glassPresetId(result.recipe.data.presetRef.id)
  const instance = glass ? result.scope + instanceId.replace(/[^a-zA-Z0-9_-]/g, '_') : undefined
  React.useEffect(() => {
    let active = true
    scopedCatalogComponents[component]().then(module => {
      if (active) setLoaded({ scope: result.scope, primitives: module.createScopedPrimitives(result.scope, instance) })
    })
    return () => { active = false }
  }, [component, result.scope, instance])
  const scene = glass && glassPresetBackdrop(glass)
  React.useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', mode === 'dark')
    if (scene) {
      root.dataset.backdrop = 'glass'
      root.dataset.glassBackdrop = scene
    }
    return () => {
      root.classList.remove('dark')
      delete root.dataset.backdrop
      delete root.dataset.glassBackdrop
    }
  }, [mode, scene])
  const css = result.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.css`))?.content
  return <div className={mode === 'dark' ? 'editor-preview dark' : 'editor-preview'} data-viewport={viewport}>
    <style>{css}</style>
    {instance && <LiquidGlassFilter key={result.scope} scope={result.scope} instance={instance} />}
    {scene && <GlassBackdropArt scene={scene} />}
    {loaded?.scope === result.scope && renderSpecimen(describeComponentRecipe(result.recipe.data), loaded.primitives, instanceId)}
  </div>
}
