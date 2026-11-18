import type { StyleFamily } from '@ombelle/contracts'
import { familyHeadings } from '../families'

/** The support matrix's cell labels, shared by the plain table and the Data Table. */
export const supportLabels = { stable: 'Stable', experimental: 'Experimental', unavailable: 'Unavailable' } as const

/** A family's column title in the support matrix. */
export function familyColumnTitle(family: StyleFamily): string {
  return family === 'liquid-glass' ? 'Liquid Glass' : familyHeadings[family]
}
