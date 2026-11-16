import { it, expect } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import net from 'node:net'
import { startServer, stopServer } from '../../scripts/playground/servers.js'
it('starts and stops an owned server through its returned control record', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-server-')),
    state = path.join(root, 'server.json')
  const socket = net.createServer()
  await new Promise<void>((r) => socket.listen(0, '127.0.0.1', r))
  const port = (socket.address() as net.AddressInfo).port
  await new Promise<void>((r) => socket.close(() => r()))
  let server: Awaited<ReturnType<typeof startServer>> | undefined
  try {
    await fs.mkdir(path.join(root, 'node_modules/vite/bin'), {
      recursive: true,
    })
    await fs.writeFile(path.join(root, 'package.json'), '{}')
    await fs.writeFile(
      path.join(root, 'node_modules/vite/package.json'),
      JSON.stringify({ name: 'vite', version: '0.0.0' }),
    )
    await fs.writeFile(
      path.join(root, 'node_modules/vite/bin/vite.js'),
      "require('http').createServer((q,s)=>s.end('ready')).listen(Number(process.argv[process.argv.indexOf('--port')+1]),'127.0.0.1')",
    )
    server = await startServer(
      root,
      'vite',
      port,
      'dev',
      path.join(root, 'log'),
      state,
    )
    expect((await fetch(server.url)).status).toBe(200)
    await stopServer(server)
    await server.done
    await expect(fs.access(state)).rejects.toThrow()
  } finally {
    if (server) await server.close()
    else {
      try {
        await stopServer(JSON.parse(await fs.readFile(state, 'utf8')))
        await new Promise((r) => setTimeout(r, 300))
      } catch {}
    }
    await fs.rm(root, { recursive: true, force: true })
  }
})
