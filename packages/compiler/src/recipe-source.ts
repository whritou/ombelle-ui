import {
  FoundationError,
  recipeIcons,
  type NormalizedRecipe,
} from '@ombelle/contracts'

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
  const originalPrefix = buttonTemplatePrefix(input.template)
  const prefix = input.recipe ? originalPrefix : originalPrefix.replace(
    "defaultVariants: { variant: 'default', size: 'default' }",
    `defaultVariants: { variant: ${JSON.stringify(input.defaultVariant)}, size: ${JSON.stringify(input.defaultSize)} }`,
  )
  const recipe = input.recipe
  const variant = recipe?.props.variant ?? input.defaultVariant
  const size = recipe?.props.size ?? input.defaultSize
  const definition = recipe?.icon
    ? iconRecipeDefinition(input, recipe, variant, size)
    : recipe
    ? `export type ${input.propsTypeName} = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { loading?: boolean }
export function ${input.componentName}({className, variant=${JSON.stringify(variant)}, size=${JSON.stringify(size)}, type=${JSON.stringify(recipe.props.type)}, disabled=${recipe.props.disabled}, loading=${recipe.props.loading}, children=${JSON.stringify(recipe.content)}, ...props}: ${input.propsTypeName}) {
 const {asChild: _asChild, ...native} = props as typeof props & {asChild?:unknown}
 return <button {...native} ${scopeAttributes(input)} data-variant={variant} data-size={size} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(buttonVariants({variant,size}),className)}>{loading && <span data-slot="button-spinner" aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />}{children}</button>
}`
    : `export type ${input.propsTypeName} = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>
export function ${input.componentName}({className, variant=${JSON.stringify(variant)}, size=${JSON.stringify(size)}, type='button', children, ...props}: ${input.propsTypeName}) {
 return <button {...props} ${scopeAttributes(input)} data-variant={variant} data-size={size} type={type} className={cn(buttonVariants({variant,size}),className)}>{children}</button>
}`
  return prefix + "\nimport './button.css'\n" + definition + '\n'
}

/**
 * A recipe Button with a reviewed lucide-react icon. The icon is decorative
 * (aria-hidden); in icon-only mode the saved content becomes the default
 * aria-label and no children render, so the Button keeps an accessible name.
 */
function iconRecipeDefinition(
  input: ScopedButtonRenderInput,
  recipe: NormalizedRecipe,
  variant: string,
  size: string,
): string {
  const icon = recipe.icon!
  const Icon = recipeIcons[icon.name]
  const glyph = `<${Icon} aria-hidden="true" focusable="false" data-slot="${input.slot}-icon" />`
  const head = `import { ${Icon} } from 'lucide-react'
`
  // While loading, the spinner takes the icon's place (or leads an end icon).
  const spinner = '<span data-slot="button-spinner" aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />'
  const loadingGlyph = `{loading ? ${spinner} : ${glyph}}`
  const shared = `className, variant=${JSON.stringify(variant)}, size=${JSON.stringify(size)}, type=${JSON.stringify(recipe.props.type)}, disabled=${recipe.props.disabled}, loading=${recipe.props.loading}`
  const attributes = `${scopeAttributes(input)} data-variant={variant} data-size={size} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(buttonVariants({variant,size}),className)}`
  if (icon.iconOnly)
    return head + `export type ${input.propsTypeName} = Omit<React.ComponentProps<'button'>, 'children'> & VariantProps<typeof buttonVariants> & { loading?: boolean }
export function ${input.componentName}({${shared}, 'aria-label': ariaLabel=${JSON.stringify(recipe.content)}, ...props}: ${input.propsTypeName}) {
 const {asChild: _asChild, children: _children, ...native} = props as typeof props & {asChild?:unknown; children?:unknown}
 return <button {...native} ${attributes} aria-label={ariaLabel} data-icon-only="">${loadingGlyph}</button>
}`
  const content = icon.position === 'end' ? `{loading && ${spinner}}{children}${glyph}` : `${loadingGlyph}{children}`
  return head + `export type ${input.propsTypeName} = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { loading?: boolean }
export function ${input.componentName}({${shared}, children=${JSON.stringify(recipe.content)}, ...props}: ${input.propsTypeName}) {
 const {asChild: _asChild, ...native} = props as typeof props & {asChild?:unknown}
 return <button {...native} ${attributes} data-icon-position=${JSON.stringify(icon.position)}>${content}</button>
}`
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
