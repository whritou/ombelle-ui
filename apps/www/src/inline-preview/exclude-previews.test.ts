import { expect, it } from 'vitest'
import { excludePreviewSubtrees, previewExclusion } from '../../../../scripts/www-previews/exclude-previews'

const compact = (css: string) => css.replace(/\s+/g, ' ').replace(/ ?([{};,>]) ?/g, '$1').trim()
const not = previewExclusion

it('keeps every site component rule off the elements of an inline preview', () => {
  expect(compact(excludePreviewSubtrees(`[data-button-group-button]{a:b}[data-code-block-mode='command'] > [role='tabpanel'], [data-menubar-dot]{c:d}`)))
    .toBe(`[data-button-group-button]${not}{a:b}[data-code-block-mode='command']>[role='tabpanel']${not},[data-menubar-dot]${not}{c:d}`)
})

it('puts the exclusion before pseudo-elements', () => {
  expect(compact(excludePreviewSubtrees(`[data-x]::placeholder{a:b}[data-y]:hover::before{c:d}::selection{e:f}[data-z]:after{g:h}`)))
    .toBe(`[data-x]${not}::placeholder{a:b}[data-y]:hover${not}::before{c:d}${not}::selection{e:f}[data-z]${not}:after{g:h}`)
})

it('scopes rules inside media queries and leaves keyframes alone', () => {
  expect(compact(excludePreviewSubtrees(`@media (forced-colors: active){[data-x]{a:b}}@keyframes k{from{opacity:0}to{opacity:1}}`)))
    .toBe(`@media (forced-colors: active){[data-x]${not}{a:b}}@keyframes k{from{opacity:0}to{opacity:1}}`)
})

it('adds no specificity', () => expect(not).toBe(':not(:where([data-preview-family] *))'))
