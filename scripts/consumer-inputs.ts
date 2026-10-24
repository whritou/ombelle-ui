import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/** Keep tampered CLI inputs outside consumer snapshots and other workers. */
export async function withConsumerInputs<T>(
  work: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'ombelle-consumer-inputs-'),
  )
  try {
    return await work(directory)
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
}
