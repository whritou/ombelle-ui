'use client'

import * as React from 'react'

/** The stage element Radix portals render into, so scoped preview styles still apply. */
export const PreviewPortalContainer = React.createContext<HTMLElement | null>(null)

type PreviewPortalProps = {
  portal: React.ComponentType<any>
  container?: Element | DocumentFragment | null
} & Record<string, unknown>

/** Renders a Radix `Portal` into the preview stage unless a non-null container is given. */
export function PreviewPortal({ portal: Portal, container, ...props }: PreviewPortalProps) {
  const stage = React.useContext(PreviewPortalContainer)
  return <Portal {...props} container={container ?? stage ?? undefined} />
}
