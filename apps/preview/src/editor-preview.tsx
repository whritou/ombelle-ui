import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { resolveRecipePreset } from '@ombelle/catalog'
import { isPreviewInit, verifyPreviewRender, type PreviewRender } from '../../www/src/editor/preview-protocol'
import { forcedStateSelector } from '../../www/src/editor/forced-states'
import { draftFamily } from '../../www/src/editor/model'
import { glassPresetId } from '../../www/src/site/glass-presets'
import { labInkFor, pickGlassScene } from '../../www/src/site/glass-backdrops'
import { GlassBackdropArt, setGlassBackdrop } from './glass-backdrop-art'
import { startReducedTransparencyMirror } from './reduced-transparency-mirror'
import { editorButtons } from './generated/editor-buttons'
import { RecipeIcon } from './recipe-icon'
import { LiquidGlassFilter } from './generated/liquid-glass/components/ui/liquid-glass-filter'
import { measurePart, verifyCatalogMatrixRender, verifyCatalogPreviewRender, type CatalogMatrixRender, type CatalogPreviewRender, type MeasuredParts } from '../../www/src/editor/catalog-preview-protocol'
import { verifyButtonMatrixRender, type ButtonMatrixRender } from '../../www/src/editor/preview-protocol'
import { buttonStateRow } from '../../www/src/editor/matrix'
import { CatalogMatrixPreview, MatrixTable } from './matrix-preview'
import type { ComponentRecipe } from '@ombelle/contracts'
import { colorDimensions } from '../../www/src/editor/measured-color'
import { CatalogRecipePreview } from './catalog-recipe-preview'
import { previewSizeMessage, stageContentBlockSize } from '../../www/src/editor/preview-size'
import './editor-preview.css'

/**
 * Forced preview states use the family's own rules: each rule written for :hover,
 * :focus-visible or :active gets a copy for [data-forced-state], inserted right after
 * it so the cascade order is unchanged.
 */
function mirrorForcedStates(group: CSSStyleSheet | CSSGroupingRule) {
  for (let index = group.cssRules.length - 1; index >= 0; index--) {
    const rule = group.cssRules[index]
    if (rule instanceof CSSStyleRule) {
      const forced = forcedStateSelector(rule.selectorText)
      if (forced) group.insertRule(`${forced} { ${rule.style.cssText} }`, index + 1)
    } else if (rule instanceof CSSGroupingRule) mirrorForcedStates(rule)
  }
}

type ButtonModule = Awaited<ReturnType<(typeof editorButtons)[keyof typeof editorButtons]>>
const filterTokens = ['--glass-refraction-width', '--glass-refraction-strength', '--glass-halo', '--glass-motion']

