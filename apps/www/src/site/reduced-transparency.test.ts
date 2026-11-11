import { expect, it } from 'vitest'
import { mirrorReducedTransparency, prefixReducedTransparency, reducedTransparencyState, type MirrorRule } from './reduced-transparency'

const style = (selector: string, body = 'background: red;'): MirrorRule => ({ kind: 'style', selector, body })
const media = (condition: string, ...rules: MirrorRule[]): MirrorRule => ({ kind: 'media', condition, rules })
const flat = (css: string) => css.replace(/\s+/g, ' ').trim()

it('copies a reduce rule under the attribute', () => {
  const css = flat(mirrorReducedTransparency([media('(prefers-reduced-transparency: reduce)', style("[data-slot='card']"))]))
  expect(css).toBe(":where(html[data-reduced-transparency]) [data-slot='card'] { background: red; }")
})

it('maps :root and html selectors onto the attribute', () => {
  const css = flat(mirrorReducedTransparency([media('(prefers-reduced-transparency:reduce)', style(':root'), style('html.dark x'), style('html'))]))
  expect(css).toContain(':root:where([data-reduced-transparency]) { background: red; }')
  expect(css).toContain('html:where([data-reduced-transparency]) { background: red; }')
  expect(css).toContain('html:where([data-reduced-transparency]).dark x { background: red; }')
})

it('inverts not-reduce and no-preference', () => {
  for (const condition of ['not (prefers-reduced-transparency: reduce)', '(prefers-reduced-transparency: no-preference)'])
    expect(flat(mirrorReducedTransparency([media(condition, style('.lab'))]))).toBe(':where(html:not([data-reduced-transparency])) .lab { background: red; }')
})

it('keeps the other conditions of the query', () => {
  expect(flat(mirrorReducedTransparency([media('(prefers-reduced-transparency: reduce) and (min-width: 40rem)', style('.a'))])))
    .toBe('@media (min-width: 40rem) { :where(html[data-reduced-transparency]) .a { background: red; } }')
  expect(flat(mirrorReducedTransparency([media('(forced-colors: none) and (prefers-reduced-transparency: no-preference)', style('.a'))])))
    .toBe('@media (forced-colors: none) { :where(html:not([data-reduced-transparency])) .a { background: red; } }')
})

it('applies a query list whose branch is reduce alone', () => {
  expect(flat(mirrorReducedTransparency([media('(prefers-reduced-transparency: reduce), (forced-colors: active)', style('.a'))])))
    .toBe(':where(html[data-reduced-transparency]) .a { background: red; }')
})

it('keeps nesting around the copied rule', () => {
  const tree: MirrorRule[] = [{ kind: 'supports', condition: '(backdrop-filter: blur(1px))', rules: [
    { kind: 'layer', condition: 'components', rules: [media('(prefers-reduced-transparency: reduce)', style('.a'))] },
  ] }]
  expect(flat(mirrorReducedTransparency(tree)))
    .toBe('@supports (backdrop-filter: blur(1px)) { @layer components { :where(html[data-reduced-transparency]) .a { background: red; } } }')
})

it('prefixes every selector of a list, leaving commas inside :is alone', () => {
  expect(flat(mirrorReducedTransparency([media('(prefers-reduced-transparency: reduce)', style('.a, :is(.b, .c) > .d'))])))
    .toBe(':where(html[data-reduced-transparency]) .a, :where(html[data-reduced-transparency]) :is(.b, .c) > .d { background: red; }')
})

it('ignores rules outside a reduced-transparency query', () => {
  expect(mirrorReducedTransparency([style('.a'), media('(prefers-color-scheme: dark)', style('.b'))])).toBe('')
})

it('keeps the specificity of the copied rule', () => {
  // :where adds nothing, so the mirror wins and loses exactly where the media rule did.
  expect(flat(mirrorReducedTransparency([media('(prefers-reduced-transparency: reduce)', style('.a'))])))
    .toBe(':where(html[data-reduced-transparency]) .a { background: red; }')
})

it('resolves nested rules against their parent selector', () => {
  const nested: MirrorRule = { kind: 'style', selector: "[data-slot='button']", body: 'color: red;', rules: [
    media('(prefers-reduced-transparency: reduce)', style('&', 'background: var(--card);'), style('& > .icon', 'opacity: 1;'), style('.label', 'color: blue;')),
  ] }
  expect(flat(mirrorReducedTransparency([nested]))).toBe([
    ":where(html[data-reduced-transparency]) [data-slot='button'] { background: var(--card); }",
    ":where(html[data-reduced-transparency]) :is([data-slot='button']) > .icon { opacity: 1; }",
    ":where(html[data-reduced-transparency]) :is([data-slot='button']) .label { color: blue; }",
  ].join(' '))
})

it('reads the state a media condition gives and prefixes a selector for it', () => {
  expect(reducedTransparencyState('(prefers-reduced-transparency: reduce), (forced-colors: active)')).toBe('on')
  expect(reducedTransparencyState('not (prefers-reduced-transparency: reduce)')).toBe('off')
  expect(reducedTransparencyState('(forced-colors: none) and (prefers-reduced-transparency: no-preference)')).toBe('off')
  expect(reducedTransparencyState('(min-width: 40rem)')).toBeUndefined()
  expect(prefixReducedTransparency("[data-slot='card'][data-density], :root", 'off'))
    .toBe(":where(html:not([data-reduced-transparency])) [data-slot='card'][data-density], :root:where(:not([data-reduced-transparency]))")
})
