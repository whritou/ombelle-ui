import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { PresetGallery } from '../../../preview/src/generated/preset-gallery/gallery'

it('renders the same gallery HTML as before the split', async () => {
  await expect(renderToStaticMarkup(<PresetGallery />)).toMatchFileSnapshot(
    './__snapshots__/preset-gallery.html',
  )
})
