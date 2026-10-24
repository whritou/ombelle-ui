export const supportedComponentIds = [
  'button',
  'badge',
  'dialog',
  'input',
] as const
export type ComponentId = (typeof supportedComponentIds)[number]
