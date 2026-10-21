import { FoundationError, type NormalizedRecipe } from '@ombelle/contracts'
export function renderRecipeButton(input: { template: string; recipe: NormalizedRecipe; scope: string }): string {
  const boundary = input.template.indexOf('export type ButtonProps')
  if (boundary < 0) throw new FoundationError('INVALID_DATA', 'Reviewed Button template does not expose its expected boundary')
  const prefix = input.template.slice(0,boundary).replace("import { Slot } from '@radix-ui/react-slot'\n", '').replace("'./utils.js'", "'@/lib/utils'")
  const p = input.recipe.props
  return prefix + `
import './button.css'
export type RecipeButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { loading?: boolean }
export function RecipeButton({className, variant=${JSON.stringify(p.variant)}, size=${JSON.stringify(p.size)}, type=${JSON.stringify(p.type)}, disabled=${p.disabled}, loading=${p.loading}, children=${JSON.stringify(input.recipe.content)}, ...props}: RecipeButtonProps) {
 const {asChild: _asChild, ...native} = props as typeof props & {asChild?:unknown}
 return <button {...native} data-slot="recipe-button" data-ombelle-recipe="${input.scope}" data-variant={variant} data-size={size} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(buttonVariants({variant,size}),className)}>{children}</button>
}
`
}
