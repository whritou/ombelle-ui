'use client'

import * as Tabs from '@radix-ui/react-tabs'
import { Code, Eye, Monitor, Smartphone, Tablet } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { accessibilityCaveatLabel, type BlockId, type StyleFamily } from '@ombelle/contracts'
import { CodeBlock } from '../../generated/ui/components/ui/code-block'
import { useSiteDark } from '../theme'
import { ToggleGroup } from '../toggle-group'
import { codeLanguage } from '../components/code-language'
import { FamilySample, ModeToggle, familyLabels, familyOptions, familyTile, familyTrack, glassDocs, pillTrack, tabClass, toggleItem } from '../components/preview-controls'
import { BlockFrame } from './block-frame'

type Edition = 'radix' | 'base'
type Width = '375' | '768' | 'full'
const widthOptions: { value: Width; label: string; icon: ReactNode }[] = [
  { value: '375', label: 'Phone · 375', icon: <Smartphone aria-hidden="true" className="size-4" /> },
  { value: '768', label: 'Tablet · 768', icon: <Tablet aria-hidden="true" className="size-4" /> },
  { value: 'full', label: 'Desktop', icon: <Monitor aria-hidden="true" className="size-4" /> },
]
const editionOptions: { value: Edition; label: string }[] = [
  { value: 'radix', label: 'Radix' },
  { value: 'base', label: 'Base UI' },
]

/** The title of a block's preview frame: the block and the family it shows. */
export function blockFrameTitle(title: string, family: StyleFamily): string {
  return `${title} block, ${familyLabels[family]}`
}

/**
 * A block page's preview and code: the compiled block in the chosen family, mode and width, and the files
 * `add <block>` writes for the chosen edition.
 */
export function BlockPlayground({ id, title, sources, glassAvailable, initialHeight }: {
  id: BlockId
  title: string
  sources: Record<Edition, { tsx: string; css: string }>
  glassAvailable: boolean
  initialHeight: number
}) {
  const [family, setFamily] = useState<StyleFamily>(familyOptions[0]!.value)
  const [mode, setMode] = useState<'auto' | 'light' | 'dark'>('auto')
  const [width, setWidth] = useState<Width>('full')
  const [edition, setEdition] = useState<Edition>('radix')
  const siteDark = useSiteDark()
  const resolvedMode = mode === 'auto' ? (siteDark ? 'dark' : 'light') : mode
  const families = familyOptions.map(option => {
    const tile = { ...option, icon: <FamilySample family={option.value} /> }
    if (option.value !== 'liquid-glass') return tile
    return glassAvailable
      ? { ...tile, hint: accessibilityCaveatLabel }
      : { ...tile, disabled: true, title: `${title} is not available in liquid glass` }
  })
  const source = sources[edition]
  return (
    <Tabs.Root defaultValue="preview" className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="space-y-3 border-b border-border bg-muted/50 p-3 sm:p-4">
        <ToggleGroup label="Style family" value={family} options={families} onValueChange={setFamily} className={familyTrack} itemClassName={familyTile} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs.List aria-label={`${title} block`} className={pillTrack}>
            <Tabs.Trigger value="preview" className={tabClass}><Eye aria-hidden="true" className="size-4" />Preview</Tabs.Trigger>
            <Tabs.Trigger value="code" className={tabClass}><Code aria-hidden="true" className="size-4" />Code</Tabs.Trigger>
          </Tabs.List>
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup label="Preview width" value={width} options={widthOptions} onValueChange={setWidth} className={pillTrack + ' flex-wrap'} itemClassName={toggleItem} />
            <span role="status" className="whitespace-nowrap text-xs font-medium text-muted-foreground">{familyLabels[family]} · {resolvedMode}</span>
            <ModeToggle mode={resolvedMode} onChange={setMode} />
          </div>
        </div>
        {family === 'liquid-glass' && (
          <p className="rounded-xl border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
            Liquid glass: accessibility not guaranteed. Text contrast depends on the background behind the glass.{' '}
            <a href={glassDocs} className="font-medium text-foreground underline decoration-primary underline-offset-4 transition-colors hover:text-primary hover:decoration-2">Liquid Glass limitations</a>
          </p>
        )}
      </div>
      <Tabs.Content value="preview" forceMount className="bg-muted/30 p-3 data-[state=inactive]:hidden sm:p-4">
        <BlockFrame id={id} family={family} mode={resolvedMode} title={blockFrameTitle(title, family)}
          width={width === 'full' ? 'full' : Number(width)} initialHeight={initialHeight} />
      </Tabs.Content>
      <Tabs.Content value="code" className="space-y-3 p-3 sm:p-4">
        <ToggleGroup label="Edition" value={edition} options={editionOptions} onValueChange={setEdition} className={pillTrack} itemClassName={toggleItem} />
        <SourceBlock code={source.tsx} title={`components/blocks/${id}.tsx`} maxHeight="32rem" />
        <SourceBlock code={source.css} title={`components/blocks/${id}.css`} maxHeight="24rem" />
      </Tabs.Content>
    </Tabs.Root>
  )
}

/** A source file, highlighted in the language its title names. */
function SourceBlock({ code, title, maxHeight }: { code: string; title: string; maxHeight: string }) {
  return <CodeBlock code={code} title={title} language={codeLanguage(title)} maxHeight={maxHeight} />
}
