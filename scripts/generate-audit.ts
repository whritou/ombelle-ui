// Writes the data behind /audit/<family>/<edition>/: every catalog specimen as a project would install it.
import fs from 'node:fs/promises'
import path from 'node:path'
import { compileComponentRecipe, describeComponentRecipe, type RecipeSpecimen } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import {
  componentRecipeComponents, componentRecipeFields, defaultRecipeFields, styleFamilies, supportedComponentIds,
  validateComponentRecipe, type ComponentId, type ComponentRecipe, type StyleFamily,
} from '@ombelle/contracts'
import { glassPresetBackdrop } from '../apps/www/src/site/glass-presets.js'
import type { PresetBackdrop } from '../apps/www/src/preset-editor/preview-protocol.js'

export type AuditEdition = 'radix' | 'base'
/** id is the component, or component~variant for a variant specimen of it. */
export type AuditSpecimen = { id: string; component: ComponentId; scope: string | null; css: string | null; specimen: RecipeSpecimen }
export type AuditData = {
  family: StyleFamily
  edition: AuditEdition
  backdrop: { light: PresetBackdrop | null; dark: PresetBackdrop | null }
  specimens: AuditSpecimen[]
}

/** Button has no catalog recipe; its audit specimen is the ordinary component with the default variant. */
const buttonSpecimen: RecipeSpecimen = { tag: 'Button', props: {}, children: ['Save changes'] }
const buttonVariants: Record<string, RecipeSpecimen> = {
  'link-destructive': { tag: 'Button', props: { variant: 'link-destructive' }, children: ['Remove member'] },
  loading: { tag: 'Button', props: { loading: true }, children: ['Saving…'] },
}

/** The 0.7.3 variants measured beside each component's default specimen, as recipe props. */
const recipeVariants: Partial<Record<ComponentId, Record<string, Record<string, unknown>>>> = {
  badge: { soft: { appearance: 'soft', variant: 'warning' }, 'soft-success': { appearance: 'soft', variant: 'success', size: 'sm', dot: true },
    outline: { appearance: 'outline', variant: 'destructive' }, 'outline-success': { appearance: 'outline', variant: 'success' },
    'outline-warning': { appearance: 'outline', variant: 'warning' }, 'outline-info': { appearance: 'outline', variant: 'info' } },
  alert: { dismissible: { dismissible: true, actions: true, variant: 'info' }, compact: { layout: 'compact', variant: 'warning' } },
  card: { link: { mode: 'link' }, options: { mode: 'options' }, media: { mode: 'media' } },
  avatar: { square: { shape: 'square' }, overflow: { overflow: 4 } },
  accordion: { flush: { appearance: 'flush', icon: 'plus' }, chevron: { icon: 'chevron' } },
}

function presetRef(family: StyleFamily): ComponentRecipe['presetRef'] {
  const catalog = getCatalog('0.1.0')
  const { id, revision, catalogRelease, compilerVersion } = family === 'liquid-glass'
    ? catalog.startingPresets['builtin-liquid-glass'] : catalog.presets[family]
  return { id, revision, catalogRelease, compilerVersion }
}

/** The component editor's starting draft for a component, pinned to the family's built-in preset. */
function draft(component: ComponentRecipe['component'], family: StyleFamily, props: Record<string, unknown> = {}): ComponentRecipe {
  return validateComponentRecipe({ schemaVersion: '2.0', component, id: `catalog_${component.replaceAll('-', '_')}`,
    revision: 1, presetRef: presetRef(family), props, content: defaultRecipeFields(componentRecipeFields(component).content) })
}

async function familyData(family: StyleFamily): Promise<Record<AuditEdition, AuditData>> {
  const recipes = new Set<string>(componentRecipeComponents)
  const radix: AuditSpecimen[] = []
  const base: AuditSpecimen[] = []
  for (const component of [...supportedComponentIds].sort()) {
    if (!recipes.has(component)) {
      const sections: [string, RecipeSpecimen][] = [[component, buttonSpecimen],
        ...Object.entries(buttonVariants).map(([name, value]): [string, RecipeSpecimen] => [`${component}~${name}`, value])]
      for (const [id, specimen] of sections) {
        radix.push({ id, component, scope: null, css: null, specimen })
        base.push({ id, component, scope: null, css: null, specimen })
      }
      continue
    }
    for (const [name, props] of [['', {}], ...Object.entries(recipeVariants[component] ?? {})] as const) {
      const id = name ? `${component}~${name}` : component
      const recipe = draft(component as ComponentRecipe['component'], family, props)
      const result = await compileComponentRecipe({ recipe })
      const specimen = describeComponentRecipe(recipe)
      const css = result.artifacts.find(artifact => artifact.logicalPath.endsWith(`/${component}.css`))!.content
      radix.push({ id, component, scope: result.scope, css, specimen })
      base.push({ id, component, scope: null, css: null, specimen })
    }
  }
  const backdrop = family === 'liquid-glass'
    ? { light: glassPresetBackdrop('builtin-liquid-glass', 'light'), dark: glassPresetBackdrop('builtin-liquid-glass', 'dark') }
    : { light: null, dark: null }
  return { radix: { family, edition: 'radix', backdrop, specimens: radix }, base: { family, edition: 'base', backdrop, specimens: base } }
}

export async function writeAuditPages(root: string): Promise<void> {
  await fs.mkdir(root, { recursive: true })
  const keys: string[] = []
  for (const family of styleFamilies) {
    const data = await familyData(family)
    for (const edition of ['radix', 'base'] as const) {
      keys.push(`${family}-${edition}`)
      await fs.writeFile(path.join(root, `${family}-${edition}.json`), JSON.stringify(data[edition], null, 2) + '\n')
    }
  }
  await fs.writeFile(path.join(root, 'index.ts'), '// Generated by scripts/generate-audit.ts.\n' +
    "import type { AuditData } from '../../../../../scripts/generate-audit'\n" +
    'export const auditData: Record<string, () => Promise<{ default: AuditData }>> = {\n' +
    keys.sort().map(key => `  '${key}': () => import('./${key}.json') as Promise<{ default: AuditData }>,`).join('\n') + '\n}\n')
}
