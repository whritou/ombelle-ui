import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentId } from '@ombelle/contracts'
import { getCatalog, getTemplate } from '../src/index.js'
const dir = new URL('../src/templates/base/', import.meta.url)
const ids = fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => f.endsWith('.tsx')).map((f) => f.slice(0, -4) as ComponentId)
  : []
const catalog = getCatalog('0.1.0')
const require = createRequire(import.meta.url)
const slotsIn = (source: string) =>
  new Set([...source.matchAll(/data-slot=(?:"|')([a-z-]+)(?:"|')/g)].map((m) => m[1]))

it('has at least the Base UI Button', () => {
  expect(ids).toContain('button')
})

describe.each(ids)('Base UI %s template', (id) => {
  const base = getTemplate(catalog, id, 'base'),
    radix = getTemplate(catalog, id, 'radix')
  it('is a client component without Radix or asChild', () => {
    expect(base.content.startsWith("'use client'")).toBe(true)
    expect(base.content).not.toMatch(/@radix-ui\//)
    expect(base.content).not.toMatch(/asChild/)
  })
  it('emits the same slots as the Radix template', () => {
    expect(slotsIn(base.content)).toEqual(slotsIn(radix.content))
  })
  it('imports only Base UI subpaths that exist in the pinned package', () => {
    for (const [, spec] of base.content.matchAll(/from '(@base-ui\/react[^']*)'/g))
      expect(() => require.resolve(spec!), spec).not.toThrow()
  })
})

it('renders a loading Base UI Button as busy and disabled', async () => {
  const mod = await import('../src/templates/base/button.tsx')
  const html = renderToStaticMarkup(createElement(mod.Button, { loading: true }, 'Save'))
  expect(html).toContain('aria-busy="true"')
  expect(html).toMatch(/ disabled=""/)
  expect(html).toContain('data-slot="button"')
  expect(html).toContain('data-variant="default"')
  expect(html).toContain('data-slot="button-spinner"')
})
