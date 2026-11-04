import * as React from 'react'

// Scenes use only catalog components, imported from the same reviewed sources
// the gallery renders (see scripts/generate-preset-gallery.ts).

export type SceneProps = {
  /** Component ids the active family cannot style. */
  unavailable: readonly string[]
  familyLabel: string
}

/** The gallery's labelled placeholder, for a component the family lacks. */
export function Unavailable({
  id,
  name,
  familyLabel,
}: {
  id: string
  name: string
  familyLabel: string
}) {
  return (
    <div
      className="preset-unavailable"
      data-component={id}
      data-unavailable=""
      aria-disabled="true"
    >
      <strong>{name}</strong>
      <span>Unavailable in {familyLabel}</span>
    </div>
  )
}

export function gate({ unavailable, familyLabel }: SceneProps) {
  return (id: string, name: string, node: React.ReactNode) =>
    unavailable.includes(id) ? (
      <Unavailable id={id} name={name} familyLabel={familyLabel} />
    ) : (
      node
    )
}
