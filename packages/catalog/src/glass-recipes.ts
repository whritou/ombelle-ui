// The liquid glass material is applied as three recipes. Surface and Control slots carry the full stack on
// ::before (relief, dispersion, extra drop shadow, pointer shine) and ::after (pointer halo); Mark slots keep
// the veil and rim their own sheets paint. Fields are Marks because <input>, <textarea> and <select> render
// no pseudo-elements.
export const glassSurfaceSlots = [
  'card',
  'dialog-content',
  'popover-content',
  'dropdown-menu-content',
  'dropdown-menu-sub-content',
  'select-content',
  'tooltip-content',
  'alert',
  'table-container',
  'accordion',
] as const

export const glassControlSlots = ['button', 'badge', 'tabs-list', 'select-trigger'] as const

export const glassMarkSlots = [
  'input',
  'textarea',
  'native-select',
  'checkbox',
  'switch',
  'radio-group-item',
  'avatar',
  'progress',
  'skeleton',
] as const

/** Every surface the pointer halo can light: LiquidGlassFilter finds the hovered one with closest(). */
export const glassHaloSelector = [...glassSurfaceSlots, ...glassControlSlots]
  .map((slot) => '[data-slot="' + slot + '"]')
  .join(', ')
