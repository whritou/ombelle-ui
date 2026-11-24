/**
 * The consumers group's browser specs, split across Foundation jobs by file. In one job they took
 * 119 minutes (345 minutes of test time over 3 workers) after 44 minutes of consumer preparation
 * (run 45266909965, 24 November). Test minutes per file then: edition parity 96, component presets
 * 70, preset editor 40, recipes 32, snapshot presets 28, catalog editors 25, all others 54. Edition
 * parity and component presets run their cases in parallel, so each shard holds 100 to 140 minutes
 * of tests, about 35 to 45 minutes on 3 workers. Every shard prepares the same consumers and the
 * aggregate requires all of them. The last shard runs every other spec, so a new spec file needs
 * no entry here; rebalance from a run's browser-results.json when the suite changes.
 */
export const consumerShardFiles = [
  ['edition-parity.spec.ts', 'preset-editor.spec.ts'],
  ['component-presets.spec.ts', 'recipes.spec.ts'],
]
export const consumerShardTotal = consumerShardFiles.length + 1

/** Parse OMBELLE_CONSUMERS_SHARD ("2/3"); undefined runs every consumer spec. */
export function parseConsumerShard(value) {
  if (value === undefined || value === '') return undefined
  const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(value)
  const shard = match && { current: Number(match[1]), total: Number(match[2]) }
  if (!shard || shard.current > shard.total || shard.total !== consumerShardTotal)
    throw new Error('OMBELLE_CONSUMERS_SHARD must be current/' + consumerShardTotal + ', for example 2/' + consumerShardTotal)
  return shard
}

/** Playwright file selection for a shard: its own files, or (last shard) every file the others do not own. */
export function consumerShardSelection(shard) {
  if (!shard) return {}
  if (shard.current <= consumerShardFiles.length) return { testMatch: consumerShardFiles[shard.current - 1] }
  return { testIgnore: consumerShardFiles.flat() }
}
