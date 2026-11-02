import fs from 'node:fs'

// Generators and package builds also run while tests read their outputs (the
// packed CLI test rebuilds packages). Leave identical files untouched and
// replace changed ones by rename so readers never observe a partial file.
export function writeFileAtomicSync(file: string, data: string | Uint8Array): void {
  const bytes = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  try { if (fs.readFileSync(file).equals(bytes)) return } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  const temporary = `${file}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`
  fs.writeFileSync(temporary, bytes)
  for (let attempt = 0; ; attempt++) {
    try { fs.renameSync(temporary, file); return } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? ''
      // Windows refuses to replace a file another process has open; retry briefly.
      if (attempt >= 20 || !['EPERM', 'EACCES', 'EBUSY'].includes(code)) {
        fs.rmSync(temporary, { force: true })
        throw error
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50)
    }
  }
}
