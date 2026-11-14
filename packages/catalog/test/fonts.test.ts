import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fontById, fontRegistry } from '../src/fonts.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const cssOf = (specifier: string) =>
  fs.readFileSync(
    path.join(
      here,
      '..',
      'node_modules',
      specifier.endsWith('.css') ? specifier : specifier + '/index.css',
    ),
    'utf8',
  )

describe('font registry', () => {
  it('has unique kebab-case ids', () => {
    const ids = fontRegistry.map((font) => font.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('marks exactly Bricolage Grotesque, Michroma and Young Serif display-only', () => {
    const displayOnly = fontRegistry
      .filter((font) => font.roles.length === 1 && font.roles[0] === 'display')
      .map((font) => font.id)
      .sort()
    expect(displayOnly).toEqual(['bricolage-grotesque', 'michroma', 'young-serif'])
  })

  it('gives mono fonts only the mono role', () => {
    for (const font of fontRegistry.filter((f) => f.roles.includes('mono')))
      expect(font.roles).toEqual(['mono'])
  })

  it('lets every body font also serve as a display font', () => {
    for (const font of fontRegistry.filter((f) => f.roles.includes('body')))
      expect(font.roles).toContain('display')
  })

  it('pins every Fontsource package to an exact version and OFL licence', () => {
    for (const font of fontRegistry) {
      expect(font.fontsource.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(font.license).toBe('OFL-1.1')
      expect(font.fontsource.imports.length).toBeGreaterThan(0)
    }
  })

  it('names the family the installed Fontsource CSS declares', () => {
    for (const font of fontRegistry) {
      const family = font.stack.split(',')[0].trim().replace(/^'|'$/g, '')
      expect(cssOf(font.fontsource.imports[0]), font.id).toContain(
        `font-family: '${family}'`,
      )
    }
  })

  it('resolves registry ids and not system ids or unknown ids', () => {
    expect(fontById('inter')?.label).toBe('Inter')
    expect(fontById('system-sans')).toBeUndefined()
    expect(fontById('not-a-font')).toBeUndefined()
  })

  it('lists every font id and licence in docs/fonts.md', () => {
    const docs = fs.readFileSync(path.join(here, '../../../docs/fonts.md'), 'utf8')
    for (const font of fontRegistry) {
      expect(docs, font.id).toContain('`' + font.id + '`')
      expect(docs).toContain(font.license)
    }
  })
})
