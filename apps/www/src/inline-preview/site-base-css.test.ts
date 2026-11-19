import { readFileSync } from 'node:fs'
import postcss, { type AtRule, type Rule } from 'postcss'
import { expect, it } from 'vitest'

const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const exemption = ':not(:where([data-preview-family] *))'

it("keeps the site's element rules out of inline previews", () => {
  const base = postcss.parse(globals).nodes.find((node): node is AtRule => node.type === 'atrule' && node.name === 'layer' && node.params === 'base')!
  // Direct rules only: page-level ones (html, body, iframe) cannot reach a preview's elements.
  const rules = base.nodes!.filter((node): node is Rule => node.type === 'rule' && !/^(html|body|iframe)$/.test(node.selector))
  expect(rules.map((rule) => rule.selector)).toEqual([
    `*${exemption}`,
    `:where(h1, h2, h3)${exemption}`,
    `:focus-visible${exemption}`,
  ])
})
