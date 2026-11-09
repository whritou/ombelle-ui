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
  'sheet-content',
  'alert-dialog-content',
  'toast',
] as const

export const glassControlSlots = ['button', 'badge', 'tabs-list', 'select-trigger', 'breadcrumb-list', 'pagination-content'] as const

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
  'input-group',
] as const

/** Surfaces that scroll or clip carry the material on their own box-shadow and have no halo. */
export const glassHostedSlots = [
  'dialog-content',
  'popover-content',
  'dropdown-menu-content',
  'dropdown-menu-sub-content',
  'select-content',
  'table-container',
  'accordion',
  'sheet-content',
  'alert-dialog-content',
  'toast',
  'breadcrumb-list',
  'pagination-content',
] as const

/** Every surface the pointer halo can light: LiquidGlassFilter finds the hovered one with closest(). Recipe and
 * scoped Buttons carry the same material under their own slot names. */
export const glassHaloSelector = [
  ...glassSurfaceSlots.filter((slot) => !(glassHostedSlots as readonly string[]).includes(slot)),
  ...glassControlSlots.filter((slot) => !(glassHostedSlots as readonly string[]).includes(slot)),
  'recipe-button',
  'scoped-button',
]
  .map((slot) => '[data-slot="' + slot + '"]')
  .join(', ')
