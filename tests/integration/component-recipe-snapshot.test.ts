import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { verifyInstallableRecipeSnapshot } from '@ombelle/compiler'
import badge from '../../examples/component-recipe.badge.json'
import button from '../../examples/recipe.example.json'
import { startSnapshotService } from '../helpers/snapshot-service.js'

it('publishes Badge while preserving existing Button response bytes', async () => {
  const { origin, close } = await startSnapshotService()
  try {
    const publish = (recipe: unknown, key = randomUUID()) => fetch(origin + '/api/v1/recipes', {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ recipe }),
    })
    const previous = await publish(button)
    expect(previous.status).toBe(201)
    const oldUrl = origin + previous.headers.get('location')
    const old = await fetch(oldUrl)
    const oldBody = await old.text()
    const key = randomUUID()
    const created = await publish(badge, key)
    expect(created.status).toBe(201)
    const snapshot = await created.text()
    const envelope = JSON.parse(snapshot)
    expect(envelope).toMatchObject({ snapshotVersion: '2.0', recipe: badge })
    await expect(verifyInstallableRecipeSnapshot({ ...envelope, snapshotVersion: '1.0' })).rejects.toThrow()
    await expect(verifyInstallableRecipeSnapshot({ ...envelope, recipeHash: '0'.repeat(64) })).rejects.toThrow()
    expect(await (await publish(badge, key)).text()).toBe(snapshot)
    expect(await (await fetch(origin + created.headers.get('location'))).text()).toBe(snapshot)
    const retained = await fetch(oldUrl)
    expect(retained.headers.get('etag')).toBe(old.headers.get('etag'))
    expect(await retained.text()).toBe(oldBody)
  } finally { await close() }
})
