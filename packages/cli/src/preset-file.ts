import fs from 'node:fs/promises'
import path from 'node:path'
import {
  FoundationError,
  validatePreset,
  type Preset,
} from '@ombelle/contracts'

const maxBytes = 262144

export async function readPresetFile(file: string): Promise<Preset> {
  const target = path.resolve(file)
  let handle: Awaited<ReturnType<typeof fs.open>> | undefined
  try {
    handle = await fs.open(target, 'r')
    if (!(await handle.stat()).isFile())
      throw new Error('Preset must be a regular file')

    const bytes = Buffer.alloc(maxBytes + 1)
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
    if (length > maxBytes) throw new Error('Preset exceeds 256 KiB')

    let data: unknown
    try {
      data = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(
          bytes.subarray(0, length),
        ),
      )
    } catch (cause) {
      throw new FoundationError(
        'INVALID_DATA',
        cause instanceof Error ? cause.message : 'Cannot parse preset JSON',
        target,
      )
    }
    return validatePreset(data)
  } catch (cause) {
    if (cause instanceof FoundationError) throw cause
    throw new FoundationError(
      'INVALID_DATA',
      cause instanceof Error ? cause.message : 'Cannot read preset',
      target,
    )
  } finally {
    await handle?.close()
  }
}
