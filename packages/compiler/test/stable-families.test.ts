import { expect, it } from 'vitest'
import fixture from './fixtures/stable-family-hashes.json'
import { stableArtifactHashes } from '../../../scripts/record-stable-hashes.ts'

it('stable family artifacts are byte-identical', async () => {
  expect(await stableArtifactHashes()).toEqual(fixture)
})
