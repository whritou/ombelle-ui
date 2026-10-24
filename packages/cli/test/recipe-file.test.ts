import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readRecipeFile } from '../src/recipe-file.js'
import example from '../../../examples/recipe.example.json'
const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await fs.rm(root, { recursive: true, force: true })
})
it('enforces actual bytes at the inclusive 64 KiB boundary and clones snapshot', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-recipe-'))
  roots.push(root)
  const file = path.join(root, 'recipe.json'),
    json = JSON.stringify(example)
  await fs.writeFile(file, json + ' '.repeat(65536 - Buffer.byteLength(json)))
  const snapshot = await readRecipeFile(file)
  expect(snapshot).toEqual(example)
  await fs.appendFile(file, ' ')
  await expect(readRecipeFile(file)).rejects.toMatchObject({
    code: 'INVALID_DATA',
  })
  expect(snapshot.content).toBe(example.content)
  await fs.writeFile(file, Buffer.from([0xff, 0xfe]))
  await expect(readRecipeFile(file)).rejects.toMatchObject({
    code: 'INVALID_DATA',
  })
  await expect(readRecipeFile(root)).rejects.toMatchObject({
    code: 'INVALID_DATA',
  })
  await fs.writeFile(file, '{')
  await expect(readRecipeFile(file)).rejects.toMatchObject({
    code: 'INVALID_DATA',
  })
})

it('rejects a directory as a non-regular recipe', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-recipe-'))
  roots.push(root)
  await expect(readRecipeFile(root)).rejects.toMatchObject({
    code: 'INVALID_DATA',
    message: 'Recipe must be a regular file',
  })
})

if (process.platform !== 'win32') {
  it('rejects a file replaced by a FIFO between stat and open without hanging', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-recipe-'))
    roots.push(root)
    const file = path.join(root, 'recipe.json')
    await fs.writeFile(file, JSON.stringify(example))
    const module = fileURLToPath(
      new URL('../src/recipe-file.ts', import.meta.url),
    )
    const child = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `import fs from 'node:fs/promises';
       import { execFileSync } from 'node:child_process';
       import { pathToFileURL } from 'node:url';
       const { readRecipeFile } = await import(pathToFileURL(process.argv[1]));
       const stat = fs.stat.bind(fs);
       fs.stat = async (...args) => {
         const result = await stat(...args);
         if (args[0] === process.argv[2]) {
           await fs.unlink(process.argv[2]);
           execFileSync('mkfifo', [process.argv[2]], { timeout: 5000 });
         }
         return result;
       };
       try { await readRecipeFile(process.argv[2]); process.exitCode = 1 }
       catch (error) {
         if (error.code !== 'INVALID_DATA' || error.message !== 'Recipe must be a regular file') {
           console.error(error); process.exitCode = 2
         }
       }`,
        module,
        file,
      ],
      { encoding: 'utf8', timeout: 5000, killSignal: 'SIGKILL' },
    )
    expect(child.error, child.stderr).toBeUndefined()
    expect(child.status, child.stderr).toBe(0)
  }, 15000)
  it('rejects a POSIX FIFO without waiting for a writer', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ombelle-recipe-'))
    roots.push(root)
    const fifo = path.join(root, 'recipe.json')
    execFileSync('mkfifo', [fifo], { timeout: 5000 })
    const module = fileURLToPath(
      new URL('../src/recipe-file.ts', import.meta.url),
    )
    const child = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `import { pathToFileURL } from 'node:url';
       const { readRecipeFile } = await import(pathToFileURL(process.argv[1]));
       try { await readRecipeFile(process.argv[2]); process.exitCode = 1 }
       catch (error) {
         if (error.code !== 'INVALID_DATA' || error.message !== 'Recipe must be a regular file') {
           console.error(error); process.exitCode = 2
         }
       }`,
        module,
        fifo,
      ],
      { encoding: 'utf8', timeout: 5000, killSignal: 'SIGKILL' },
    )
    expect(child.error, child.stderr).toBeUndefined()
    expect(child.status, child.stderr).toBe(0)
  }, 15000)
}
