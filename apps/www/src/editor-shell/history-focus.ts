/** Marks the phone's More actions button, where history focus lands when Undo or Redo is not shown. */
export const phoneMoreAttribute = 'data-phone-more'

/**
 * Moves focus to the history button that is still enabled after an undo or redo. On a phone Redo
 * lives in More actions, so a hidden target hands focus to the More actions button instead.
 */
export function focusHistoryTarget(target: HTMLElement | null) {
  if (!target) return
  const shown = typeof target.checkVisibility === 'function' ? target.checkVisibility() : target.offsetParent !== null
  if (shown) target.focus()
  else document.querySelector<HTMLElement>(`[${phoneMoreAttribute}]`)?.focus()
}
