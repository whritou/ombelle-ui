import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { resolveRecipePreset } from '@ombelle/catalog'
import { isPreviewInit, verifyPreviewRender, type PreviewRender } from '../../www/src/editor/preview-protocol'
import { forcedStateSelector } from '../../www/src/editor/forced-states'
import { draftFamily } from '../../www/src/editor/model'
import { glassPresetId } from '../../www/src/site/glass-presets'
import { labInkFor, pickGlassScene } from '../../www/src/site/glass-backdrops'
import { GlassBackdropArt, setGlassBackdrop } from './glass-backdrop-art'
import { editorButtons } from './generated/editor-buttons'
import { RecipeIcon } from './recipe-icon'
import { LiquidGlassFilter } from './generated/liquid-glass/components/ui/liquid-glass-filter'
import { measurePart, verifyCatalogPreviewRender, type CatalogPreviewRender, type MeasuredParts } from '../../www/src/editor/catalog-preview-protocol'
import type { ComponentRecipe } from '@ombelle/contracts'
import { CatalogRecipePreview } from './catalog-recipe-preview'
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
  const [message, setMessage] = React.useState<PreviewRender | CatalogPreviewRender | null>(null)
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
        const accepted = component
          ? await verifyCatalogPreviewRender(data, component as ComponentRecipe['component'], lastRequestId.current)
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

  const buttonMessage = message?.type === 'render' ? message : null
  const state = buttonMessage?.state
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

  const recipeStyle = React.useRef<HTMLStyleElement>(null)
  const specimen = React.useRef<HTMLButtonElement>(null)
  const Button = buttonModule && buttonModule.family === family ? buttonModule.module.Button : null
  React.useLayoutEffect(() => {
    const sheet = recipeStyle.current?.sheet
    if (sheet) mirrorForcedStates(sheet)
  }, [state?.css])
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
    if (!buttonMessage || !Button || !specimen.current) return
    reportMeasure(buttonMessage.requestId, { button: measurePart(specimen.current) })
  }, [Button, buttonMessage, reportMeasure])
  if (message?.type === 'catalog-render') return <CatalogRecipePreview message={message} onMeasure={reportMeasure} />
  return <div className={state?.mode === 'dark' ? 'editor-preview dark' : 'editor-preview'} data-viewport={state?.viewport ?? 'wide'}>
    {/* Keyed by the CSS so each recipe gets a fresh sheet before its forced copies are added. */}
    <style ref={recipeStyle} key={state?.css ?? ''}>{state?.css ?? ''}</style>
    {glassPreset && Button && <LiquidGlassFilter key={`${glassPreset}:${overrides?.glassHalo}:${overrides?.glassMotion}`} />}
    {glassBackdrop && <GlassBackdropArt scene={glassBackdrop} />}
    {/* Button always sets data-slot="button" on itself, but the recipe CSS targets
        data-slot="recipe-button", as the installed RecipeButton renders it. As a Slot
        parent it only lends variant classes and data attributes; the child's own
        data-slot wins the Slot merge. */}
    {state && Button && <Button asChild variant={state.recipe.props.variant} size={state.recipe.props.size}>
      <button
        ref={specimen}
        data-slot="recipe-button"
        data-ombelle-recipe={buttonMessage?.scope}
        type={state.recipe.props.type}
        disabled={state.recipe.props.disabled || state.recipe.props.loading || state.forcedState === 'disabled' || state.forcedState === 'loading'}
        aria-busy={state.recipe.props.loading || state.forcedState === 'loading' || undefined}
        data-forced-state={state.forcedState}
        {...recipeIconAttributes(state.recipe)}
      >{(state.recipe.props.loading || state.forcedState === 'loading') && <span data-slot="button-spinner" aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />}{recipeChildren(state.recipe)}</button>
    </Button>}
  </div>
}

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
  createRoot(element).render(<EditorPreview />)
}
