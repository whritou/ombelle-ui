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
] as const
export type ComponentId = (typeof supportedComponentIds)[number]
