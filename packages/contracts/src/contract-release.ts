/**
 * The input contract version that `catalogRelease` and `compilerVersion` name: the preset, recipe and
 * snapshot schemas, the canonical JSON form, colour normalization, the materialization of family defaults
 * and the scope-hash input. It does not identify catalog bytes; templates, stylesheets and default values
 * change per package release (see docs/decisions/0009-snapshot-identity-and-contract-version.md).
 */
export const contractRelease = '0.1.0'
/** Every contract version this build reads. A new contract version is added here; old ones stay. */
export const supportedContractReleases: readonly string[] = [contractRelease]
export function isSupportedContractRelease(value: unknown): value is string {
  return typeof value === 'string' && supportedContractReleases.includes(value)
}
