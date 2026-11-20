import { expect, it } from 'vitest'
import { latinFaceUrl, rehostFontCss, slotsUsingFont } from '../../../../scripts/www-previews/self-hosted-fonts'

const fontsource = `/* x-latin-ext-wght-normal */
@font-face {
  font-family: 'X Variable';
  font-style: normal;
  src: url(./files/x-latin-ext-wght-normal.woff2) format('woff2-variations');
  unicode-range: U+0100-02BA;
}
/* x-latin-wght-italic */
@font-face {
  font-family: 'X Variable';
  font-style: italic;
  src: url(./files/x-latin-wght-italic.woff2) format('woff2-variations');
  unicode-range: U+0000-00FF,U+0131;
}
/* x-latin-wght-normal */
@font-face {
  font-family: 'X Variable';
  font-style: normal;
  src: url(./files/x-latin-wght-normal.woff2) format('woff2-variations');
  unicode-range: U+0000-00FF,U+0131;
}`

it('serves the font files from a fixed public path', () => {
  const { css, files } = rehostFontCss(fontsource, '/previews/fonts')
  expect(files).toEqual(['x-latin-ext-wght-normal.woff2', 'x-latin-wght-italic.woff2', 'x-latin-wght-normal.woff2'])
  expect(css).toContain("url(/previews/fonts/x-latin-wght-normal.woff2) format('woff2-variations')")
  expect(css).not.toContain('./files/')
})

it('finds the upright Latin face of a font stack', () => {
  const { css } = rehostFontCss(fontsource, '/previews/fonts')
  expect(latinFaceUrl(css, "'X Variable', system-ui, sans-serif")).toBe('/previews/fonts/x-latin-wght-normal.woff2')
  expect(latinFaceUrl(css, "'Y Variable', system-ui")).toBeUndefined()
})

it('names the slots a font variable styles', () => {
  const css = `[s] [data-slot='pv-card-title'], [s] [data-slot="pv-kbd"]{font-family:var(--font-heading)}[s] [data-slot='pv-button']{color:red}`
  expect([...slotsUsingFont(css, '--font-heading')].sort()).toEqual(['card-title', 'kbd'])
  expect([...slotsUsingFont(css, '--font-mono')]).toEqual([])
})
