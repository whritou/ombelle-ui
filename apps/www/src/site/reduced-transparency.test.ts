import { expect, it } from 'vitest'
import { mirrorReducedTransparency, prefixReducedTransparency, reducedTransparencyState, reducedTransparencySupported, type MirrorRule } from './reduced-transparency'

const style = (selector: string, body = 'background: red;'): MirrorRule => ({ kind: 'style', selector, body })
const media = (condition: string, ...rules: MirrorRule[]): MirrorRule => ({ kind: 'media', condition, rules })
const flat = (css: string) => css.replace(/\s+/g, ' ').trim()
const on = ':where(html[data-reduced-transparency], html[data-reduced-transparency] *)'
const off = ':where(html:not([data-reduced-transparency]), html:not([data-reduced-transparency]) *)'

it('copies a reduce rule under the attribute', () => {
  const css = flat(mirrorReducedTransparency([media('(prefers-reduced-transparency: reduce)', style("[data-slot='card']"))]))
  expect(css).toBe(`[data-slot='card']${on} { background: red; }`)
})

it('gates the subject, so html, :root and ancestors on html still match', () => {
  const css = flat(mirrorReducedTransparency([media('(prefers-reduced-transparency:reduce)', style(':root'), style('html.dark x'), style('.dark x'))]))
  expect(css).toContain(`:root${on} { background: red; }`)
  expect(css).toContain(`html.dark x${on} { background: red; }`)
  expect(css).toContain(`.dark x${on} { background: red; }`)
})

it('keeps a pseudo-element last', () => {
  expect(flat(mirrorReducedTransparency([media('(prefers-reduced-transparency: reduce)', style("[data-slot='card']::after, .a:hover::before"))])))
    .toBe(`[data-slot='card']${on}::after, .a:hover${on}::before { background: red; }`)
})

it('reads the boolean form as reduce', () => {
  expect(reducedTransparencyState('(prefers-reduced-transparency)')).toBe('on')
})

it('inverts not-reduce and no-preference', () => {
  for (const condition of ['not (prefers-reduced-transparency: reduce)', '(prefers-reduced-transparency: no-preference)'])
    expect(flat(mirrorReducedTransparency([media(condition, style('.lab'))]))).toBe(`.lab${off} { background: red; }`)
})

it('keeps the other conditions of the query', () => {
  expect(flat(mirrorReducedTransparency([media('(prefers-reduced-transparency: reduce) and (min-width: 40rem)', style('.a'))])))
    .toBe(`@media (min-width: 40rem) { .a${on} { background: red; } }`)
  expect(flat(mirrorReducedTransparency([media('(forced-colors: none) and (prefers-reduced-transparency: no-preference)', style('.a'))])))
    .toBe(`@media (forced-colors: none) { .a${off} { background: red; } }`)
})

it('applies a query list whose branch is reduce alone', () => {
  expect(flat(mirrorReducedTransparency([media('(prefers-reduced-transparency: reduce), (forced-colors: active)', style('.a'))])))
    .toBe(`.a${on} { background: red; }`)
})

it('keeps nesting around the copied rule', () => {
  const tree: MirrorRule[] = [{ kind: 'supports', condition: '(backdrop-filter: blur(1px))', rules: [
    { kind: 'layer', condition: 'components', rules: [media('(prefers-reduced-transparency: reduce)', style('.a'))] },
  ] }]
  expect(flat(mirrorReducedTransparency(tree)))
    .toBe(`@supports (backdrop-filter: blur(1px)) { @layer components { .a${on} { background: red; } } }`)
})

it('prefixes every selector of a list, leaving commas inside :is alone', () => {
  expect(flat(mirrorReducedTransparency([media('(prefers-reduced-transparency: reduce)', style('.a, :is(.b, .c) > .d'))])))
    .toBe(`.a${on}, :is(.b, .c) > .d${on} { background: red; }`)
})

it('ignores rules outside a reduced-transparency query', () => {
  expect(mirrorReducedTransparency([style('.a'), media('(prefers-color-scheme: dark)', style('.b'))])).toBe('')
})

it('resolves nested rules against their parent selector', () => {
  const nested: MirrorRule = { kind: 'style', selector: "[data-slot='button']", body: 'color: red;', rules: [
    media('(prefers-reduced-transparency: reduce)', style('&', 'background: var(--card);'), style('& > .icon', 'opacity: 1;'), style('.label', 'color: blue;')),
  ] }
  expect(flat(mirrorReducedTransparency([nested]))).toBe([
    `[data-slot='button']${on} { background: var(--card); }`,
    `:is([data-slot='button']) > .icon${on} { opacity: 1; }`,
    `:is([data-slot='button']) .label${on} { color: blue; }`,
  ].join(' '))
})

it('reads the state a media condition gives and prefixes a selector for it', () => {
  expect(reducedTransparencyState('(prefers-reduced-transparency: reduce), (forced-colors: active)')).toBe('on')
  expect(reducedTransparencyState('not (prefers-reduced-transparency: reduce)')).toBe('off')
  expect(reducedTransparencyState('(forced-colors: none) and (prefers-reduced-transparency: no-preference)')).toBe('off')
  expect(reducedTransparencyState('(min-width: 40rem)')).toBeUndefined()
  expect(prefixReducedTransparency("[data-slot='card'][data-density], :root", 'off')).toBe(`[data-slot='card'][data-density]${off}, :root${off}`)
})

it('detects whether the browser recognises the media feature', () => {
  const browser = (media: string) => () => ({ media }) as MediaQueryList
  expect(reducedTransparencySupported(browser('(prefers-reduced-transparency: reduce)'))).toBe(true)
  // An unknown media feature makes the whole query "not all" (Safari, and Firefox without its pref).
  expect(reducedTransparencySupported(browser('not all'))).toBe(false)
  expect(reducedTransparencySupported(undefined)).toBe(false)
})
