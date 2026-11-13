import * as React from 'react'
import { cn } from './utils.js'
import './aspect-ratio.css'

export type AspectRatioProps = React.ComponentProps<'div'> & {
  /** Width over height, such as 16 / 9. */
  ratio?: number
}

/** Keeps its content at a fixed ratio while its width follows the layout, so nothing jumps while media loads. */
export function AspectRatio({ ratio = 16 / 9, className, style, ...props }: AspectRatioProps) {
  return <div {...props} data-slot="aspect-ratio" className={cn(className)} style={{ aspectRatio: String(ratio), ...style }} />
}
