'use client'
import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDownIcon, PlusIcon } from 'lucide-react'
import { cn } from './utils.js'
import './accordion.css'

/** The icon chosen on Accordion; undefined keeps the family's own. */
const AccordionIcon = React.createContext<'chevron' | 'plus' | undefined>(undefined)

export type AccordionProps = React.ComponentProps<
  typeof AccordionPrimitive.Root
> & {
  /** flush drops the outer border and background, leaving dividers. */
  appearance?: 'bordered' | 'flush'
  /** Shows only this icon; leave it out for the family's own. */
  icon?: 'chevron' | 'plus'
}

export function Accordion({ className, appearance, icon, ...props }: AccordionProps) {
  return (
    <AccordionIcon.Provider value={icon}>
      <AccordionPrimitive.Root
        data-slot="accordion"
        className={cn(className)}
        {...props}
        data-appearance={appearance}
        data-icon={icon}
      />
    </AccordionIcon.Provider>
  )
}

export function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(className)}
      {...props}
    />
  )
}

/**
 * The trigger sits in a heading (h3 by default; set `level` to fit the
 * page outline). Families show either a chevron or a plus icon.
 */
export function AccordionTrigger({
  className,
  children,
  level = 3,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  level?: 2 | 3 | 4 | 5 | 6
}) {
  const Heading = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  const icon = React.useContext(AccordionIcon)
  return (
    <AccordionPrimitive.Header data-slot="accordion-header" asChild>
      <Heading>
        <AccordionPrimitive.Trigger
          data-slot="accordion-trigger"
          className={cn(className)}
          {...props}
        >
          {children}
          <span data-slot="accordion-icon" aria-hidden="true">
            {icon === 'chevron' ? (
              <ChevronDownIcon data-accordion-glyph="chevron" />
            ) : icon === 'plus' ? (
              // One plus; CSS hides its vertical stroke when open, leaving a minus.
              <PlusIcon data-accordion-glyph="plus" />
            ) : (
              <>
                <ChevronDownIcon data-accordion-icon="chevron" />
                <PlusIcon data-accordion-icon="plus" />
              </>
            )}
          </span>
        </AccordionPrimitive.Trigger>
      </Heading>
    </AccordionPrimitive.Header>
  )
}

export function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn(className)}
      {...props}
    >
      <div data-slot="accordion-content-inner">{children}</div>
    </AccordionPrimitive.Content>
  )
}
