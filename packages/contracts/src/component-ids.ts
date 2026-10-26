export const supportedComponentIds = [
  'button',
  'badge',
  'card',
  'checkbox',
  'dialog',
  'input',
  'label',
  'native-select',
  'switch',
  'tabs',
  'textarea',
  'tooltip',
] as const
export type ComponentId = (typeof supportedComponentIds)[number]
