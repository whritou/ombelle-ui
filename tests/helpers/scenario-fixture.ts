import fs from 'node:fs/promises'
import path from 'node:path'
import type { StyleFamily } from '@ombelle/contracts'
export async function writeScenarioFixture(
  root: string,
  family: StyleFamily,
  recipes = false,
): Promise<void> {
  const src = path.join(root, 'src')
  await fs.mkdir(src, { recursive: true })
  await fs.writeFile(
    path.join(src, 'index.css'),
    await fs.readFile('fixtures/shared/base.css', 'utf8'),
  )
  let scenario = (
    await fs.readFile('fixtures/shared/scenario.tsx', 'utf8')
  ).replaceAll('STYLE_FAMILY', family)
  if (!recipes)
    scenario = scenario
      .replace("import { RecipeFixture } from './recipe-fixture'\n", '')
      .replace('{recipes && <RecipeFixture />}', '')
  await fs.writeFile(path.join(src, 'scenario.tsx'), scenario)
  for (const file of [
    'state-fixture.tsx',
    'state-fixture.css',
    ...(recipes ? ['recipe-fixture.tsx'] : []),
  ])
    await fs.copyFile(path.join('fixtures/shared', file), path.join(src, file))
}
