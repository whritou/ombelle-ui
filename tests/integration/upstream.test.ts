import { it, expect } from 'vitest'
import http from 'node:http'
import { compile, sha256 } from '@ombelle/compiler'
import fs from 'node:fs/promises'
import provenance from '../fixtures/shadcn-schema/provenance.json'
import example from '../../examples/preset.example.json'
import { buildRegistry } from '../../packages/cli/src/registry/build.js'
import { fetchPublication } from '../../packages/cli/src/snapshots/transport.js'
import { registrySchema, registryItemSchema } from '../helpers/upstream-schema.js'

it('pins the reviewed upstream schemas and style metadata independently of generated output', async () => {
  for (const [name, record] of Object.entries(provenance.files)) {
    const content = await fs.readFile(new URL('../fixtures/shadcn-schema/' + name, import.meta.url), 'utf8')
    expect(await sha256(content.replace(/\r\n/g, '\n')), name).toBe(record.sha256)
  }
})

it('serves exact component and theme bytes through the published upstream registry contract', async () => {
  const compiled = await compile({ preset: example, componentIds: ['button', 'badge', 'card'],
    catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
  const registry = buildRegistry(compiled)
  const documents: Record<string, unknown> = { '/registry.json': registry.index }
  for (const [name, item] of Object.entries(registry.items)) documents['/' + name + '.json'] = item
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(documents[req.url!]))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const origin = 'http://127.0.0.1:' + (server.address() as { port: number }).port
    for (const [route, original] of Object.entries(documents)) {
      const schema = route === '/registry.json' ? registrySchema : registryItemSchema
      const received = await fetchPublication(new URL(route, origin), route, async input => {
        const parsed = schema.safeParse(input)
        if (!parsed.success) throw new Error(JSON.stringify(parsed.errors))
        return input
      })
      expect(received).toEqual(original)
    }
    for (const item of Object.values(registry.items))
      for (const file of item.files ?? [])
        expect(file.content).toBe(compiled.artifacts.find(artifact => artifact.logicalPath === file.path)?.content)
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

it('the independent upstream schema rejects malformed item payloads', () => {
  for (const item of [{ name: 'bad', type: 'invented' }, { type: 'registry:ui' },
    { name: 'bad', type: 'registry:ui', files: [{ path: 'button.tsx', type: 'invented', content: 42 }] }])
    expect(registryItemSchema.safeParse(item).success).toBe(false)
  expect(registrySchema.safeParse({ name: 'bad', items: 'not-an-array' }).success).toBe(false)
})
