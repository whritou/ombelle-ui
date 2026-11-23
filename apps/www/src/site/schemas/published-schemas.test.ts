import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, generateStaticParams } from '../../app/schemas/[name]/route'
import { headerRules } from '../../security-headers'
import { publishedSchemas } from './published-schemas'

// The build reads ../../schemas from apps/www; tests run from the repository root.
const root = process.cwd()
beforeEach(() => { vi.spyOn(process, 'cwd').mockReturnValue(path.join(root, 'apps/www')) })
afterEach(() => { vi.restoreAllMocks() })
const files = fs.readdirSync('schemas').filter((name) => name.endsWith('.json'))
const get = (name: string) => GET(new Request('http://localhost/schemas/' + name), { params: Promise.resolve({ name }) })

describe('the published JSON schemas (CMP-06)', () => {
  it.each(files)('serves %s at its $id path and its file name, byte for byte', async (file) => {
    const text = fs.readFileSync(path.join('schemas', file), 'utf8')
    const idName = new URL(JSON.parse(text).$id).pathname.split('/').pop()!
    for (const name of [idName, file]) {
      const response = await get(name)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/schema+json; charset=utf-8')
      expect(await response.text()).toBe(text)
    }
    expect(generateStaticParams()).toContainEqual({ name: idName })
  })

  it('serves every file in schemas/ and nothing else', async () => {
    expect(generateStaticParams().map(({ name }) => name)).toEqual(expect.arrayContaining(files))
    expect(generateStaticParams()).toHaveLength(new Set(publishedSchemas().keys()).size)
    expect((await get('secret.json')).status).toBe(404)
  })

  it('serves the $id paths the 1.0 schemas will carry', () => {
    const app = fs.mkdtempSync(path.join(os.tmpdir(), 'ombelle-schemas-'))
    try {
      fs.mkdirSync(path.join(app, 'apps/www'), { recursive: true })
      fs.mkdirSync(path.join(app, 'schemas'))
      fs.writeFileSync(path.join(app, 'schemas/preset.schema.json'), JSON.stringify({ $id: 'https://ombelle-ui.vercel.app/schemas/preset-1.0.json' }))
      vi.spyOn(process, 'cwd').mockReturnValue(path.join(app, 'apps/www'))
      expect([...publishedSchemas().keys()]).toEqual(['preset.schema.json', 'preset-1.0.json'])
    } finally {
      fs.rmSync(app, { recursive: true, force: true })
    }
  })

  it('caches versioned schemas for a year, revalidates the file-name aliases, and allows any origin', () => {
    const rules = headerRules()
    const schemaRules = rules.filter((rule) => rule.source.startsWith('/schemas/'))
    expect(schemaRules[0]!.headers).toEqual(expect.arrayContaining([
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ]))
    // The alias rule comes later, so its Cache-Control replaces the year-long one.
    expect(rules.indexOf(schemaRules[1]!)).toBeGreaterThan(rules.indexOf(schemaRules[0]!))
    expect(schemaRules[1]!.source).toBe('/schemas/:name([a-z0-9-]+\\.schema\\.json)')
    expect(schemaRules[1]!.headers).toEqual([{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }])
  })
})
