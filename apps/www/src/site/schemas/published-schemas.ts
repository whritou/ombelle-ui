import fs from 'node:fs'
import path from 'node:path'

/**
 * Every published JSON schema by the name it is served under (CMP-06): its file name, and the last path
 * segment of its `$id` (`https://ombelle-ui.vercel.app/schemas/preset-1.0.json` serves at
 * `/schemas/preset-1.0.json`). Values are the file's bytes, unchanged.
 *
 * Read from the repository's `schemas/` when the site is built (`next build` runs in apps/www), so the
 * served copies cannot drift. The paths are written out in full so the build traces only that directory.
 */
export function publishedSchemas(): Map<string, string> {
  const served = new Map<string, string>()
  const files = fs.readdirSync(path.join(process.cwd(), '../../schemas')).filter((name) => name.endsWith('.json')).sort()
  for (const file of files) {
    const text = fs.readFileSync(path.join(process.cwd(), '../../schemas', file), 'utf8')
    const id = (JSON.parse(text) as { $id?: unknown }).$id
    served.set(file, text)
    if (typeof id === 'string') {
      const name = new URL(id).pathname.split('/').pop()
      if (name && name.endsWith('.json')) {
        if (served.has(name) && served.get(name) !== text) throw new Error(`Two schemas are served as ${name}`)
        served.set(name, text)
      }
    }
  }
  return served
}
