import { redirect } from 'next/navigation'
import { editableComponents } from '../../../editor/editable-components'

export default function ComponentEditorPage() {
  redirect(editableComponents[0].href)
}
