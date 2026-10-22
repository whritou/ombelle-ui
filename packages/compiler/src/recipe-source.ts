import { FoundationError, type NormalizedRecipe } from '@ombelle/contracts'

function templatePrefix(template: string): string {
  const boundary = template.indexOf('export type ButtonProps')
  if (boundary < 0)
    throw new FoundationError(
      'INVALID_DATA',
      'Reviewed Button template does not expose its expected boundary',
    )
  return template
    .slice(0, boundary)
    .replace("import { Slot } from '@radix-ui/react-slot'\n", '')
    .replace("'./utils.js'", "'@/lib/utils'")
}

export function renderRecipeButton(input: {
  template: string
  recipe: NormalizedRecipe
  scope: string
}): string {
  const prefix = templatePrefix(input.template)
  const p = input.recipe.props
  return (
    prefix +
    `
import './button.css'
export type RecipeButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { loading?: boolean }
export function RecipeButton({className, variant=${JSON.stringify(p.variant)}, size=${JSON.stringify(p.size)}, type=${JSON.stringify(p.type)}, disabled=${p.disabled}, loading=${p.loading}, children=${JSON.stringify(input.recipe.content)}, ...props}: RecipeButtonProps) {
 const {asChild: _asChild, ...native} = props as typeof props & {asChild?:unknown}
 return <button {...native} data-slot="recipe-button" data-ombelle-recipe="${input.scope}" data-variant={variant} data-size={size} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(buttonVariants({variant,size}),className)}>{children}</button>
}
`
  )
}

export function renderScopedButton(input: {
  template: string
  scope: string
  slot: string
  scopeAttribute: string
  variant: string
  size: string
}): string {
  const prefix = templatePrefix(input.template).replace(
    "defaultVariants: { variant: 'default', size: 'default' }",
    `defaultVariants: { variant: ${JSON.stringify(input.variant)}, size: ${JSON.stringify(input.size)} }`,
  )
  return (
    prefix +
    `
import './button.css'
export type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>
export function Button({className,variant=${JSON.stringify(input.variant)},size=${JSON.stringify(input.size)},type='button',...props}: ButtonProps) {
 return <button {...props} data-slot="${input.slot}" ${input.scopeAttribute}="${input.scope}" data-variant={variant} data-size={size} type={type} className={cn(buttonVariants({variant,size}),className)} />
}
`
  )
}
