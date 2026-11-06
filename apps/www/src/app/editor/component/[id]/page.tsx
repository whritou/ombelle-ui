import { notFound } from 'next/navigation'
import { CatalogComponentEditor } from '../../../../editor/components/catalog-component-editor'
import { editableComponents } from '../../../../editor/editable-components'

export default async function ComponentEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const component = editableComponents.find(entry => entry.id === id)
  if (!component || component.id !== 'badge') notFound()
  return <CatalogComponentEditor key={component.id} component={component.id} name={component.label} />
}
