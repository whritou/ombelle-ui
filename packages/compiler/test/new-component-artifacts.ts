import { expect } from 'vitest'
import { getCatalog } from '@ombelle/catalog'
import type { ComponentId, StyleFamily } from '@ombelle/contracts'
import postcss, { type Container } from 'postcss'
import { compile } from '../src/index.js'

const input = (family: StyleFamily) => ({
  preset: getCatalog('0.1.0').presets[family],
  catalogRelease: '0.1.0',
  compilerVersion: '0.1.0',
})

// The compiler formats CSS, so compare whitespace- and quote-insensitively.
export const squash = (css: string) => css.replace(/\s+/g, '').replace(/'/g, '"')

export type Context = 'root' | 'supports' | 'reduced' | 'forced' | 'supports-forced' | 'motion'

const contextOf = (rule: postcss.Rule): Context => {
  const chain: string[] = []
  for (let p = rule.parent as Container | undefined; p && p.type !== 'root'; p = p.parent as Container | undefined)
    if (p.type === 'atrule') chain.push((p as postcss.AtRule).params.replace(/\s+/g, ''))
  const key = chain.join('|')
  if (key === '') return 'root'
  if (key.includes('prefers-reduced-transparency')) return 'reduced'
  if (key.includes('prefers-reduced-motion')) return 'motion'
  if (key.includes('forced-colors')) return key.includes('backdrop-filter') ? 'supports-forced' : 'forced'
  return 'supports'
}

/** Squashed declarations of every rule with exactly this (squashed) selector in this at-rule context. */
export function rulesIn(css: string, selector: string, context: Context = 'root') {
  const out: Record<string, string> = {}
  postcss.parse(css).walkRules((rule) => {
    if (contextOf(rule) !== context || !rule.selectors.map(squash).includes(squash(selector))) return
    rule.walkDecls((d) => {
      out[d.prop] = squash(d.value)
    })
  })
  return out
}

/** Declarations inside every forced-colors block, squashed. */
export const forcedBlock = (css: string) =>
  squash(css).split('@media(forced-colors:active){').slice(1).join('')

/**
 * Compiles one new component in a family and checks that the output is
 * deterministic, standalone, and leaves the existing artifacts byte-identical.
 */
export async function expectStandaloneArtifacts(
  family: StyleFamily,
  id: ComponentId,
  expected: { importLine: string; dependencies: readonly string[] },
) {
  // Input is unavailable in liquid glass; Card stands in for it there.
  const existing: ComponentId[] =
    family === 'liquid-glass' ? ['button', 'card', 'dialog'] : ['button', 'dialog', 'input']
  const legacy = await compile({ ...input(family), componentIds: existing })
  const result = await compile({ ...input(family), componentIds: [id] })
  const repeated = await compile({ ...input(family), componentIds: [id, id] })
  expect(repeated).toEqual(result)
  expect(result.artifacts.map((a) => a.logicalPath)).toEqual(
    [
      `components/ui/${id}.css`,
      `components/ui/${id}.tsx`,
      `examples/${id}.tsx`,
      'lib/utils.ts',
      'styles/ui-style.css',
      'styles/ui-tokens.css',
    ].concat(
      family === 'liquid-glass' ? ['components/ui/liquid-glass-filter.tsx'] : [],
    ).sort(),
  )
  const artifact = (path: string) =>
    result.artifacts.find((a) => a.logicalPath === path)!.content
  expect(artifact(`examples/${id}.tsx`)).toContain(expected.importLine)
  expect(artifact(`components/ui/${id}.tsx`)).toContain(`import './${id}.css'`)
  expect(artifact(`components/ui/${id}.tsx`)).toContain("from '@/lib/utils'")
  expect(result.dependencies.map((d) => d.name)).toEqual(
    [...expected.dependencies].sort(),
  )
  const combined = await compile({
    ...input(family),
    componentIds: [id, ...existing].reverse(),
  })
  for (const before of legacy.artifacts)
    expect(
      combined.artifacts.find((a) => a.logicalPath === before.logicalPath),
    ).toEqual(before)
  return { css: artifact(`components/ui/${id}.css`) }
}
