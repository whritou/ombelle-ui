import type { InstallableRecipeCompileResult } from '@ombelle/contracts'
import { artifactChanges, changesSummary } from '../artifact-diff'

/**
 * Get code's line on what the edits change against the catalog default, with a button that
 * closes the dialog and opens the first changed file's Changes view.
 */
export function changesSummaryFor(result: InstallableRecipeCompileResult | null, reference: InstallableRecipeCompileResult | null, show: () => void) {
  if (!result || !reference) return undefined
  const text = changesSummary(artifactChanges(result, reference))
  return (close: () => void) => <>
    <p data-testid="changes-summary">{text}</p>
    {text.startsWith('Changes') && <button type="button" onClick={() => { close(); show() }}>Show changes</button>}
  </>
}
