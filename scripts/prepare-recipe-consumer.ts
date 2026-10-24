import { withConsumerInputs } from './consumer-inputs.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { InstalledRecipe, StyleFamily } from '@ombelle/contracts'
import { sha256 } from '@ombelle/compiler'
import { recipeFixtures } from '../fixtures/shared/recipes.js'
import { recipeReferenceBank } from '../tests/helpers/recipe-fixture.js'
import { runBuiltCli } from '../tests/helpers/cli-runtime.js'
export async function prepareRecipeConsumer(input: {
  root: string
  cliRuntime: 'node' | 'bun'
  env?: NodeJS.ProcessEnv
  family: StyleFamily
}): Promise<{
  recipes: Record<string, InstalledRecipe>
  protectedHashes: Record<string, string>
}> {
  return withConsumerInputs(async (inputDirectory) => {
    const root = input.root,
      protectedHashes: Record<string, string> = {}
    const before = JSON.parse(
      await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
    )
    const config = JSON.parse(
      await fs.readFile(path.join(root, 'ui-library.config.json'), 'utf8'),
    )
    for (const file of [
      'ui-preset.json',
      'ui-library.config.json',
      config.theme.cssEntry,
      ...Object.keys(before.artifacts),
    ])
      protectedHashes[file] = await sha256(
        await fs.readFile(path.join(root, file), 'utf8'),
      )
    const bank = await recipeReferenceBank()
    for (const recipe of recipeFixtures()) {
      const file = path.join(inputDirectory, recipe.id + '.json')
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, JSON.stringify(recipe))
      const result = await runBuiltCli(
        input.cliRuntime,
        ['add', '--recipe', file, '--yes', '--json'],
        root,
        input.env,
      )
      if (result.code !== 0) throw Error(result.output)
    }
    const lock = JSON.parse(
      await fs.readFile(path.join(root, 'ui-library.lock.json'), 'utf8'),
    )
    if (
      Object.keys(lock.recipes ?? {}).length !== 3 ||
      lock.presetHash !== before.presetHash
    )
      throw Error('Recipe install changed defaults or missed a recipe')
    for (const [file, hash] of Object.entries(protectedHashes))
      if (
        (await sha256(await fs.readFile(path.join(root, file), 'utf8'))) !==
        hash
      )
        throw Error('Recipe modified protected file ' + file)
    for (const record of Object.values(lock.recipes) as InstalledRecipe[])
      for (const [file, meta] of Object.entries(record.artifacts)) {
        const content = await fs.readFile(path.join(root, file), 'utf8'),
          reference = bank.get(meta.logicalPath)
        if (
          !reference ||
          reference.content !== content ||
          (await sha256(content)) !== meta.sha256 ||
          content.includes('@ombelle/')
        )
          throw Error('Recipe differs from canonical artifact ' + file)
      }
    return { recipes: lock.recipes, protectedHashes }
  })
}
