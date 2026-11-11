import { redirect } from 'next/navigation'
import { editableComponents } from '../../../editor/editable-components'

export default function ComponentEditorPage() {
  // The list is alphabetical; the component editor still opens on the Button.
  redirect((editableComponents.find((component) => component.id === 'button') ?? editableComponents[0]).href)
}
