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
  'textarea',
] as const
export type ComponentId = (typeof supportedComponentIds)[number]
