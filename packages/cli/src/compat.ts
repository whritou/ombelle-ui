import { FoundationError } from '@ombelle/contracts'
import { cliVersion } from './version.js'

/**
 * The 1.0 compatibility rule (PUB-05). A newer Ombelle release that adds a value or a field to a
 * document raises its `schemaVersion`; this CLI reads the versions it knows and refuses the others as a
 * newer document. A value or field it does not know in a known version is reported the same way, since
 * it is most often an export from a newer release; a typo in a hand-edited file reads the same, so the
 * message says both. Either way the code is UNSUPPORTED_RELEASE (exit 3) with an upgrade next action,
 * instead of a bare INVALID_DATA.
 */
const unknownValue = /^must be equal to one of the allowed values$|^must NOT have additional properties$|^must be equal to constant$/
export function asNewerDocument(error: unknown, kind: 'preset' | 'recipe' | 'project file'): unknown {
  if (!(error instanceof FoundationError) || error.code !== 'INVALID_DATA' || !unknownValue.test(error.message)) return error
  const pointer = error.path ?? ''
  const what = /\/schemaVersion$/.test(pointer)
    ? 'its schemaVersion'
    : /additional properties/.test(error.message)
      ? 'the field ' + pointer
      : 'the value at ' + pointer
  return new FoundationError(
    'UNSUPPORTED_RELEASE',
    'This ' + kind + ' uses ' + what + ', which Ombelle CLI ' + cliVersion +
      ' does not know; it comes from a newer Ombelle release, or the file was edited by hand',
    pointer,
    'Run the newest CLI (npx @ombelle-ui/cli@latest with the same arguments), or export the ' + kind + ' again from the site.',
  )
}
