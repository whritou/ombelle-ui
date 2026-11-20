/** Marks the phone's More actions button, where history focus lands when Undo or Redo is not shown. */
export const phoneMoreAttribute = 'data-phone-more'

const shownElement = (element: HTMLElement) =>
  typeof element.checkVisibility === 'function' ? element.checkVisibility() : element.offsetParent !== null

/** The top bar menubar's trigger whose menu is open, such as File while one of its items is being chosen. */
export function openMenubarTrigger(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="menubar"] [aria-expanded="true"]')
}

/**
 * The menu button an action came from: the open File or Edit trigger from 1200px, the toolbar's More
 * actions below it, or the phone's sheet button below 768px. Call it while the menu is still open.
 */
export function visibleMoreActions(): HTMLElement | null {
  const trigger = openMenubarTrigger()
  if (trigger) return trigger
  const candidates = document.querySelectorAll<HTMLElement>(`[data-toolbar-overflow-trigger], [${phoneMoreAttribute}]`)
  return [...candidates].find(shownElement) ?? null
}

/**
 * Where focus returns after a dialog opened from a menu or sheet: the element itself when it is
 * still on screen, otherwise the More actions button the menu or sheet came from.
 */
export function returnTarget(element: HTMLElement | null): HTMLElement | null {
  if (element && element.isConnected && shownElement(element)) return element
  return visibleMoreActions()
}

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
