import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import postcss from 'postcss'

// DES-04: `design.motion: reduced` compiles to --motion-duration: 0ms, so a stable family must
// time its transitions and one-off animations from that token. Looping indicators (spinner,
// skeleton, the OTP caret) keep their own timing. Liquid glass is out of scope here.
const root = new URL('../src/styles/', import.meta.url)
const stable = ['flat', 'minimalist', 'neo-brutalism', 'ombelle', 'papier', 'organic', 'retro-futurism']
const files = [
  ...stable.map(family => `${family}.css`),
  ...readdirSync(root).filter(name => statSync(new URL(name, root)).isDirectory() && !['spinner', 'skeleton'].includes(name))
    .flatMap(dir => stable.map(family => `${dir}/${family}.css`)).filter(file => { try { statSync(new URL(file, root)); return true } catch { return false } }),
]
const literal = /(?<![\w.(-])\d*\.?\d+m?s\b/

describe('stable family motion follows --motion-duration', () => {
  it.each(files)('%s', (file) => {
    const offenders: string[] = []
    postcss.parse(readFileSync(new URL(file, root), 'utf8')).walkDecls(/^(transition|animation)(-duration)?$/, decl => {
      if (/infinite/.test(decl.value)) return
      const value = decl.value.replace(/var\(--motion-duration\s*,[^()]*(\([^()]*\)[^()]*)*\)/g, '')
      if (literal.test(value) && !/^0m?s$/.test(value.trim())) offenders.push(`${decl.prop}: ${decl.value}`)
    })
    expect(offenders).toEqual([])
  })
})
