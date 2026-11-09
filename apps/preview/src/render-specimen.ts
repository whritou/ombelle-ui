import * as React from 'react'
import type { RecipeSpecimen } from '@ombelle/compiler'

export type Primitives = Record<string, React.ElementType>

/** Render a recipe specimen tree with the given primitives; local ids are made unique per instance. */
export function renderSpecimen(specimen: RecipeSpecimen, primitives: Primitives, instanceId: string,
  options: { triggerClass?(tag: string): string | undefined } = {}): React.ReactElement {
  const props: Record<string, unknown> = Object.fromEntries(Object.entries(specimen.props).map(([key, value]) =>
    [key, value && typeof value === 'object' && 'localId' in value ? instanceId + value.localId : value]))
  const className = options.triggerClass?.(specimen.tag)
  if (className) props.className = className
  return React.createElement(primitives[specimen.tag] ?? specimen.tag, props, ...specimen.children.map(child =>
    typeof child === 'string' ? child : renderSpecimen(child, primitives, instanceId, options)))
}
