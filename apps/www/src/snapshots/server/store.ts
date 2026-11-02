import type { PresetSnapshot, ResolvedPreset, SnapshotReference, RecipeSnapshot, RecipeCompileResult } from '@ombelle/contracts'

export type WithdrawalReason = 'abuse' | 'security' | 'operator-request'
export type PublishSnapshotInput = {
  preset: ResolvedPreset
  idempotencyKey: string
  clientKey: string
  now: number
}
export type Awaitable<T> = T | Promise<T>
export type PublishRecipeSnapshotInput = Omit<PublishSnapshotInput, 'preset'> & { compiled: RecipeCompileResult }
export interface SnapshotStore {
  consumeAttempt(clientKey: string, now: number): Awaitable<void>
  publish(input: PublishSnapshotInput): Awaitable<{ snapshot: PresetSnapshot; replayed: boolean }>
  lookup(ref: SnapshotReference): Awaitable<PresetSnapshot>
  publishRecipe(input: PublishRecipeSnapshotInput): Awaitable<{ snapshot: RecipeSnapshot; replayed: boolean }>
  lookupRecipe(ref: SnapshotReference): Awaitable<RecipeSnapshot>
  withdraw(ref: SnapshotReference, reason: WithdrawalReason, now: number): Awaitable<void>
  unwithdraw(ref: SnapshotReference): Awaitable<void>
  withdrawRecipe(ref: SnapshotReference, reason: WithdrawalReason, now: number): Awaitable<void>
  unwithdrawRecipe(ref: SnapshotReference): Awaitable<void>
  close(): Awaitable<void>
}
