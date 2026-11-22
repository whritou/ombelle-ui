import { beforeEach, expect, it, vi } from 'vitest'
import { SnapshotServiceError } from '../snapshots/server/errors'

// The pages' own components are not rendered here; only their titles are read.
vi.mock('../preset-editor/components/preset-editor', () => ({ default: () => null }))
vi.mock('../editor/components/button-editor', () => ({ ButtonEditor: () => null }))
vi.mock('../editor/components/catalog-component-editor', () => ({ CatalogComponentEditor: () => null }))
vi.mock('../snapshots/components/published-preset', () => ({ PublishedPreset: () => null }))
vi.mock('../recipe-snapshots/components/published-recipe', () => ({ PublishedRecipe: () => null }))

const store = vi.hoisted(() => ({ read: async (_ref: unknown): Promise<unknown> => { throw new Error('unset') } }))
vi.mock('../snapshots/server/service', () => ({ createRequestSnapshotService: () => ({ read: (ref: unknown) => store.read(ref) }) }))
vi.mock('../snapshots/server/recipe-service', () => ({ createRequestRecipeSnapshotService: () => ({ read: (ref: unknown) => store.read(ref) }) }))

const params = <T>(value: T) => ({ params: Promise.resolve(value) })

beforeEach(() => {
  store.read = async () => { throw new Error('unset') }
})

it('titles both editors', async () => {
  expect((await import('./editor/preset/page')).metadata.title).toBe('Preset editor · Ombelle UI')
  expect((await import('./editor/component/button/page')).metadata.title).toBe('Button editor · Ombelle UI')
})

it('titles a catalog component editor by its component', async () => {
  const { editableComponents } = await import('../editor/editable-components')
  const { generateMetadata } = await import('./editor/component/[id]/page')
  const other = editableComponents.find(component => component.id !== 'button')
  if (other) expect(await generateMetadata(params({ id: other.id }))).toEqual({ title: `${other.label} editor · Ombelle UI` })
  expect(await generateMetadata(params({ id: 'no-such-component' }))).toEqual({})
})

it('titles a published preset by its name, and an unavailable one by its state', async () => {
  const { generateMetadata } = await import('./presets/[id]/[revision]/page')
  store.read = async () => ({ preset: { name: 'Harbor' } })
  expect(await generateMetadata(params({ id: 'ps_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', revision: '1' }))).toEqual({ title: 'Harbor · Published preset · Ombelle UI' })
  store.read = async () => { throw new SnapshotServiceError({ status: 410, code: 'SNAPSHOT_WITHDRAWN' }) }
  expect(await generateMetadata(params({ id: 'ps_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', revision: '1' }))).toEqual({ title: 'Snapshot withdrawn · Ombelle UI' })
})

it('titles a published recipe by its component, and a missing one by its state', async () => {
  const { generateMetadata } = await import('./recipes/[id]/[revision]/page')
  store.read = async () => ({ snapshotVersion: '1.0', recipe: { component: 'button' } })
  expect(await generateMetadata(params({ id: 'rc_cccccccccccccccccccccccccccccccc', revision: '1' }))).toEqual({ title: 'Published Button recipe · Ombelle UI' })
  store.read = async () => { throw new SnapshotServiceError({ status: 404, code: 'SNAPSHOT_NOT_FOUND' }) }
  expect(await generateMetadata(params({ id: 'rc_dddddddddddddddddddddddddddddddd', revision: '1' }))).toEqual({ title: 'Snapshot not found · Ombelle UI' })
})
