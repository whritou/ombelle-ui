import fs from 'node:fs/promises'
import path from 'node:path'
import {
  FoundationError,
  validatePreset,
  type Preset,
} from '@ombelle/contracts'
export async function readPresetFile(file: string): Promise<Preset> {
  const target = path.resolve(file)
  try {
    // Check before opening so a non-regular input (such as a FIFO) cannot block.
    if (!(await fs.stat(target)).isFile())
      throw Error('Preset must be a regular file')
    const handle = await fs.open(target, 'r')
    try {
      const stat = await handle.stat()
      if (!stat.isFile()) throw Error('Preset must be a regular file')
      if (stat.size > 262144) throw Error('Preset exceeds 256 KiB')
      const bytes = Buffer.alloc(262145)
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
      if (length > 262144) throw Error('Preset exceeds 256 KiB')
      return validatePreset(
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
      cause instanceof Error ? cause.message : 'Cannot read preset',
      target,
    )
  }
}
