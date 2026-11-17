import * as React from 'react'
import { cn } from './utils.js'
import './prose.css'

export type ProseProps = React.ComponentProps<'div'> & {
  /** Line length: narrow (60ch), default (72ch) or wide (88ch). A className max-width overrides it. */
  measure?: 'narrow' | 'default' | 'wide'
}

/** Styles the headings, text, lists, quotes, code and tables written inside it; nested catalog components keep their own look. */
export function Prose({ measure, className, ...props }: ProseProps) {
  return <div {...props} data-slot="prose" data-prose="" data-measure={measure === 'default' ? undefined : measure} className={cn(className)} />
}

/** The opening paragraph, set larger and quieter than the body text. */
export function ProseLead({ className, ...props }: React.ComponentProps<'p'>) {
  return <p {...props} data-slot="prose-lead" className={cn(className)} />
}
