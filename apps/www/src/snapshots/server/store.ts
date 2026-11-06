import type { PresetSnapshot, ResolvedPreset, SnapshotReference, InstallableRecipeSnapshot, InstallableRecipeCompileResult } from '@ombelle/contracts'

export type WithdrawalReason = 'abuse' | 'security' | 'operator-request'
export type PublishSnapshotInput = {
  preset: ResolvedPreset
  idempotencyKey: string
  clientKey: string
  now: number
}
export type Awaitable<T> = T | Promise<T>
export type PublishRecipeSnapshotInput = Omit<PublishSnapshotInput, 'preset'> & { compiled: InstallableRecipeCompileResult }
export interface SnapshotStore {
  consumeAttempt(clientKey: string, now: number): Awaitable<void>
  publish(input: PublishSnapshotInput): Awaitable<{ snapshot: PresetSnapshot; replayed: boolean }>
  lookup(ref: SnapshotReference): Awaitable<PresetSnapshot>
  publishRecipe(input: PublishRecipeSnapshotInput): Awaitable<{ snapshot: InstallableRecipeSnapshot; replayed: boolean }>
  lookupRecipe(ref: SnapshotReference): Awaitable<InstallableRecipeSnapshot>
  withdraw(ref: SnapshotReference, reason: WithdrawalReason, now: number): Awaitable<void>
  unwithdraw(ref: SnapshotReference): Awaitable<void>
  withdrawRecipe(ref: SnapshotReference, reason: WithdrawalReason, now: number): Awaitable<void>
  unwithdrawRecipe(ref: SnapshotReference): Awaitable<void>
  close(): Awaitable<void>
}
