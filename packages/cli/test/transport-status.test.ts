// RL-08: a withdrawn or rate-limited code must not read like an outage.
import { afterEach, expect, it } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { fetchPublication } from '../src/snapshots/transport.js'

const servers: http.Server[] = []
afterEach(async () => { for (const server of servers.splice(0)) await new Promise(resolve => server.close(resolve)) })
async function serve(status: number, headers: Record<string, string> = {}) {
  const server = http.createServer((_request, response) => { response.writeHead(status, headers); response.end('{}') })
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  return new URL(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/recipes/x/1`)
}
const reference = 'rc_' + '0'.repeat(32) + '@1'

it.each([
  [410, {}, 'was withdrawn by the service'],
  [429, { 'Retry-After': '30' }, 'rate limiting requests (HTTP 429); retry in 30 s'],
  [404, {}, 'No snapshot exists for this code'],
  [503, {}, 'Snapshot request failed (HTTP 503)'],
])('names HTTP %i', async (status, headers, text) => {
  await expect(fetchPublication(await serve(status, headers), reference, async value => value))
    .rejects.toMatchObject({ code: 'RESOLUTION_FAILURE', message: expect.stringContaining(text) })
})
