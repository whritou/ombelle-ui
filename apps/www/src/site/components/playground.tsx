'use client'

import * as Tabs from '@radix-ui/react-tabs'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Code, Eye, Moon, Sun } from 'lucide-react'
import { Component, startTransition, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { preload } from 'react-dom'
import { defaultGlassPresetId, type StartingPresetId } from '@ombelle/catalog'
import { accessibilityCaveatLabel, styleSupport, type ComponentId, type StyleFamily } from '@ombelle/contracts'
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
import { Toggle } from '../../generated/ui/components/ui/toggle'
import { codeLanguage } from './code-language'
import sampleStyles from './playground.module.css'

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
// Segmented pills, like the rest of the site: a quiet track and a filled primary pill for the choice.
const pillTrack = 'inline-flex items-center gap-1 rounded-full border border-border bg-background p-1'
const pillItem = 'inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:line-through disabled:hover:text-muted-foreground'
// Each style family is a tile with a sample of its look, as in the editors; four to a row, or one row that scrolls on a phone.
const familyTrack = 'flex gap-2 overflow-x-auto p-0.5 sm:grid sm:grid-cols-4 sm:overflow-visible'
const familyTile = 'flex min-w-[7.5rem] shrink-0 flex-col items-start gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 disabled:line-through data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:ring-1 data-[state=on]:ring-primary sm:min-w-0 sm:shrink'
const toggleItem = pillItem + ' data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary data-[state=on]:hover:text-primary-foreground'
const tabClass = pillItem + ' data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary data-[state=active]:hover:text-primary-foreground'

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
    if (selected && glass !== 'unavailable') {
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
  // Families whose sheets and fonts were already requested (by the idle preload or a hover), so none is fetched twice.
  const preloaded = useRef(new Set<StyleFamily>())
  useEffect(() => preloadOtherFamilies(id, family, preloaded.current), [id])
  const height = tallPreviews[id] ?? 420
  const families = familyOptions.map(option => {
    const tile = { ...option, icon: <span className={sampleStyles.sample} data-family={option.value} aria-hidden="true"><i /><i /></span> }
    return option.value === 'liquid-glass'
      ? glass === 'unavailable'
        ? { ...tile, disabled: true, title: `${name} is not available in liquid glass` }
        : { ...tile, label: 'Liquid Glass', hint: accessibilityCaveatLabel }
      : tile
  })
  return (
    <Tabs.Root defaultValue="preview" className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="space-y-3 border-b border-border bg-muted/50 p-3 sm:p-4">
        <ToggleGroup label="Style family" value={pendingFamily} options={families} onValueChange={pickFamily}
          onItemIntent={(value) => preloadFamily(id, value, preloaded.current)}
          className={familyTrack} itemClassName={familyTile} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs.List aria-label={`${name} example`} className={pillTrack}>
            <Tabs.Trigger value="preview" className={tabClass}><Eye aria-hidden="true" className="size-4" />Preview</Tabs.Trigger>
            <Tabs.Trigger value="code" className={tabClass}><Code aria-hidden="true" className="size-4" />Code</Tabs.Trigger>
          </Tabs.List>
          <div className="flex flex-wrap items-center gap-3">
            <span role="status" className="inline-flex w-48 items-center gap-2 whitespace-nowrap text-xs font-medium text-muted-foreground">
              <span aria-hidden="true" className={'size-2 rounded-full ' + (status === 'ready' ? 'bg-primary' : status === 'failed' ? 'bg-destructive' : 'animate-pulse bg-muted-foreground')} />
              {status === 'ready' ? `${familyOptions.find(o => o.value === family)!.label} · ${resolvedMode}` : status === 'failed' ? 'Preview unavailable' : 'Loading preview…'}
            </span>
            <ModeToggle mode={resolvedMode} onChange={setMode} />
          </div>
        </div>
        {family === 'liquid-glass' && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/70 px-3 py-2">
            <GlassPresetSelect value={glassPreset} onChange={(id) => { if (id) { setGlassPreset(id); setBackdropOverride(null) } }} />
            <ToggleGroup label="Preview backdrop" value={backdrop} options={glassBackdropOptions} onValueChange={setBackdropOverride}
              className={pillTrack + ' flex-wrap'} itemClassName={toggleItem} />
            <a href={glassDocs} className="text-sm font-medium text-foreground underline decoration-primary underline-offset-4 transition-colors hover:text-primary hover:decoration-2">Liquid Glass limitations</a>
          </div>
        )}
        {glass === 'unavailable' && (
          <p className="text-sm text-muted-foreground">{name} is not available in liquid glass; the CLI refuses it in glass projects.</p>
        )}
      </div>
      <Tabs.Content value="preview" forceMount className="data-[state=inactive]:hidden">
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
      </Tabs.Content>
      <Tabs.Content value="code" className="space-y-3 p-3 sm:p-4">
        <SourceBlock code={source} title={`components/ui/${id}.tsx`} maxHeight="28rem" />
        {css && <SourceBlock code={css} title={`${family} styles`} maxHeight="20rem" />}
        {family === 'liquid-glass' && glassCss && <SourceBlock code={glassCss} title="Liquid Glass · shared material" maxHeight="20rem" />}
      </Tabs.Content>
    </Tabs.Root>
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

/** Requests a built-in family's stylesheets and fonts, once per record; Liquid Glass and iframe-only components have none. */
function preloadFamily(id: ComponentId, family: StyleFamily, done: Set<StyleFamily>) {
  if (family === 'liquid-glass' || previewPath(id, family) !== 'inline' || done.has(family)) return
  done.add(family)
  for (const href of previewStylesheets(family as BuiltInFamily, id)) preload(href, { as: 'style' })
  void loadFamilyFonts(family as BuiltInFamily).catch(() => undefined)
}

/** Warms the stylesheets and fonts of the other families while the browser is idle, so switching family does not wait on the network. */
function preloadOtherFamilies(id: ComponentId, current: StyleFamily, done: Set<StyleFamily>): () => void {
  const run = () => {
    for (const { value } of familyOptions) if (value !== current) preloadFamily(id, value, done)
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

/** One button for the preview's light or dark mode: its icon is the mode it switches to, as in the header. */
function ModeToggle({ mode, onChange }: { mode: 'light' | 'dark'; onChange: (mode: 'light' | 'dark') => void }) {
  const dark = mode === 'dark'
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Toggle variant="outline" size="sm" aria-label="Dark preview" pressed={dark} onPressedChange={next => onChange(next ? 'dark' : 'light')}>
            {dark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          </Toggle>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content sideOffset={8} className="z-50 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background shadow-md">
            {dark ? 'Switch to the light preview' : 'Switch to the dark preview'}
            <Tooltip.Arrow className="fill-foreground" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
