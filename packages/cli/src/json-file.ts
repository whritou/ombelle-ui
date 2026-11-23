import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { FoundationError } from '@ombelle/contracts'

/**
 * Reads a local JSON input (a preset or a recipe) as one bounded, regular, UTF-8 file. Both readers share
 * it, so both refuse a FIFO without waiting for a writer, even one swapped in after the check (DUP-02).
 */
export async function readJsonFile(file: string, label: 'Preset' | 'Recipe', limit: number): Promise<unknown> {
  const target = path.resolve(file)
  const size = limit >= 1024 * 1024 ? limit / (1024 * 1024) + ' MiB' : limit / 1024 + ' KiB'
  try {
    let initial
    try {
      initial = await fs.stat(target)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new FoundationError('INVALID_DATA', label + ' file not found', target, 'Check the path; it resolves from the directory you run the command in.')
      throw error
    }
    if (!initial.isFile()) throw Error(label + ' must be a regular file')
    if (initial.size > limit) throw Error(label + ' exceeds ' + size)
    // A FIFO can replace the checked path before open; never wait for its writer.
    const handle = await fs.open(target, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0))
    try {
      const stat = await handle.stat()
      if (!stat.isFile()) throw Error(label + ' must be a regular file')
      const bytes = Buffer.alloc(limit + 1)
      let length = 0
      while (length < bytes.length) {
        const read = await handle.read(bytes, length, bytes.length - length, null)
        if (!read.bytesRead) break
        length += read.bytesRead
      }
      if (length > limit) throw Error(label + ' exceeds ' + size)
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length)))
    } finally {
      await handle.close()
    }
  } catch (cause) {
    if (cause instanceof FoundationError) throw cause
    throw new FoundationError('INVALID_DATA', cause instanceof Error ? cause.message : 'Cannot read ' + label.toLowerCase(), target)
  }
}
