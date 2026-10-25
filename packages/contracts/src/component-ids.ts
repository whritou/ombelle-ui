export const supportedComponentIds = [
  'button',
  'badge',
  'card',
  'checkbox',
  'dialog',
  'input',
  'label',
  'native-select',
  'textarea',
] as const
export type ComponentId = (typeof supportedComponentIds)[number]
