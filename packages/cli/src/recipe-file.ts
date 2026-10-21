import fs from 'node:fs/promises'
import path from 'node:path'
import {
  FoundationError,
  validateRecipe,
  type Recipe,
} from '@ombelle/contracts'
export async function readRecipeFile(file: string): Promise<Recipe> {
  const target = path.resolve(file)
  try {
    const handle = await fs.open(target, 'r')
    try {
      if (!(await handle.stat()).isFile())
        throw Error('Recipe must be a regular file')
      const bytes = Buffer.alloc(65537)
      let length = 0
      while (length < bytes.length) {
        const read = await handle.read(
          bytes,
          length,
          bytes.length - length,
          null,
        )
        if (!read.bytesRead) break
        length += read.bytesRead
      }
      if (length > 65536) throw Error('Recipe exceeds 64 KiB')
      return validateRecipe(
        JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(
            bytes.subarray(0, length),
          ),
        ),
      )
    } finally {
      await handle.close()
    }
  } catch (cause) {
    if (cause instanceof FoundationError) throw cause
    throw new FoundationError(
      'INVALID_DATA',
      cause instanceof Error ? cause.message : 'Cannot read recipe',
      target,
    )
  }
}
