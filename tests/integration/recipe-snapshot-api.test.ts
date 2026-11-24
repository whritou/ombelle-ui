import { expect, it } from 'vitest'
import { createHash, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { canonicalize, normalizePublishedRecipe } from '@ombelle/compiler'
import { parseRecipeSnapshotReference, type RecipeSnapshot } from '@ombelle/contracts'
import example from '../../examples/recipe.example.json'
import presetExample from '../../examples/preset.example.json'
import { publicationApi, publicationApiContract, publicationFailure as failure, type PublicationApiKind } from '../helpers/publication-api-contract.js'
import { handleRecipeSnapshotRead } from '../../apps/www/src/snapshots/server/recipe-http.js'

const recipeApi: PublicationApiKind = {
  name: 'recipe',
  field: 'recipe',
  endpoint: '/api/v1/recipes',
  idPattern: /^rc_[a-f0-9]{32}$/,
  content: () => structuredClone(example) as Record<string, unknown>,
  changed: (content) => ({ ...content, content: 'Changed' }),
  normalized: async (content) => (await normalizePublishedRecipe(content)).recipe.data,
  unknownFields: (content) => [{ ...content, extra: true }, { ...content, props: { ...(content.props as object), extra: true } }],
  unsupported: {
    schemaVersion: (content) => ({ ...content, schemaVersion: '3.0' }),
    catalogRelease: (content) => ({ ...content, presetRef: { ...(content.presetRef as object), catalogRelease: '9.0.0' } }),
    compilerVersion: (content) => ({ ...content, presetRef: { ...(content.presetRef as object), compilerVersion: '9.0.0' } }),
  },
  withdraw: (store, id) => store.withdrawRecipe(parseRecipeSnapshotReference(`${id}@1`), 'security', Date.now()),
  read: (request, params, service) => handleRecipeSnapshotRead(request, params, service as never),
  routes: async () => ({
    collection: await import('../../apps/www/src/app/api/v1/recipes/route.js') as never,
    single: await import('../../apps/www/src/app/api/v1/recipes/[id]/[revision]/route.js') as never,
  }),
}
publicationApiContract(recipeApi)

// Recipe-specific cases.
const { fixture, post: postWith } = publicationApi(recipeApi)
function post(origin: string, body: unknown = { recipe: example }, key = randomUUID()) {
  return postWith(origin, { key, body })
}

it('conflicts on a preset key reused for a recipe', async () => {
  const { origin } = await fixture()
  const presetKey = randomUUID()
  expect((await fetch(origin + '/api/v1/presets', { method: 'POST', body: JSON.stringify({ preset: presetExample }), headers: { Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': presetKey } })).status).toBe(201)
  await failure(await post(origin, { recipe: example }, presetKey), 409, 'IDEMPOTENCY_CONFLICT')
})
it('fails closed on hash-valid but non-normalized recipe storage before a 304 response', async () => {
  const { origin, dbPath } = await fixture(), created = await post(origin)
  const snapshot = await created.json() as RecipeSnapshot, db = new DatabaseSync(dbPath)
  delete snapshot.recipe.props.type
  snapshot.recipeHash = createHash('sha256').update(canonicalize(snapshot.recipe)).digest('hex')
  const response = canonicalize(snapshot)
  try {
    db.exec('DROP TRIGGER recipe_snapshots_no_update')
    db.prepare('UPDATE recipe_snapshots SET response=?,response_hash=?,recipe_hash=?,bytes=?').run(response, createHash('sha256').update(response).digest('hex'), snapshot.recipeHash, Buffer.byteLength(response))
  } finally { db.close() }
  await failure(await fetch(origin + created.headers.get('location')!, { headers: { 'If-None-Match': '*' } }), 503, 'SNAPSHOT_SERVICE_UNAVAILABLE')
})
