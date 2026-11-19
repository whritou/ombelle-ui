'use client'

import * as Tabs from '@radix-ui/react-tabs'
import { Component, startTransition, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { preload } from 'react-dom'
import { defaultGlassPresetId, type StartingPresetId } from '@ombelle/catalog'
import { styleSupport, type ComponentId, type StyleFamily } from '@ombelle/contracts'
import { offeredStyleFamilies } from '../../snapshots/install-command'
import { applyStartingPreset, createPresetDraft, materializePreset, type PresetEditorDraft } from '../../preset-editor/model'
import { labInkFor, pickGlassScene } from '../glass-backdrops'
import { usePresetCompiler } from '../../preset-editor/use-preset-compiler'
import { PresetPreviewFrame } from '../../preset-editor/components/preset-preview-frame'
import { ToggleGroup } from '../toggle-group'
import { GlassPresetSelect } from '../glass-preset-select'
import { glassBackdropOptions, glassPresetBackdrop, glassPresetId } from '../glass-presets'
import type { PresetBackdrop, PresetView } from '../../preset-editor/preview-protocol'
import { InlinePreview } from '../../inline-preview/inline-preview'
import { loadFamilyFonts } from '../../inline-preview/family-fonts'
import { previewPath, previewStylesheets, type BuiltInFamily } from '../../inline-preview/routing'
import { useSiteDark } from '../theme'
import { CodeBlock } from '../../generated/ui/components/ui/code-block'
import { codeLanguage } from './code-language'

// Exhaustive by type: adding a style family fails the typecheck until it has a label.
const familyLabels: Record<StyleFamily, string> = {
  flat: 'Flat',
  minimalist: 'Minimalist',
  'neo-brutalism': 'Neo-Brutalism',
  ombelle: 'Ombelle',
  papier: 'Papier',
  organic: 'Organic',
  'retro-futurism': 'Retro futurism',
  'liquid-glass': 'Liquid Glass',
}
// Same gate as the editors: only families the published installer can install.
export const familyOptions: { value: StyleFamily; label: string }[] = offeredStyleFamilies().map((value) => ({
  value,
  label: familyLabels[value],
}))
const glassDocs = '/docs/style-families#liquid-glass'
// Previews whose examples (and their extra appearances) need more room than the default frame.
const tallPreviews: Partial<Record<ComponentId, number>> = { alert: 620, card: 560, table: 600, 'input-group': 520, carousel: 760 }
type PreviewMode = 'auto' | 'light' | 'dark'
type PreviewStatus = 'connecting' | 'ready' | 'failed'
const modeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

const tabClass = 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
const toggleItem = 'min-h-9 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:line-through disabled:hover:text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm'

/**
 * Live preview of one catalog component, compiled in the browser from the
 * built-in preset of the selected style family and shown in the sandbox.
 */
export function ComponentPlayground({ id, name, source, styles }: {
  id: ComponentId
  name: string
  source: string
  styles: Partial<Record<StyleFamily, string>>
}) {
  // The stage and status show `family`, which a transition moves once the new styles have loaded;
  // the toggle shows the reader's latest pick at once.
  const [family, setFamily] = useState<StyleFamily>(familyOptions[0]!.value)
  const [pendingFamily, setPendingFamily] = useState<StyleFamily>(family)
  const latestPick = useRef<StyleFamily>(family)
  const pickFamily = (next: StyleFamily) => {
    setPendingFamily(next)
    latestPick.current = next
    // The stage switches once the family's fonts are in, so text does not reflow after the switch;
    // a later pick wins even when this family's fonts arrive after it.
    const fonts = next === 'liquid-glass' ? Promise.resolve() : loadFamilyFonts(next as BuiltInFamily).catch(() => undefined)
    void fonts.then(() => {
      if (latestPick.current === next) startTransition(() => setFamily(next))
    })
  }
  const [glassPreset, setGlassPreset] = useState<StartingPresetId>(defaultGlassPresetId)
  const [mode, setMode] = useState<PreviewMode>('auto')
  const siteDark = useSiteDark()
  // While the reader has not picked a mode the preview follows the site theme.
  const resolvedMode = mode === 'auto' ? (siteDark ? 'dark' : 'light') : mode
  // The backdrop follows the glass preset and mode until the reader picks one; changing preset resets it.
  const [backdropOverride, setBackdropOverride] = useState<PresetBackdrop | null>(null)
  const [iframeStatus, setIframeStatus] = useState<PreviewStatus>('connecting')
  const [glassCss, setGlassCss] = useState<string | undefined>(undefined)
  // A component and family whose inline specimen threw; they stay on the iframe until either changes.
  const [inlineFailure, setInlineFailure] = useState<string | null>(null)
  const glass = styleSupport(id, 'liquid-glass')
  useEffect(() => {
    const selected = glassPresetId(new URLSearchParams(window.location.search).get('glass'))
    if (selected && glass === 'experimental') {
      setGlassPreset(selected)
      setPendingFamily('liquid-glass')
      latestPick.current = 'liquid-glass'
      setFamily('liquid-glass')
    }
  }, [glass])
  const draft = useMemo(() => {
    const base = createPresetDraft(family)
    return family === 'liquid-glass' ? applyStartingPreset(base, glassPreset) : base
  }, [family, glassPreset])
  // The same automatic scene and lab ink as the preset editor; the reader's pick overrides it.
  const glassData = useMemo(() => {
    if (family !== 'liquid-glass') return null
    try { return materializePreset(draft) } catch { return null }
  }, [family, draft])
  const backdrop = backdropOverride ?? (glassData ? pickGlassScene(glassData, resolvedMode, glassPreset) : glassPresetBackdrop(glassPreset, resolvedMode))
  const labInk = glassData ? labInkFor(glassData, resolvedMode, backdrop) : null
  const css = styles[family]
  const failureKey = `${id}:${family}`
  const inline = previewPath(id, family) === 'inline' && inlineFailure !== failureKey
  const status: PreviewStatus = inline ? 'ready' : iframeStatus
  useEffect(() => preloadOtherFamilies(id, family), [id])
  const height = tallPreviews[id] ?? 420
  const families = familyOptions.map(option =>
    option.value === 'liquid-glass'
      ? glass === 'unavailable'
        ? { ...option, disabled: true, title: `${name} is not available in liquid glass` }
        : { ...option, label: 'Liquid Glass (experimental)' }
      : option)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup label="Style family" value={pendingFamily} options={families} onValueChange={pickFamily}
          className="inline-flex rounded-lg bg-muted p-1" itemClassName={toggleItem} />
        <ToggleGroup label="Preview mode" value={resolvedMode} options={modeOptions} onValueChange={setMode}
          className="inline-flex rounded-lg bg-muted p-1" itemClassName={toggleItem} />
        <span role="status" className="ml-auto text-xs text-muted-foreground">
          {status === 'ready' ? `${familyOptions.find(o => o.value === family)!.label} · ${resolvedMode}` : status === 'failed' ? 'Preview unavailable' : 'Loading preview…'}
        </span>
      </div>
      {family === 'liquid-glass' && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted px-3 py-2">
          <GlassPresetSelect value={glassPreset} onChange={(id) => { if (id) { setGlassPreset(id); setBackdropOverride(null) } }} />
          <ToggleGroup label="Preview backdrop" value={backdrop} options={glassBackdropOptions} onValueChange={setBackdropOverride}
            className="inline-flex flex-wrap rounded-lg bg-background/60 p-1" itemClassName={toggleItem} />
          <a href={glassDocs} className="text-sm font-medium text-foreground underline decoration-primary underline-offset-4 transition-colors hover:text-primary hover:decoration-2">Liquid Glass limitations</a>
        </div>
      )}
      {glass === 'unavailable' && (
        <p className="text-sm text-muted-foreground">{name} is not available in liquid glass; the CLI refuses it in glass projects.</p>
      )}
      <Tabs.Root defaultValue="preview">
        <Tabs.List aria-label={`${name} example`} className="inline-flex rounded-lg bg-muted p-1">
          <Tabs.Trigger value="preview" className={tabClass}>Preview</Tabs.Trigger>
          <Tabs.Trigger value="code" className={tabClass}>Code</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="preview" forceMount className="mt-3 data-[state=inactive]:hidden">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {inline ? (
              <InlineBoundary onError={() => setInlineFailure(failureKey)}>
                <InlinePreview id={id} family={family as BuiltInFamily} mode={mode} height={height} />
              </InlineBoundary>
            ) : (
              <IframePreview
                draft={draft}
                view={{ mode: resolvedMode, viewport: 'wide', focus: id, backdrop: family === 'liquid-glass' ? backdrop : undefined, labInk: labInk ?? undefined }}
                title={`${name} preview`}
                height={height}
                onStatus={setIframeStatus}
                onGlassCss={setGlassCss}
              />
            )}
          </div>
        </Tabs.Content>
        <Tabs.Content value="code" className="mt-3 space-y-3">
          <SourceBlock code={source} title={`components/ui/${id}.tsx`} maxHeight="28rem" />
          {css && <SourceBlock code={css} title={`${family} styles`} maxHeight="20rem" />}
          {family === 'liquid-glass' && glassCss && <SourceBlock code={glassCss} title="Liquid Glass · shared material" maxHeight="20rem" />}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

/** Compiles the draft in the worker and shows it in the sandbox frame; mounted only on the iframe path. */
function IframePreview({ draft, view, title, height, onStatus, onGlassCss }: {
  draft: PresetEditorDraft
  view: PresetView
  title: string
  height: number
  onStatus: (status: PreviewStatus) => void
  onGlassCss: (css: string | undefined) => void
}) {
  const compiled = usePresetCompiler(draft)
  const family = draft.family
  const glassCss = family === 'liquid-glass' && compiled.result?.preset.data.styleFamily === family && !compiled.stale
    ? compiled.result?.artifacts.find(({ logicalPath }) => logicalPath === 'styles/ui-style.css')?.content
    : undefined
  // The Code tab lives in the parent, so the shared glass material is lifted through a callback.
  useEffect(() => {
    onGlassCss(glassCss)
    return () => onGlassCss(undefined)
  }, [glassCss, onGlassCss])
  useEffect(() => onStatus('connecting'), [onStatus])
  return <PresetPreviewFrame result={compiled.result} view={view} stale={compiled.stale} onStatus={onStatus} title={title} height={height} caption={false} />
}

/** Reports a throwing inline specimen and renders nothing, so the parent can switch to the iframe. */
class InlineBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Warms the stylesheets and fonts of the other families while the browser is idle, so switching family does not wait on the network. */
function preloadOtherFamilies(id: ComponentId, current: StyleFamily): () => void {
  const run = () => {
    for (const { value } of familyOptions) {
      if (value === current || value === 'liquid-glass') continue
      for (const href of previewStylesheets(value as BuiltInFamily, id)) preload(href, { as: 'style' })
      void loadFamilyFonts(value as BuiltInFamily).catch(() => undefined)
    }
  }
  if (typeof requestIdleCallback === 'function') {
    const handle = requestIdleCallback(run)
    return () => cancelIdleCallback(handle)
  }
  const handle = setTimeout(run, 200)
  return () => clearTimeout(handle)
}

/** A source file, highlighted in the language its title names. */
function SourceBlock({ code, title, maxHeight }: { code: string; title: string; maxHeight: string }) {
  return <CodeBlock code={code} title={title} language={codeLanguage(title)} maxHeight={maxHeight} />
}
