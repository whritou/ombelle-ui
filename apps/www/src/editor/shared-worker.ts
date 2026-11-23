'use client'

// One compiler worker per script per page. An editor compiles its draft, the catalog default that
// Changes and Get code compare to, and the matrix cells; each hook used to start its own copy of the
// same 5 MB worker. Hooks now share one and tell their replies apart by request id.

type Shared = { worker: Worker; users: number }
const pool = new Map<string, Shared>()
let lastRequestId = 0

/** A request id no other hook on the page uses, so each hook can ignore the replies meant for the others. */
export function nextRequestId(): number {
  return ++lastRequestId
}

/**
 * The page's worker for `url`, started on first use and terminated when the last user releases it.
 * Listen with addEventListener: other hooks listen on the same worker. A worker that fails is dropped
 * from the pool, so the next acquire (a retry) starts a fresh one.
 */
export function acquireWorker(url: string): { worker: Worker; release(): void } {
  let shared = pool.get(url)
  if (!shared) {
    const created: Shared = { worker: new Worker(url, { type: 'module' }), users: 0 }
    created.worker.addEventListener('error', () => {
      if (pool.get(url) === created) pool.delete(url)
    })
    pool.set(url, created)
    shared = created
  }
  const entry = shared
  entry.users++
  let released = false
  return {
    worker: entry.worker,
    release() {
      if (released) return
      released = true
      if (--entry.users > 0) return
      entry.worker.terminate()
      if (pool.get(url) === entry) pool.delete(url)
    },
  }
}
