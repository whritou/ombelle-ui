import { it, expect } from 'vitest'
import http from 'node:http'
import fs from 'node:fs/promises'
import { compile } from '@ombelle/compiler'
import example from '../../examples/preset.example.json'
import { createProject } from '../helpers/projects.js'
import { buildRegistry } from '../../packages/cli/src/registry/build.js'
import { probeUpstream } from '../../packages/cli/src/registry/adapter.js'
it('installs a generated registry item through the pinned upstream boundary', async () => {
  const r = await compile({
    preset: example,
    componentIds: ['button'],
    catalogRelease: '0.1.0',
    compilerVersion: '0.1.0',
  })
  const item = buildRegistry(r).items.button
  const server = http.createServer((_req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(item))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const root = await createProject('vite')
  try {
    const address = server.address() as { port: number }
    const result = await probeUpstream({
      cwd: root,
      registryUrl: 'http://127.0.0.1:' + address.port + '/button.json',
    })
    expect(result.files.some((f) => f.endsWith('button.tsx'))).toBe(true)
    const source = await fs.readFile(
      root + '/src/components/ui/button.tsx',
      'utf8',
    )
    expect(source).toContain('data-slot')
    expect(source).toContain('@/lib/utils')
  } finally {
    server.close()
    await fs.rm(root, { recursive: true, force: true })
  }
}, 120000)
