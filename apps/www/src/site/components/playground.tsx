'use client'

import * as Tabs from '@radix-ui/react-tabs'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Code, Eye, Moon, Sun } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { defaultGlassPresetId, type StartingPresetId } from '@ombelle/catalog'
import { styleSupport, type ComponentId, type StyleFamily } from '@ombelle/contracts'
import { offeredStyleFamilies } from '../../snapshots/install-command'
import { applyStartingPreset, createPresetDraft, materializePreset } from '../../preset-editor/model'
import { labInkFor, pickGlassScene } from '../glass-backdrops'
import { usePresetCompiler } from '../../preset-editor/use-preset-compiler'
import { PresetPreviewFrame } from '../../preset-editor/components/preset-preview-frame'
import { ToggleGroup } from '../toggle-group'
import { GlassPresetSelect } from '../glass-preset-select'
import { glassBackdropOptions, glassPresetBackdrop, glassPresetId } from '../glass-presets'
import type { PresetBackdrop } from '../../preset-editor/preview-protocol'
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
  const [family, setFamily] = useState<StyleFamily>(familyOptions[0]!.value)
  const [glassPreset, setGlassPreset] = useState<StartingPresetId>(defaultGlassPresetId)
  const [mode, setMode] = useState<'light' | 'dark'>('light')
  // The backdrop follows the glass preset and mode until the reader picks one; changing preset resets it.
  const [backdropOverride, setBackdropOverride] = useState<PresetBackdrop | null>(null)
  const [status, setStatus] = useState<'connecting' | 'ready' | 'failed'>('connecting')
  const glass = styleSupport(id, 'liquid-glass')
  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) setMode('dark')
    const selected = glassPresetId(new URLSearchParams(window.location.search).get('glass'))
    if (selected && glass === 'experimental') {
      setGlassPreset(selected)
      setFamily('liquid-glass')
    }
  }, [glass])
  const draft = useMemo(() => {
    const base = createPresetDraft(family)
    return family === 'liquid-glass' ? applyStartingPreset(base, glassPreset) : base
  }, [family, glassPreset])
  const compiled = usePresetCompiler(draft)
  // The same automatic scene and lab ink as the preset editor; the reader's pick overrides it.
  const glassData = useMemo(() => {
    if (family !== 'liquid-glass') return null
    try { return materializePreset(draft) } catch { return null }
  }, [family, draft])
  const backdrop = backdropOverride ?? (glassData ? pickGlassScene(glassData, mode, glassPreset) : glassPresetBackdrop(glassPreset, mode))
  const labInk = glassData ? labInkFor(glassData, mode, backdrop) : null
  const css = styles[family]
  const glassCss = family === 'liquid-glass' && compiled.result?.preset.data.styleFamily === family && !compiled.stale
    ? compiled.result?.artifacts.find(({ logicalPath }) => logicalPath === 'styles/ui-style.css')?.content
    : undefined
  const families = familyOptions.map(option => {
    const tile = { ...option, icon: <span className={sampleStyles.sample} data-family={option.value} aria-hidden="true"><i /><i /></span> }
    return option.value === 'liquid-glass'
      ? glass === 'unavailable'
        ? { ...tile, disabled: true, title: `${name} is not available in liquid glass` }
        : { ...tile, label: 'Liquid Glass', hint: 'experimental' }
      : tile
  })
  return (
    <Tabs.Root defaultValue="preview" className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="space-y-3 border-b border-border bg-muted/50 p-3 sm:p-4">
        <ToggleGroup label="Style family" value={family} options={families} onValueChange={setFamily}
          className={familyTrack} itemClassName={familyTile} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs.List aria-label={`${name} example`} className={pillTrack}>
            <Tabs.Trigger value="preview" className={tabClass}><Eye aria-hidden="true" className="size-4" />Preview</Tabs.Trigger>
            <Tabs.Trigger value="code" className={tabClass}><Code aria-hidden="true" className="size-4" />Code</Tabs.Trigger>
          </Tabs.List>
          <div className="flex flex-wrap items-center gap-3">
            <span role="status" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span aria-hidden="true" className={'size-2 rounded-full ' + (status === 'ready' ? 'bg-primary' : status === 'failed' ? 'bg-destructive' : 'animate-pulse bg-muted-foreground')} />
              {status === 'ready' ? `${familyOptions.find(o => o.value === family)!.label} · ${mode}` : status === 'failed' ? 'Preview unavailable' : 'Loading preview…'}
            </span>
            <ModeToggle mode={mode} onChange={setMode} />
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
        <PresetPreviewFrame
          result={compiled.result}
          view={{ mode, viewport: 'wide', focus: id, backdrop: family === 'liquid-glass' ? backdrop : undefined, labInk: labInk ?? undefined }}
          stale={compiled.stale}
          onStatus={setStatus}
          title={`${name} preview`}
          height={tallPreviews[id] ?? 420}
          caption={false}
        />
      </Tabs.Content>
      <Tabs.Content value="code" className="space-y-3 p-3 sm:p-4">
        <SourceBlock code={source} title={`components/ui/${id}.tsx`} maxHeight="28rem" />
        {css && <SourceBlock code={css} title={`${family} styles`} maxHeight="20rem" />}
        {glassCss && <SourceBlock code={glassCss} title="Liquid Glass · shared material" maxHeight="20rem" />}
      </Tabs.Content>
    </Tabs.Root>
  )
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
