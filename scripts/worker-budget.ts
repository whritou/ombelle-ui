/** Read a configurable process budget before starting any work. */
export function workerBudget(name: string, value: string | undefined, fallback: number): number {
  const input = value ?? String(fallback)
  const workers = Number(input)
  if (!/^[1-9]\d*$/.test(input) || !Number.isSafeInteger(workers))
    throw new Error(`${name} must be a positive safe integer`)
  return workers
}
