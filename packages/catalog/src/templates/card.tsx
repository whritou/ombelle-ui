import * as React from 'react'
import { cn } from './utils.js'
import './card.css'

export type CardProps = React.ComponentProps<'div'> & {
  density?: 'default' | 'dense'
  appearance?: 'default' | 'outlined' | 'subtle'
}

export function Card({
  className,
  density = 'default',
  appearance = 'default',
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      data-slot="card"
      data-density={density}
      data-appearance={appearance}
      className={cn(className)}
    />
  )
}

export type CardHeaderProps = React.ComponentProps<'div'>

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <div {...props} data-slot="card-header" className={cn(className)} />
}

export type CardTitleProps = React.ComponentProps<'h3'> & {
  level?: 1 | 2 | 3 | 4 | 5 | 6
}

export function CardTitle({ className, level = 3, ...props }: CardTitleProps) {
  const Heading = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  return <Heading {...props} data-slot="card-title" className={cn(className)} />
}

export type CardDescriptionProps = React.ComponentProps<'p'>

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <p {...props} data-slot="card-description" className={cn(className)} />
}

export type CardContentProps = React.ComponentProps<'div'>

export function CardContent({ className, ...props }: CardContentProps) {
  return <div {...props} data-slot="card-content" className={cn(className)} />
}

export type CardFooterProps = React.ComponentProps<'div'>

export function CardFooter({ className, ...props }: CardFooterProps) {
  return <div {...props} data-slot="card-footer" className={cn(className)} />
}

export type CardLinkProps = React.ComponentProps<'a'>

/**
 * Makes the whole card a link: put it in CardTitle. The link's name stays the
 * title, text stays selectable, and other buttons and links in the card still work.
 */
export function CardLink({ className, ...props }: CardLinkProps) {
  return <a {...props} data-slot="card-link" data-card-link="" className={cn(className)} />
}

export type CardMediaProps =
  | (React.ComponentProps<'img'> & { alt: string; children?: never })
  | (React.ComponentProps<'div'> & { children: React.ReactNode; src?: never; alt?: never })

/** An image or cover above the content. Use alt="" when the image is decorative. */
export function CardMedia({ className, ...props }: CardMediaProps) {
  if ('children' in props && props.children !== undefined) {
    const rest = props as React.ComponentProps<'div'>
    return <div aria-hidden="true" {...rest} data-slot="card-media" data-card-media="" className={cn(className)} />
  }
  const image = props as React.ComponentProps<'img'>
  return <img {...image} data-slot="card-media" data-card-media="" className={cn(className)} />
}

export type CardGroupProps = Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> & {
  /** Shared by the options' radios; the chosen value is submitted under it. */
  name: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  required?: boolean
  orientation?: 'horizontal' | 'vertical'
}

type CardOptionGroupProps = {
  name?: string
  checked?: boolean
  defaultChecked?: boolean
  onValueChange?: (value: string) => void
  groupDisabled?: boolean
  required?: boolean
}

/**
 * Cards to pick one of. Each CardOption holds a native radio, so the group has one
 * Tab stop, arrow keys move and choose, and forms submit the value without script.
 * Name the group with aria-label or aria-labelledby.
 */
export function CardGroup({
  className,
  name,
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  orientation = 'horizontal',
  children,
  ...props
}: CardGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-required={required || undefined}
      aria-disabled={disabled || undefined}
      aria-orientation={orientation}
      {...props}
      data-slot="card-group"
      data-orientation={orientation}
      className={cn(className)}
    >
      {React.Children.map(children, child => {
        if (!React.isValidElement<CardOptionProps & CardOptionGroupProps>(child) || child.type !== CardOption) return child
        const own = child.props.value
        return React.cloneElement(child, {
          name,
          ...(value !== undefined ? { checked: value === own } : { defaultChecked: defaultValue === own }),
          onValueChange,
          groupDisabled: disabled,
          required,
        })
      })}
    </div>
  )
}

export type CardOptionProps = Omit<React.ComponentProps<'label'>, 'title'> & {
  value: string
  /** Set by CardGroup for its direct children; pass it yourself when a wrapper renders the option. */
  name?: string
  title: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
}

/**
 * One choice in a CardGroup, drawn as a card. CardGroup wires its direct CardOption children;
 * an option rendered by another component needs the group's name passed to it.
 */
export function CardOption({
  className,
  value,
  title,
  description,
  disabled,
  children,
  ...props
}: CardOptionProps) {
  const { name, checked, defaultChecked, onValueChange, groupDisabled, required, ...rest } = props as Omit<typeof props, 'name'> & CardOptionGroupProps
  const id = React.useId()
  return (
    <label {...rest} data-slot="card-option" className={cn(className)}>
      <input
        type="radio"
        data-card-option-input=""
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onValueChange ? () => onValueChange(value) : undefined}
        readOnly={checked !== undefined && !onValueChange ? true : undefined}
        disabled={disabled || groupDisabled || undefined}
        required={required || undefined}
        aria-labelledby={id + 'title'}
        aria-describedby={description ? id + 'description' : undefined}
      />
      <span data-slot="card-title" id={id + 'title'}>{title}</span>
      {description ? <p data-slot="card-description" id={id + 'description'}>{description}</p> : null}
      {children}
      <span data-slot="card-option-check" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    </label>
  )
}
