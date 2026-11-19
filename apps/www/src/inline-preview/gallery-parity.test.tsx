// @vitest-environment jsdom
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { PresetGallery } from '../../../preview/src/generated/preset-gallery/gallery'
import { Specimen as ProjectForm } from '../../../preview/src/generated/preset-gallery/specimens/project-form'

const formParts = ['label', 'input', 'textarea', 'native-select', 'checkbox', 'switch', 'select', 'radio-group']

it('renders the same gallery HTML as before the split', async () => {
  await expect(renderToStaticMarkup(<PresetGallery />)).toMatchFileSnapshot(
    './__snapshots__/preset-gallery.html',
  )
})

// The iframe preview hides every part of a multi-part group except the focused
// one (apps/preview/src/preset-preview.tsx); this mirrors that logic on the full gallery.
function labelsInside(part: HTMLElement, shown: HTMLElement | undefined) {
  if (!shown) return false
  return Array.from(part.querySelectorAll('label')).some(
    (label) => label.htmlFor !== '' && shown.querySelector(`#${label.htmlFor}`) !== null,
  )
}
function iframeVisibleParts(focus: string) {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(<PresetGallery />)
  const form = host.querySelector<HTMLElement>('form.preset-form')!
  const parts = Array.from(form.querySelectorAll<HTMLElement>(':scope > [data-component]'))
  const shown = parts.find((part) => part.dataset.component === focus)
  return parts
    .filter((part) => !(part !== shown && !(part.dataset.component === 'label' && (focus === 'label' || labelsInside(part, shown)))))
    .map((part) => part.dataset.component)
}
function specimenParts(only: string) {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(<ProjectForm only={only} />)
  const form = host.querySelector('form.preset-form')!
  return Array.from(form.querySelectorAll<HTMLElement>(':scope > [data-component]')).map((part) => part.dataset.component)
}

it.each(formParts)('keeps the same parts as the iframe for the %s control', (id) => {
  expect(specimenParts(id)).toEqual(iframeVisibleParts(id))
})
