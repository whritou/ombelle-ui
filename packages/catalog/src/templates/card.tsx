import * as React from 'react'
import { cn } from './utils.js'
import './card.css'

export type CardProps = React.ComponentProps<'div'> & {
  density?: 'default' | 'dense'
}

export function Card({ className, density = 'default', ...props }: CardProps) {
  return (
    <div
      {...props}
      data-slot="card"
      data-density={density}
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