function EditorPreview() {
  const [message, setMessage] = React.useState<PreviewRender | CatalogPreviewRender | CatalogMatrixRender | ButtonMatrixRender | null>(null)
  const [buttonModule, setButtonModule] = React.useState<{ family: string; module: ButtonModule } | null>(null)
  const lastRequestId = React.useRef(0)
  const activePort = React.useRef<MessagePort | null>(null)
  const reportMeasure = React.useCallback((requestId: number, parts: MeasuredParts) => {
    if (requestId === lastRequestId.current) activePort.current?.postMessage({ type: 'catalog-measure', requestId, parts })
  }, [])

  React.useEffect(() => {
    const parentOrigin = document.referrer ? new URL(document.referrer).origin : null
    let port: MessagePort | null = null
    const announce = () => {
      if (!port) window.parent.postMessage({ type: 'ombelle-preview-ready', version: 1 }, '*')
    }
    const retry = window.setInterval(announce, 150)
    function initialize(event: MessageEvent<unknown>) {
      if (event.source !== window.parent || event.origin !== parentOrigin || !isPreviewInit(event.data) ||
        event.ports.length !== 1) return
      port?.close()
      const attachedPort = event.ports[0]
      port = attachedPort
      activePort.current = attachedPort
      window.clearInterval(retry)
      attachedPort.onmessage = async (update: MessageEvent<unknown>) => {
        const data = update.data
        const id = typeof data === 'object' && data !== null && 'requestId' in data &&
          typeof data.requestId === 'number' && Number.isSafeInteger(data.requestId) && data.requestId > 0
            ? data.requestId : null
        const component = new URLSearchParams(window.location.search).get('component')
        const type = typeof data === 'object' && data !== null && 'type' in data ? data.type : null
        const accepted = component
          ? type === 'catalog-matrix-render'
            ? await verifyCatalogMatrixRender(data, component as ComponentRecipe['component'], lastRequestId.current)
            : await verifyCatalogPreviewRender(data, component as ComponentRecipe['component'], lastRequestId.current)
          : type === 'matrix-render'
            ? await verifyButtonMatrixRender(data, lastRequestId.current)
            : await verifyPreviewRender(data, lastRequestId.current)
        if (attachedPort !== port) return
        if (!accepted || accepted.requestId <= lastRequestId.current) {
          if (id !== null) attachedPort.postMessage({ type: 'render-ack', requestId: id, status: 'rejected' })
          return
        }
        lastRequestId.current = accepted.requestId
        setMessage(accepted)
        attachedPort.postMessage({ type: 'render-ack', requestId: accepted.requestId, status: 'applied' })
      }
      attachedPort.start()
    }
    window.addEventListener('message', initialize)
    announce()
    return () => {
      window.removeEventListener('message', initialize)
      window.clearInterval(retry)
      port?.close()
      activePort.current = null
    }
  }, [])

  // The page sizes the frame to the content, so a matrix or a tall component does not scroll inside it.
  React.useEffect(() => {
    const stage = document.querySelector<HTMLElement>('.editor-preview')
    if (!stage) return
    let sent = 0
    const report = () => {
      const size = Math.ceil(stageContentBlockSize(stage))
      if (size === sent || size <= 0) return
      sent = size
      activePort.current?.postMessage(previewSizeMessage(size))
    }
    const observer = new ResizeObserver(report)
    for (const child of Array.from(stage.children)) observer.observe(child)
    report()
    return () => observer.disconnect()
  }, [message, buttonModule])

  const buttonMessage = message?.type === 'render' ? message : null
  // The editors' "Preview transparency" toggle; the mirror holds the rules it switches on.
  const reducedTransparency = message?.type === 'render' ? message.state.reducedTransparency === true : message?.reducedTransparency === true
  React.useEffect(() => {
    document.documentElement.toggleAttribute('data-reduced-transparency', reducedTransparency)
  }, [reducedTransparency])
  // In a Button matrix the current cell stands in for the single specimen: its family, glass
  // scene, filter tokens and measurements drive the whole preview.
  const matrixMessage = message?.type === 'matrix-render' ? message : null
  const matrixCurrent = matrixMessage?.cells.find((cell) => cell.current)
  const state: PreviewRender['state'] | undefined = buttonMessage?.state ?? (matrixMessage && matrixCurrent
    ? { recipe: matrixCurrent.recipe, css: matrixCurrent.css, mode: matrixMessage.mode, viewport: matrixMessage.viewport, forcedState: 'none', requestId: matrixMessage.requestId }
    : undefined)
  const specimenScope = buttonMessage?.scope ?? matrixCurrent?.scope
  const family = state && draftFamily(state.recipe)
  const glassPreset = state && glassPresetId(state.recipe.presetRef.id)
  const recipePreset = React.useMemo(() => glassPreset && state ? resolveRecipePreset(state.recipe.presetRef) : undefined,
    [glassPreset, state?.recipe.presetRef])
  const glassBackdrop = glassPreset && state && recipePreset ? pickGlassScene(recipePreset, state.mode, glassPreset) : undefined
  const overrides = state?.recipe.overrides
  // Colour and glass overrides change the ink the lab tuned, so they keep the plate.
  const labInk = state && glassBackdrop && recipePreset
    && !Object.keys(overrides ?? {}).some((key) => key === 'colors' || key.startsWith('glass'))
    ? labInkFor(recipePreset, state.mode, glassBackdrop) : null
  React.useEffect(() => {
    if (!family || !(family in editorButtons)) return
    let active = true
    editorButtons[family]().then((loaded) => { if (active) setButtonModule({ family, module: loaded }) })
    return () => { active = false }
  }, [family])

  // The iframe owns its backdrop; the preset changes only the specimen and its preview.
  React.useEffect(() => {
    if (!glassBackdrop) return
    const root = document.documentElement
    setGlassBackdrop(root, glassBackdrop, labInk)
    return () => setGlassBackdrop(root, undefined)
  }, [glassBackdrop, labInk])

  const specimen = React.useRef<HTMLButtonElement>(null)
  const Button = buttonModule && buttonModule.family === family ? buttonModule.module.Button : null
  // Every recipe sheet gets its forced-state copies once, when its element mounts: switching
  // between Single and Matrix mounts a new sheet even when the CSS text is the same.
  const mirrored = React.useRef(new WeakSet<CSSStyleSheet>())
  const recipeStyle = React.useCallback((element: HTMLStyleElement | null) => {
    const sheet = element?.sheet
    if (!sheet || mirrored.current.has(sheet)) return
    mirrored.current.add(sheet)
    mirrorForcedStates(sheet)
  }, [])
  React.useLayoutEffect(() => {
    if (family !== 'liquid-glass' || !specimen.current) return
    const root = document.documentElement
    const material = getComputedStyle(specimen.current)
    // The recipe keeps its CSS scoped to the Button. The iframe's filter reads these controls from the root.
    for (const token of filterTokens) root.style.setProperty(token, material.getPropertyValue(token))
    return () => {
      for (const token of filterTokens) root.style.removeProperty(token)
    }
  }, [Button, family, state?.css, state?.mode])
  // Report the specimen's rendered values so the editor's empty fields show what the preset draws.
  React.useEffect(() => {
    if (!state || !Button || !specimen.current) return
    const button = measurePart(specimen.current)
    // Colour placeholders show the Button at rest: a forced hover or press would report its own colours.
    if (state.forcedState !== 'none') for (const key of colorDimensions) delete button[key]
    reportMeasure(state.requestId, { button })
  }, [Button, message, reportMeasure])
  if (message?.type === 'catalog-render') return <CatalogRecipePreview message={message} onMeasure={reportMeasure} />
  if (message?.type === 'catalog-matrix-render') return <CatalogMatrixPreview message={message} onMeasure={reportMeasure} />
  if (matrixMessage && matrixCurrent) return <div className={matrixMessage.mode === 'dark' ? 'editor-preview dark' : 'editor-preview'} data-viewport={matrixMessage.viewport} data-layout="matrix" data-request={matrixMessage.requestId}>
    {/* Each cell keeps its own sheet; the current one also gets the forced-state copies for the state row. */}
    {matrixMessage.cells.map((cell) => cell.current
      ? <style key={cell.css} ref={recipeStyle}>{cell.css}</style>
      : <style key={cell.css}>{cell.css}</style>)}
    {glassPreset && Button && <LiquidGlassFilter key={`${glassPreset}:${overrides?.glassHalo}:${overrides?.glassMotion}`} />}
    {glassBackdrop && <GlassBackdropArt scene={glassBackdrop} />}
    {Button && <MatrixTable name="Button" rows={matrixMessage.rows} columns={matrixMessage.columns} cells={matrixMessage.cells}
      render={(cell) => <ButtonSpecimen Button={Button} recipe={cell.recipe} scope={cell.scope} forcedState="none" ref={cell.current ? specimen : undefined} />}
      extra={matrixMessage.states ? { label: 'States', cells: buttonStateRow.map((forced) => ({ key: forced, label: forced,
        node: <ButtonSpecimen Button={Button} recipe={matrixCurrent.recipe} scope={matrixCurrent.scope} forcedState={forced} /> })) } : undefined} />}
  </div>
  return <div className={state?.mode === 'dark' ? 'editor-preview dark' : 'editor-preview'} data-viewport={state?.viewport ?? 'wide'}>
    {/* Keyed by the CSS so each recipe gets a fresh sheet before its forced copies are added. */}
    <style ref={recipeStyle} key={state?.css ?? ''}>{state?.css ?? ''}</style>
    {glassPreset && Button && <LiquidGlassFilter key={`${glassPreset}:${overrides?.glassHalo}:${overrides?.glassMotion}`} />}
    {glassBackdrop && <GlassBackdropArt scene={glassBackdrop} />}
    {state && Button && <ButtonSpecimen Button={Button} recipe={state.recipe} scope={specimenScope} forcedState={state.forcedState} ref={specimen} />}
  </div>
}

