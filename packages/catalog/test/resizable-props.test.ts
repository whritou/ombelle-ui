import { expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { ResizablePanelGroup } from '../src/templates/resizable.js'

// CAT-10: the group set its handle hit sizes after the caller's props, so a caller's resizeTargetMinimumSize was dropped.
const sizes = (props: Parameters<typeof ResizablePanelGroup>[0]) =>
  (ResizablePanelGroup(props) as ReactElement<{ resizeTargetMinimumSize?: unknown }>).props.resizeTargetMinimumSize

it("lets a caller's resizeTargetMinimumSize win, and keeps 44 / 24 px otherwise", () => {
  expect(sizes({ resizeTargetMinimumSize: { coarse: 56, fine: 32 } })).toEqual({ coarse: 56, fine: 32 })
  expect(sizes({ autoSaveId: 'layout', resizeTargetMinimumSize: { coarse: 56, fine: 32 } })).toEqual({ coarse: 56, fine: 32 })
  expect(sizes({})).toEqual({ coarse: 44, fine: 24 })
})
