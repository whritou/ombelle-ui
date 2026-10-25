import fs from 'node:fs/promises'
import path from 'node:path'
import type { StyleFamily } from '@ombelle/contracts'
import { writeConsumerComponentPresetFixture } from './component-preset-fixture.js'
export async function writeScenarioFixture(
  root: string,
  family: StyleFamily,
  recipes = false,
  componentPresets = false,
  badges = false,
  cards = false,
  forms = false,
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
      .replace(/import \{ RecipeFixture \} from '\.\/recipe-fixture'\r?\n/, '')
      .replace(/\{recipes && <RecipeFixture \/>}\r?\n?/, '')
  if (!componentPresets)
    scenario = scenario
      .replace(
        /import \{ ComponentPresetFixture \} from '\.\/component-preset-fixture'\r?\n/,
        '',
      )
      .replace(/\{componentPresets && <ComponentPresetFixture \/>}\r?\n?/, '')
  if (!badges)
    scenario = scenario
      .replace(/import \{ BadgeFixture \} from '\.\/badge-fixture'\r?\n/, '')
      .replace(/\{badges && <BadgeFixture \/>}\r?\n?/, '')
  if (!cards)
    scenario = scenario
      .replace(/import \{ CardFixture \} from '\.\/card-fixture'\r?\n/, '')
      .replace(/\{cards && <CardFixture \/>}\r?\n?/, '')
  if (!forms)
    scenario = scenario
      .replace(/import \{ FormsFixture \} from '\.\/forms-fixture'\r?\n/, '')
      .replace(/\{forms && <FormsFixture \/>}\r?\n?/, '')
  await fs.writeFile(path.join(src, 'scenario.tsx'), scenario)
  for (const file of [
    'state-fixture.tsx',
    'state-fixture.css',
    ...(recipes ? ['recipe-fixture.tsx'] : []),
    ...(badges ? ['badge-fixture.tsx'] : []),
    ...(cards ? ['card-fixture.tsx'] : []),
    ...(forms ? ['forms-fixture.tsx'] : []),
  ])
    await fs.copyFile(path.join('fixtures/shared', file), path.join(src, file))
  if (componentPresets) await writeConsumerComponentPresetFixture(root)
}
