export const supportedComponentIds = [
  'button',
  'badge',
  'card',
  'dialog',
  'input',
] as const
export type ComponentId = (typeof supportedComponentIds)[number]
