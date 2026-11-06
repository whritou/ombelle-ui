import * as React from 'react'
import { describeComponentRecipe, type RecipeSpecimen } from '@ombelle/compiler'
import { measureCatalogParts, type CatalogPreviewRender, type MeasuredParts } from '../../www/src/editor/catalog-preview-protocol'
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

export function CatalogRecipePreview({ message, onMeasure }: {
  message: CatalogPreviewRender; onMeasure?(requestId: number, parts: MeasuredParts): void
}) {
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
  const frame = React.useRef<HTMLDivElement>(null)
  const rendered = loaded?.scope === result.scope
  // Report what the preset renders so the editor's empty fields can show it.
  React.useEffect(() => {
    if (rendered && frame.current) onMeasure?.(message.requestId, measureCatalogParts(frame.current, component))
  }, [rendered, message.requestId, component, onMeasure])
  const css = result.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.css`))?.content
  return <div ref={frame} className={mode === 'dark' ? 'editor-preview dark' : 'editor-preview'} data-viewport={viewport}>
    <style>{css}</style>
    {instance && <LiquidGlassFilter key={result.scope} scope={result.scope} instance={instance} />}
    {scene && <GlassBackdropArt scene={scene} />}
    {rendered && renderSpecimen(describeComponentRecipe(result.recipe.data), loaded.primitives, instanceId)}
  </div>
}
