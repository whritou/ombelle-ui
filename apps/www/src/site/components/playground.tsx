'use client'

import * as Tabs from '@radix-ui/react-tabs'
import { useEffect, useMemo, useState } from 'react'
import { defaultGlassPresetId, type StartingPresetId } from '@ombelle/catalog'
import { styleSupport, type ComponentId, type StyleFamily } from '@ombelle/contracts'
import { offeredStyleFamilies } from '../../snapshots/install-command'
import { applyStartingPreset, createPresetDraft } from '../../preset-editor/model'
import { usePresetCompiler } from '../../preset-editor/use-preset-compiler'
import { PresetPreviewFrame } from '../../preset-editor/components/preset-preview-frame'
import { ToggleGroup } from '../toggle-group'
import { GlassPresetSelect } from '../glass-preset-select'
import { glassBackdropOptions, glassPresetBackdrop, glassPresetId } from '../glass-presets'
import type { PresetBackdrop } from '../../preset-editor/preview-protocol'
import { CodeBlock } from './code-block'

// Exhaustive by type: adding a style family fails the typecheck until it has a label.
const familyLabels: Record<StyleFamily, string> = {
  flat: 'Flat',
  minimalist: 'Minimalist',
  'neo-brutalism': 'Neo-Brutalism',
  ombelle: 'Ombelle',
  'liquid-glass': 'Liquid Glass',
}
// Same gate as the editors: only families the published installer can install.
export const familyOptions: { value: StyleFamily; label: string }[] = offeredStyleFamilies().map((value) => ({
  value,
  label: familyLabels[value],
}))
const glassDocs = '/docs/style-families#liquid-glass'
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
  const [family, setFamily] = useState<StyleFamily>(familyOptions[0]!.value)
  const [glassPreset, setGlassPreset] = useState<StartingPresetId>(defaultGlassPresetId)
  // The backdrop follows the glass preset until the reader picks one; changing preset resets it.
  const [backdropOverride, setBackdropOverride] = useState<PresetBackdrop | null>(null)
  const backdrop = backdropOverride ?? glassPresetBackdrop(glassPreset)
  const [mode, setMode] = useState<'light' | 'dark'>('light')
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
  const css = styles[family]
  const glassCss = family === 'liquid-glass' && compiled.result?.preset.data.styleFamily === family && !compiled.stale
    ? compiled.result?.artifacts.find(({ logicalPath }) => logicalPath === 'styles/ui-style.css')?.content
    : undefined
  const families = familyOptions.map(option =>
    option.value === 'liquid-glass'
      ? glass === 'unavailable'
        ? { ...option, disabled: true, title: `${name} is not available in liquid glass` }
        : { ...option, label: 'Liquid Glass (experimental)' }
      : option)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup label="Style family" value={family} options={families} onValueChange={setFamily}
          className="inline-flex rounded-lg bg-muted p-1" itemClassName={toggleItem} />
        <ToggleGroup label="Preview mode" value={mode} options={modeOptions} onValueChange={setMode}
          className="inline-flex rounded-lg bg-muted p-1" itemClassName={toggleItem} />
        <span role="status" className="ml-auto text-xs text-muted-foreground">
          {status === 'ready' ? `${familyOptions.find(o => o.value === family)!.label} · ${mode}` : status === 'failed' ? 'Preview unavailable' : 'Loading preview…'}
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
            <PresetPreviewFrame
              result={compiled.result}
              view={{ mode, viewport: 'wide', focus: id, backdrop: family === 'liquid-glass' ? backdrop : undefined }}
              stale={compiled.stale}
              onStatus={setStatus}
              title={`${name} preview`}
              height={420}
              caption={false}
            />
          </div>
        </Tabs.Content>
        <Tabs.Content value="code" className="mt-3 space-y-3">
          <CodeBlock code={source} title={`components/ui/${id}.tsx`} maxHeight="28rem" />
          {css && <CodeBlock code={css} title={`${family} styles`} maxHeight="20rem" />}
          {glassCss && <CodeBlock code={glassCss} title="Liquid Glass · shared material" maxHeight="20rem" />}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
