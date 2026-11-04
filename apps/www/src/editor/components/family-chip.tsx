'use client'

import { useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { styleFamilies, type StyleFamily } from '@ombelle/contracts'

export const familyNames: Record<StyleFamily, string> = {
  flat: 'Flat',
  minimalist: 'Minimalist',
  'neo-brutalism': 'Neo-brutalism',
  ombelle: 'Ombelle',
  'liquid-glass': 'Liquid glass',
}

export const familyPickerId = 'button-family-picker'

/** The top-bar chip naming the recipe's style family; it opens a picker with a small sample of each look. */
export function FamilyChip({ value, onChange }: { value: StyleFamily; onChange(family: StyleFamily): void }) {
  const chip = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={chip}
        type="button"
        className="be-family-chip"
        aria-label={`Style family: ${familyNames[value]}`}
        aria-haspopup="dialog"
        popoverTarget={familyPickerId}
      >
        <span className="be-family-dot" data-family={value} aria-hidden="true" />
        {familyNames[value]}
        <ChevronDown aria-hidden="true" size={14} />
      </button>
      <div id={familyPickerId} popover="auto" role="dialog" aria-label="Choose style family" className="be-family-popover">
        <div role="group" aria-label="Style family" className="be-families">
          {styleFamilies.map((family) => (
            <button
              key={family}
              type="button"
              className="be-family"
              data-family={family}
              aria-pressed={family === value}
              onClick={(event) => {
                event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover?.()
                onChange(family)
                // Hiding the popover is async for focus restoration; land on the chip explicitly.
                chip.current?.focus()
              }}
            >
              <span className="be-family-sample" aria-hidden="true">
                <i />
                <i />
              </span>
              <span>{familyNames[family]}</span>
              {family === 'liquid-glass' && <span className="be-family-tag">Experimental</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
