import * as React from 'react'
import { describeComponentRecipe } from '@ombelle/compiler'
import { renderSpecimen, type Primitives } from './render-specimen'
import { measureCatalogParts, type CatalogPreviewRender, type MeasuredParts } from '../../www/src/editor/catalog-preview-protocol'
import { resolveRecipePreset } from '@ombelle/catalog'
import { glassPresetId } from '../../www/src/site/glass-presets'
import { pickGlassScene } from '../../www/src/site/glass-backdrops'
import { scopedCatalogComponents } from './generated/catalog-recipes'
import { LiquidGlassFilter } from './generated/catalog-recipes/liquid-glass-filter'
import { GlassBackdropArt, setGlassBackdrop } from './glass-backdrop-art'

/** Overlay triggers carry no catalog style; the preview draws them as buttons so they read as clickable. */
const overlayTriggers = new Set(['DialogTrigger', 'SheetTrigger', 'AlertDialogTrigger', 'PopoverTrigger', 'TooltipTrigger', 'DropdownMenuTrigger'])
const triggerClass = (tag: string) => !overlayTriggers.has(tag) ? undefined
  : tag === 'AlertDialogTrigger' ? 'recipe-preview-trigger recipe-preview-trigger-destructive' : 'recipe-preview-trigger'

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
      // A module may also export helpers (Tag Input's addTags); a specimen renders only the parts it names.
      if (active) setLoaded({ scope: result.scope, primitives: module.createScopedPrimitives(result.scope, instance) as Primitives })
    })
    return () => { active = false }
  }, [component, result.scope, instance])
  const presetRef = result.recipe.data.presetRef
  const scene = React.useMemo(() => glass ? pickGlassScene(resolveRecipePreset(presetRef), mode, glass) : undefined, [glass, presetRef, mode])
  React.useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', mode === 'dark')
    setGlassBackdrop(root, scene || undefined)
    return () => {
      root.classList.remove('dark')
      setGlassBackdrop(root, undefined)
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
    {/* The stage carries the preset's tokens, so triggers and plain labels around the component use them too. */}
    {rendered && <div className="recipe-stage" data-ombelle-recipe={result.scope} data-component={component}>
      {renderSpecimen(describeComponentRecipe(result.recipe.data), loaded.primitives, instanceId, { triggerClass })}
    </div>}
  </div>
}
