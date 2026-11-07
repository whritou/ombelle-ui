import path from 'node:path'
import {
  supportedComponentIds,
  type ComponentId,
  type ProjectContext,
} from '@ombelle/contracts'
import { portable } from './paths.js'
export type Resolution = 'overwrite' | 'beside'
/** Directory under the UI directory that holds components installed beside. */
export const besideDirectory = 'ombelle'
// Matching ignores case and separators, like the duplicate-destination check.
const key = (file: string) =>
  portable(path.normalize(file.replace(/\\/g, '/')))
    .replace(/^\.\//, '')
    .toLowerCase()
/** The component whose default source or stylesheet path this is, if any. */
export function componentForPath(
  context: ProjectContext,
  file: string,
): ComponentId | undefined {
  const wanted = key(file)
  return supportedComponentIds.find((id) =>
    ['.tsx', '.css'].some(
      (ext) => key(path.join(context.componentsDir, id + ext)) === wanted,
    ),
  )
}
/** Components compiled with prefixed slots: recorded placements plus new beside choices. */
export function besideComponents(
  context: ProjectContext,
  resolutions: Record<string, Resolution> = {},
): ComponentId[] {
  const ids = new Set(
    Object.keys(context.lock?.placements ?? {}) as ComponentId[],
  )
  for (const [file, resolution] of Object.entries(resolutions)) {
    const id = resolution === 'beside' ? componentForPath(context, file) : undefined
    if (id) ids.add(id)
  }
  return [...ids].sort()
}
/** Case- and separator-insensitive identity used to match resolution paths. */
export function resolutionKey(file: string) {
  return key(file)
}
