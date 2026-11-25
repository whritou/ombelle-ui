import type { ComponentId } from './component-ids.js'

export const supportedBlockIds = ['login-01', 'settings-01', 'pricing-01', 'dashboard-01'] as const
export type BlockId = (typeof supportedBlockIds)[number]
export type CatalogId = ComponentId | BlockId

export function isBlockId(id: string): id is BlockId {
  return (supportedBlockIds as readonly string[]).includes(id)
}
