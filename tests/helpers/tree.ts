import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
export async function snapshotTree(
  root: string,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  async function walk(dir: string) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile())
        result[path.relative(root, full).split(path.sep).join('/')] =
          createHash('sha256')
            .update(await fs.readFile(full))
            .digest('hex')
    }
  }
  await walk(root)
  return result
}
