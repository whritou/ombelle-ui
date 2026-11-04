'use client'

import { type StyleFamily } from '@ombelle/contracts'
import { offeredStyleFamilies } from '../../snapshots/install-command'

export const familyNames: Record<StyleFamily, string> = {
  flat: 'Flat',
  minimalist: 'Minimalist',
  'neo-brutalism': 'Neo-brutalism',
  ombelle: 'Ombelle',
  'liquid-glass': 'Liquid glass',
}

/** Inspector cards for the recipe's style family, each with a small sample of its look. */
export function FamilyPicker({
  value,
  onChange,
  families = offeredStyleFamilies(value),
}: {
  value: StyleFamily
  onChange(family: StyleFamily): void
  /** Families to offer; defaults to those the published installer supports. */
  families?: readonly StyleFamily[]
}) {
  return (
    <div role="group" aria-label="Style family" className="be-families">
      {families.map((family) => (
        <button
          key={family}
          type="button"
          className="be-family"
          data-family={family}
          aria-pressed={family === value}
          onClick={() => onChange(family)}
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
  )
}
