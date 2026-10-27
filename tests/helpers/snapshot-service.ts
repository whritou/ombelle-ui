import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { createSnapshotService } from '../../apps/www/src/snapshots/server/service.js'
import { handleSnapshotPublish, handleSnapshotRead, handleSnapshotUnsupportedMethod } from '../../apps/www/src/snapshots/server/http.js'
import { initializeSnapshotStore, openSnapshotStore } from '../../apps/www/src/snapshots/server/sqlite-store.js'

// The bridge uses the production handlers and a real initialized private DB.
export async function startSnapshotService() {
  const root = await mkdtemp(join(tmpdir(), 'ombelle-snapshot-api-'))
  const dbPath = join(root, 'snapshots.sqlite')
  initializeSnapshotStore(dbPath)
  const store = openSnapshotStore(dbPath)
  let origin: string
  const server = createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url!, origin)
      const headers = new Headers()
      for (const [name, value] of Object.entries(incoming.headers))
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
      const request = new Request(url, {
        method: incoming.method, headers,
        ...(['GET', 'HEAD'].includes(incoming.method!) ? {} : {
          body: Readable.toWeb(incoming) as ReadableStream<Uint8Array>, duplex: 'half',
        }),
      })
      const service = createSnapshotService({ dbPath, publicOrigin: origin, rateSecret: 'test-secret-'.repeat(4), clientIdentity: { mode: 'development' } }, store)
      const match = /^\/api\/v1\/presets\/([^/]+)\/([^/]+)$/.exec(url.pathname)
      const response = url.pathname === '/api/v1/presets' && request.method === 'POST'
        ? await handleSnapshotPublish(request, service)
        : match && ['GET', 'HEAD'].includes(request.method)
          ? await handleSnapshotRead(request, { id: match[1], revision: match[2] }, service)
          : await handleSnapshotUnsupportedMethod(request, match ? 'GET, HEAD, OPTIONS' : 'POST, OPTIONS')
      outgoing.writeHead(response.status, Object.fromEntries(response.headers))
      outgoing.end(Buffer.from(await response.arrayBuffer()))
    } catch { outgoing.writeHead(500); outgoing.end() }
  })
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing bridge address')
    origin = `http://127.0.0.1:${address.port}`
    return { origin, dbPath, close: async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
      store.close()
      await rm(root, { recursive: true, force: true })
    } }
  } catch (error) {
    server.close()
    store.close()
    await rm(root, { recursive: true, force: true })
    throw error
  }
}
