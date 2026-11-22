/** Every spec file playwright.specimen-audit.config.ts runs. Shards take the others by index. */
export const specimenSpecFiles = [
  'specimen-audit.spec.ts', 'specimen-audit-checks.spec.ts', 'display-components.spec.ts', 'form-controls.spec.ts', 'primitives-075.spec.ts',
  'editor-inputs-075.spec.ts', 'code-block-075.spec.ts', 'overlays-search.spec.ts', 'calendar.spec.ts', 'variants-basics.spec.ts',
  'variants-more.spec.ts', 'variants-075.spec.ts', 'components-076.spec.ts', 'app-shell-09.spec.ts', 'variants-076.spec.ts', 'glass-scenes.spec.ts',
]

/** Parse OMBELLE_SPECIMEN_SHARD ("2/4"); undefined runs every specimen configuration. */
export function parseShard(value) {
  if (value === undefined || value === '') return undefined
  const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(value)
  const shard = match && { current: Number(match[1]), total: Number(match[2]) }
  if (!shard || shard.current > shard.total) throw new Error('OMBELLE_SPECIMEN_SHARD must be current/total, for example 2/4')
  return shard
}
