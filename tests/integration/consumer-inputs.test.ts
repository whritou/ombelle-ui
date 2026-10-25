import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, it } from 'vitest'
import { withConsumerInputs } from '../../scripts/consumer-inputs.js'
it('isolates concurrent consumer inputs and removes them only after each consumer settles', async () => {
  const roots: string[] = []
  await Promise.all(
    [0, 1].map((index) =>
      withConsumerInputs(async (root) => {
        roots[index] = root
        const file = path.join(root, 'same.json')
        await fs.writeFile(file, String(index))
        await new Promise((resolve) => setImmediate(resolve))
        expect(await fs.readFile(file, 'utf8')).toBe(String(index))
        await fs.writeFile(file, 'tampered')
      }),
    ),
  )
  expect(roots[0]).not.toBe(roots[1])
  for (const root of roots)
    await expect(fs.stat(root)).rejects.toMatchObject({ code: 'ENOENT' })
})
it('cleans up its own inputs when consumer work fails', async () => {
  let directory = ''
  await expect(
    withConsumerInputs(async (root) => {
      directory = root
      throw Error('failed')
    }),
  ).rejects.toThrow('failed')
  await expect(fs.stat(directory)).rejects.toMatchObject({ code: 'ENOENT' })
})
