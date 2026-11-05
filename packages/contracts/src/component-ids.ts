export const supportedComponentIds = [
  'alert',
  'button',
  'badge',
  'card',
  'checkbox',
  'dialog',
  'dropdown-menu',
  'input',
  'label',
  'native-select',
  'radio-group',
  'select',
  'switch',
  'tabs',
  'textarea',
  'tooltip',
] as const
export type ComponentId = (typeof supportedComponentIds)[number]
