import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { safePath } from './paths.js'

export async function fingerprintFile(root: string, relative: string): Promise<string | null> {
  const target = await safePath(root, relative)
  try {
    return createHash('sha256').update(await fs.readFile(target)).digest('hex')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw e
  }
}
