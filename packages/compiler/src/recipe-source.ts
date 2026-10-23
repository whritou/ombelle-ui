import { FoundationError, type NormalizedRecipe } from '@ombelle/contracts'

type ScopedButtonRenderInput = {
  template: string
  componentName: string
  propsTypeName: string
  scope: string
  slot: string
  scopeAttribute: string
  defaultVariant: string
  defaultSize: string
  recipe?: NormalizedRecipe
}

function buttonTemplatePrefix(template: string): string {
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

function scopeAttributes(input: {
  scope: string
  slot: string
  scopeAttribute: string
}): string {
  return `data-slot="${input.slot}" ${input.scopeAttribute}="${input.scope}"`
}

export function renderScopedButton(input: ScopedButtonRenderInput): string {
  const prefix = buttonTemplatePrefix(input.template)
  const recipe = input.recipe
  const variant = recipe?.props.variant ?? input.defaultVariant
  const size = recipe?.props.size ?? input.defaultSize
  const definition = recipe
    ? `export type ${input.propsTypeName} = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { loading?: boolean }
export function ${input.componentName}({className, variant=${JSON.stringify(variant)}, size=${JSON.stringify(size)}, type=${JSON.stringify(recipe.props.type)}, disabled=${recipe.props.disabled}, loading=${recipe.props.loading}, children=${JSON.stringify(recipe.content)}, ...props}: ${input.propsTypeName}) {
 const {asChild: _asChild, ...native} = props as typeof props & {asChild?:unknown}
 return <button {...native} ${scopeAttributes(input)} data-variant={variant} data-size={size} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(buttonVariants({variant,size}),className)}>{children}</button>
}`
    : `export type ${input.propsTypeName} = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>
export function ${input.componentName}({className, variant=${JSON.stringify(variant)}, size=${JSON.stringify(size)}, type='button', children, ...props}: ${input.propsTypeName}) {
 return <button {...props} ${scopeAttributes(input)} data-variant={variant} data-size={size} type={type} className={cn(buttonVariants({variant,size}),className)}>{children}</button>
}`
  return prefix + "\nimport './button.css'\n" + definition + '\n'
}

export function renderRecipeButton(input: {
  template: string
  recipe: NormalizedRecipe
  scope: string
}): string {
  return renderScopedButton({
    template: input.template,
    recipe: input.recipe,
    componentName: 'RecipeButton',
    propsTypeName: 'RecipeButtonProps',
    scope: input.scope,
    slot: 'recipe-button',
    scopeAttribute: 'data-ombelle-recipe',
    defaultVariant: input.recipe.props.variant,
    defaultSize: input.recipe.props.size,
  })
}
