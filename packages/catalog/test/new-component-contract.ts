import { expect } from 'vitest'
import { getCatalog, getTemplate } from '../src/index.js'
import {
  styleSupport,
  supportedStyleFamilies,
  type ComponentId,
} from '@ombelle/contracts'

/** Shared catalog contract for components added after the first twelve. */
export function expectComponentContract(
  id: ComponentId,
  expected: {
    client: boolean
    parts: readonly string[]
    slots: readonly string[]
    dependencies: readonly { name: string; version: string }[]
    selectors: readonly string[]
    glass: 'experimental' | 'unavailable'
  },
) {
  const template = getTemplate(getCatalog('0.1.0'), id)
  expect(template.logicalPath).toBe(`components/ui/${id}.tsx`)
  expect(template.slots).toEqual(expected.slots)
  expect(template.dependencies).toEqual(expected.dependencies)
  if (expected.client)
    expect(template.content).toMatch(/^['"]use client['"]/)
  else expect(template.content).not.toMatch(/use client/)
  expect(template.content).toContain(`import './${id}.css'`)
  expect(template.content).toContain("from './utils.js'")
  for (const part of expected.parts)
    expect(template.content).toContain(`export function ${part}(`)
  for (const slot of expected.slots)
    expect(template.content).toContain(`data-slot="${slot}"`)
  for (const family of supportedStyleFamilies) {
    const css = template.styles?.[family]
    expect(css, `${id} ${family} styles`).toBeTruthy()
    expect(css).toMatch(new RegExp(`^/\\* ${family} `))
    for (const selector of [
      ...expected.selectors,
      '@media (forced-colors: active)',
    ])
      expect(css, `${id} ${family} ${selector}`).toContain(selector)
    // Logical properties keep the styles direction-agnostic.
    expect(css).not.toMatch(/(?:^|[\s;{])(?:left|right|top|bottom):/m)
    expect(css).not.toMatch(/margin-(?:left|right)|padding-(?:left|right)/)
  }
  expect(styleSupport(id, 'liquid-glass')).toBe(expected.glass)
  if (expected.glass === 'experimental')
    expect(template.styles?.['liquid-glass']).toContain(
      '@media (forced-colors: active)',
    )
  else expect(template.styles?.['liquid-glass']).toBeUndefined()
}
