import type { PresetSnapshot, ResolvedPreset, SnapshotReference } from '@ombelle/contracts'

export type WithdrawalReason = 'abuse' | 'security' | 'operator-request'
export type PublishSnapshotInput = {
  preset: ResolvedPreset
  idempotencyKey: string
  clientKey: string
  now: number
}
export interface SnapshotStore {
  consumeAttempt(clientKey: string, now: number): void
  publish(input: PublishSnapshotInput): { snapshot: PresetSnapshot; replayed: boolean }
  lookup(ref: SnapshotReference): PresetSnapshot
  withdraw(ref: SnapshotReference, reason: WithdrawalReason, now: number): void
  unwithdraw(ref: SnapshotReference): void
  close(): void
}
