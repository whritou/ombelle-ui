'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { accessibilityCaveatLabel, type BlockId, type ComponentId, type StyleFamily } from '@ombelle/contracts'
import { useSiteDark } from '../theme'
import { ToggleGroup } from '../toggle-group'
import { FamilySample, familyLabels, familyOptions, familyTile, familyTrack } from '../components/preview-controls'
import { blockFrameSrc } from './block-frame'

export type BlockCard = { id: BlockId; title: string; description: string; components: ComponentId[]; glass: boolean }

/** The desktop viewport a card's preview renders at, scaled down to the card. */
const viewport = { width: 1200, height: 760 }

/** The blocks as cards, each with a live preview in the family picked above them. */
export function BlockGallery({ blocks }: { blocks: BlockCard[] }) {
  const [family, setFamily] = useState<StyleFamily>(familyOptions[0]!.value)
  const mode = useSiteDark() ? 'dark' : 'light'
  const families = familyOptions.map(option => ({
    ...option,
    icon: <FamilySample family={option.value} />,
    ...(option.value === 'liquid-glass' ? { hint: accessibilityCaveatLabel } : {}),
  }))
  return (
    <div className="mt-8 space-y-6">
      <ToggleGroup label="Style family" value={family} options={families} onValueChange={setFamily} className={familyTrack} itemClassName={familyTile} />
      <div className="grid gap-6 md:grid-cols-2">
        {blocks.map(block => {
          // A block that has no glass version shows its first family instead.
          const shown = family === 'liquid-glass' && !block.glass ? familyOptions[0]!.value : family
          return (
            <article key={block.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-foreground/40">
              <Thumbnail id={block.id} family={shown} mode={mode} title={`${block.title} block, ${familyLabels[shown]}`} />
              <div className="flex flex-1 flex-col gap-3 border-t border-border p-5">
                <h2 className="text-xl font-black">
                  {/* The link covers the card, so the whole card is one target. */}
                  <Link href={`/blocks/${block.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-has-[a:focus-visible]:underline">{block.title}</Link>
                </h2>
                <p className="text-sm text-muted-foreground">{block.description}</p>
                <ul aria-label={`Components in ${block.title}`} className="mt-auto flex flex-wrap gap-1.5">
                  {block.components.map(component => (
                    <li key={component}><code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">{component}</code></li>
                  ))}
                </ul>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

/** A block at desktop width, scaled to the card. Inert: the card's title and text say what it is, and its link opens the block. */
function Thumbnail({ id, family, mode, title }: { id: BlockId; family: StyleFamily; mode: 'light' | 'dark'; title: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)
  useEffect(() => {
    const element = box.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setScale(entry!.contentRect.width / viewport.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={box} inert className="relative overflow-hidden bg-muted/40" style={{ aspectRatio: `${viewport.width} / ${viewport.height}` }}>
      <iframe
        title={title}
        src={blockFrameSrc(id, family, mode)}
        loading="lazy"
        sandbox="allow-scripts allow-forms"
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: viewport.width, height: viewport.height, transform: `scale(${scale})` }}
      />
    </div>
  )
}
