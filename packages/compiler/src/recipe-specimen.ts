import type { ComponentRecipe } from '@ombelle/contracts'

export type RecipeSpecimen = {
  tag: string
  props: Record<string, string | number | boolean>
  children: readonly (RecipeSpecimen | string)[]
}

export function describeComponentRecipe(recipe: ComponentRecipe): RecipeSpecimen {
  return {
    tag: 'Badge',
    props: { variant: recipe.props.variant ?? 'default' },
    children: [recipe.content.label],
  }
}

export function renderRecipeSpecimen(specimen: RecipeSpecimen): string {
  const props = Object.entries(specimen.props)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([name, value]) => ` ${name}={${JSON.stringify(value)}}`).join('')
  const children = specimen.children.map(child =>
    typeof child === 'string' ? `{${JSON.stringify(child)}}` : renderRecipeSpecimen(child)).join('')
  return children
    ? `<${specimen.tag}${props}>${children}</${specimen.tag}>`
    : `<${specimen.tag}${props} />`
}
