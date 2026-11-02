import { beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { normalizePublishedPreset, normalizePublishedRecipe, verifyRecipeSnapshot } from '@ombelle/compiler'
import { parseRecipeSnapshotReference, parseSnapshotReference, type RecipeCompileResult, type ResolvedPreset } from '@ombelle/contracts'
import presetExample from '../../examples/preset.example.json'
import recipeExample from '../../examples/recipe.example.json'
import type { SnapshotStore } from '../../apps/www/src/snapshots/server/store.js'

export const publicationNow = Date.UTC(2026, 10, 1, 12)
export function publicationStoreContract(name: string, fixture: () => Promise<{
  store: SnapshotStore; reopen(): Promise<SnapshotStore>; close(): Promise<void>
}>) {
  describe(name, () => {
    let preset: ResolvedPreset, compiled: RecipeCompileResult
    beforeAll(async () => {
      preset = await normalizePublishedPreset(presetExample)
      compiled = await normalizePublishedRecipe(recipeExample)
    })
    const presetInput = (clientKey = 'client') => ({ preset, clientKey, idempotencyKey: randomUUID(), now: publicationNow })
    const recipeInput = (clientKey = 'client') => ({ compiled, clientKey, idempotencyKey: randomUUID(), now: publicationNow })

    it('persists normalized recipe bytes across independent connections', async () => {
      const context = await fixture()
      try {
        const published = await context.store.publishRecipe(recipeInput())
        expect(await verifyRecipeSnapshot(published.snapshot)).toEqual(published.snapshot)
        expect(published.replayed).toBe(false)
        const other = await context.reopen()
        expect(await other.lookupRecipe(parseRecipeSnapshotReference(published.snapshot.id + '@1'))).toEqual(published.snapshot)
      } finally { await context.close() }
    })
    it('shares the daily publication quota across presets and recipes', async () => {
      const context = await fixture()
      try {
        for (let n = 0; n < 19; n++) await context.store.publish(presetInput())
        await context.store.publishRecipe(recipeInput())
        await expect(async () => context.store.publish(presetInput())).rejects.toMatchObject({ status: 429 })
        await expect(async () => context.store.publishRecipe(recipeInput())).rejects.toMatchObject({ status: 429 })
        expect((await context.store.publishRecipe(recipeInput('other'))).replayed).toBe(false)
      } finally { await context.close() }
    })
    it('replays one recipe intent without consuming another daily publication', async () => {
      const context = await fixture(), input = recipeInput()
      try {
        const first = await context.store.publishRecipe(input)
        for (let n = 0; n < 19; n++) await context.store.publish(presetInput())
        expect(await context.store.publishRecipe({ ...input, clientKey: 'other' })).toEqual({ ...first, replayed: true })
        const changed = await normalizePublishedRecipe({ ...recipeExample, content: 'Different' })
        await expect(async () => context.store.publishRecipe({ ...input, compiled: changed })).rejects.toMatchObject({ status: 409 })
      } finally { await context.close() }
    })
    it('binds idempotency keys across publication kinds in both directions', async () => {
      const context = await fixture(), keyA = randomUUID(), keyB = randomUUID()
      try {
        await context.store.publish({ ...presetInput(), idempotencyKey: keyA })
        await expect(async () => context.store.publishRecipe({ ...recipeInput(), idempotencyKey: keyA })).rejects.toMatchObject({ status: 409 })
        await context.store.publishRecipe({ ...recipeInput(), idempotencyKey: keyB })
        await expect(async () => context.store.publish({ ...presetInput(), idempotencyKey: keyB })).rejects.toMatchObject({ status: 409 })
      } finally { await context.close() }
    })
    it('withdraws recipe reads and retries without modifying immutable content', async () => {
      const context = await fixture(), input = recipeInput()
      try {
        const { snapshot } = await context.store.publishRecipe(input)
        const ref = parseRecipeSnapshotReference(snapshot.id + '@1')
        await context.store.withdrawRecipe(ref, 'abuse', publicationNow)
        await expect(async () => context.store.lookupRecipe(ref)).rejects.toMatchObject({ status: 410 })
        await expect(async () => context.store.publishRecipe(input)).rejects.toMatchObject({ status: 410 })
        await context.store.unwithdrawRecipe(ref)
        expect(await context.store.lookupRecipe(ref)).toEqual(snapshot)
        expect((await context.store.publishRecipe(input)).replayed).toBe(true)
      } finally { await context.close() }
    })
    it('uses one minute attempt budget across connections and both kinds', async () => {
      const context = await fixture()
      try {
        const other = await context.reopen()
        for (let n = 0; n < 5; n++) await (n % 2 ? other : context.store).consumeAttempt('client', publicationNow)
        await expect(async () => other.consumeAttempt('client', publicationNow)).rejects.toMatchObject({ status: 429 })
        await other.consumeAttempt('client', publicationNow + 60_000)
      } finally { await context.close() }
    })
    it('expires recipe retry keys at 24 hours while retaining the old snapshot', async () => {
      const context = await fixture(), input = recipeInput()
      try {
        const first = await context.store.publishRecipe(input)
        expect((await context.store.publishRecipe({ ...input, now: publicationNow + 86_399_999 })).snapshot.id).toBe(first.snapshot.id)
        const next = await context.store.publishRecipe({ ...input, now: publicationNow + 86_400_000 })
        expect(next.snapshot.id).not.toBe(first.snapshot.id)
        expect(await context.store.lookupRecipe(parseRecipeSnapshotReference(first.snapshot.id + '@1'))).toEqual(first.snapshot)
      } finally { await context.close() }
    })
    it('returns controlled not-found errors for unknown immutable references', async () => {
      const context = await fixture()
      try {
        await expect(async () => context.store.lookupRecipe(parseRecipeSnapshotReference('rc_' + '0'.repeat(32) + '@1'))).rejects.toMatchObject({ status: 404 })
        await expect(async () => context.store.lookup(parseSnapshotReference('ps_' + '0'.repeat(32) + '@1'))).rejects.toMatchObject({ status: 404 })
      } finally { await context.close() }
    })
  })
}