/**
 * One Button as the installed RecipeButton renders it. Button always sets data-slot="button" on
 * itself, but the recipe CSS targets data-slot="recipe-button". As a Slot parent it only lends
 * variant classes and data attributes; the child's own data-slot wins the Slot merge.
 */
const ButtonSpecimen = React.forwardRef<HTMLButtonElement, {
  Button: ButtonModule['Button']; recipe: PreviewRecipe; scope: string | undefined; forcedState: PreviewRender['state']['forcedState']
}>(function ButtonSpecimen({ Button, recipe, scope, forcedState }, ref) {
  const loading = recipe.props.loading || forcedState === 'loading'
  return <Button asChild variant={recipe.props.variant} size={recipe.props.size}>
    <button
      ref={ref}
      data-slot="recipe-button"
      data-ombelle-recipe={scope}
      type={recipe.props.type}
      disabled={recipe.props.disabled || loading || forcedState === 'disabled'}
      aria-busy={loading || undefined}
      data-forced-state={forcedState}
      {...recipeIconAttributes(recipe)}
    >{loading && <span data-slot="button-spinner" aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />}{recipeChildren(recipe)}</button>
  </Button>
})

type PreviewRecipe = PreviewRender['state']['recipe']

/** The attributes the installed RecipeButton sets for its icon, so the scoped CSS matches. */
function recipeIconAttributes(recipe: PreviewRecipe) {
  if (!recipe.icon) return {}
  return recipe.icon.iconOnly
    ? { 'aria-label': recipe.content, 'data-icon-only': '' }
    : { 'data-icon-position': recipe.icon.position ?? 'start' }
}

function recipeChildren(recipe: PreviewRecipe) {
  if (!recipe.icon) return recipe.content
  const glyph = <RecipeIcon name={recipe.icon.name} slot="recipe-button-icon" />
  if (recipe.icon.iconOnly) return glyph
  return recipe.icon.position === 'end' ? <>{recipe.content}{glyph}</> : <>{glyph}{recipe.content}</>
}

export function mountEditorPreview(element: HTMLElement) {
  startReducedTransparencyMirror(document)
  createRoot(element).render(<EditorPreview />)
}
