import fs from 'node:fs/promises'
import path from 'node:path'
import type { StyleFamily } from '@ombelle/contracts'
import { writeConsumerComponentPresetFixture } from './component-preset-fixture.js'
export type ScenarioFixtures = {
  recipes?: boolean
  componentPresets?: boolean
  badges?: boolean
  cards?: boolean
  forms?: boolean
  checkboxes?: boolean
  switches?: boolean
  tabs?: boolean
  tooltips?: boolean
}

const optionalFixtures = [
  { option: 'recipes', component: 'RecipeFixture', file: 'recipe-fixture' },
  { option: 'componentPresets', component: 'ComponentPresetFixture', file: 'component-preset-fixture' },
  { option: 'badges', component: 'BadgeFixture', file: 'badge-fixture' },
  { option: 'cards', component: 'CardFixture', file: 'card-fixture' },
  { option: 'forms', component: 'FormsFixture', file: 'forms-fixture' },
  { option: 'checkboxes', component: 'CheckboxFixture', file: 'checkbox-fixture' },
  { option: 'switches', component: 'SwitchFixture', file: 'switch-fixture' },
  { option: 'tabs', component: 'TabsFixture', file: 'tabs-fixture' },
  { option: 'tooltips', component: 'TooltipFixture', file: 'tooltip-fixture' },
] as const

export async function writeScenarioFixture(
  root: string,
  family: StyleFamily,
  options: ScenarioFixtures = {},
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
  for (const fixture of optionalFixtures) {
    if (options[fixture.option]) continue
    scenario = scenario
      .replace(`import { ${fixture.component} } from './${fixture.file}'\n`, '')
      .replace(`import { ${fixture.component} } from './${fixture.file}'\r\n`, '')
      .replace(`      {${fixture.option} && <${fixture.component} />}\n`, '')
      .replace(`      {${fixture.option} && <${fixture.component} />}\r\n`, '')
  }
  await fs.writeFile(path.join(src, 'scenario.tsx'), scenario)
  for (const file of ['state-fixture.tsx', 'state-fixture.css'])
    await fs.copyFile(path.join('fixtures/shared', file), path.join(src, file))
  for (const fixture of optionalFixtures) {
    if (!options[fixture.option] || fixture.option === 'componentPresets') continue
    const file = fixture.file + '.tsx'
    await fs.copyFile(path.join('fixtures/shared', file), path.join(src, file))
  }
  if (options.componentPresets) await writeConsumerComponentPresetFixture(root)
}
