import { afterAll, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { normalizePublishedRecipe } from '@ombelle/compiler'
import recipe from '../../examples/recipe.example.json'
import { openPostgresSnapshotStore, closePostgresPools } from '../../apps/www/src/snapshots/server/postgres-store.js'
import { parseRecipeSnapshotReference } from '@ombelle/contracts'

const databaseUrl = process.env.OMBELLE_POSTGRES_TEST_DATABASE_URL
const directUrl = process.env.OMBELLE_POSTGRES_TEST_DIRECT_URL
const expectedHost = process.env.OMBELLE_POSTGRES_TEST_EXPECTED_HOST
if (process.env.OMBELLE_POSTGRES_TEST_BRANCH !== 'dev-hosted-install-codes' || !databaseUrl || !directUrl || !expectedHost || new URL(databaseUrl).hostname !== expectedHost)
  throw new Error('Postgres operator tests require the explicitly isolated development branch.')
afterAll(closePostgresPools)
async function command(args: string[], direct = directUrl): Promise<{ code: number | null; out: string; err: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', resolve('scripts/snapshot-store.ts'), ...args], {
      windowsHide: true, env: { ...process.env, OMBELLE_SNAPSHOT_BACKEND: 'postgres', OMBELLE_SNAPSHOT_DB_PATH: undefined, DATABASE_URL: databaseUrl, DATABASE_URL_UNPOOLED: direct },
    })
    let out = '', err = ''
    child.stdout.on('data', data => { out += data })
    child.stderr.on('data', data => { err += data })
    child.on('error', reject)
    child.on('exit', code => resolveResult({ code, out, err }))
  })
}
it('runs postgres operator commands with direct initialization and recipe withdrawal', async () => {
  expect((await command(['init'])).code).toBe(0)
  expect((await command(['init'])).code).toBe(0)
  expect((await command(['init'], databaseUrl)).code).not.toBe(0)
  const store = await openPostgresSnapshotStore(databaseUrl!)
  const { snapshot } = await store.publishRecipe({ compiled: await normalizePublishedRecipe(recipe), idempotencyKey: randomUUID(), clientKey: randomUUID(), now: Date.now() })
  const ref = parseRecipeSnapshotReference(snapshot.id + '@1')
  const withdrawn = await command(['withdraw', snapshot.id + '@1', '--reason', 'security'])
  expect(withdrawn.code).toBe(0)
  await expect(store.lookupRecipe(ref)).rejects.toMatchObject({ status: 410 })
  const restored = await command(['unwithdraw', snapshot.id + '@1'])
  expect(restored.code).toBe(0)
  expect(await store.lookupRecipe(ref)).toEqual(snapshot)
  for (const output of [withdrawn, restored]) {
    expect(output.out + output.err).not.toContain(new URL(databaseUrl!).password)
    expect(output.out + output.err).not.toContain(recipe.content)
  }
})
