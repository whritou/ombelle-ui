import { describe, expect, it } from 'vitest'
import { acceptPreviewSize, previewFrameHeight, previewSizeMessage } from './preview-size'

describe('preview size messages', () => {
  it('sends the content height rounded up to a whole pixel', () => {
    expect(previewSizeMessage(412.2)).toEqual({ type: 'preview-size', blockSize: 413 })
  })

  it('accepts exactly a type and a positive, bounded height', () => {
    expect(acceptPreviewSize({ type: 'preview-size', blockSize: 640 })).toBe(640)
    expect(acceptPreviewSize({ type: 'preview-size', blockSize: 640, extra: 1 })).toBeNull()
    expect(acceptPreviewSize({ type: 'preview-size', blockSize: '640' })).toBeNull()
    expect(acceptPreviewSize({ type: 'preview-size', blockSize: Number.NaN })).toBeNull()
    expect(acceptPreviewSize({ type: 'preview-size', blockSize: 0 })).toBeNull()
    expect(acceptPreviewSize({ type: 'preview-size', blockSize: 20001 })).toBeNull()
    expect(acceptPreviewSize({ type: 'catalog-measure', blockSize: 640 })).toBeNull()
    expect(acceptPreviewSize(null)).toBeNull()
  })

  it('keeps the frame between its 20rem minimum and a 2000px ceiling', () => {
    expect(previewFrameHeight(null)).toBe(320)
    expect(previewFrameHeight(120)).toBe(320)
    expect(previewFrameHeight(880)).toBe(880)
    expect(previewFrameHeight(9000)).toBe(2000)
  })
})
