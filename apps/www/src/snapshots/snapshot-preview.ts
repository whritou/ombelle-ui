'use client'
import { useEffect, useState } from 'react'
import type { CompileResult, Preset } from '@ombelle/contracts'
import { acquireWorker, nextRequestId } from '../editor/shared-worker'
import type { PresetCompileResponse, SnapshotCompileRequest } from '../preset-editor/compile-protocol'

/**
 * How a published preset page's gallery gets the snapshot, decided on the server (prepareSnapshotFrame):
 * a stable family goes as tokens, which the sandboxed gallery resolves and verifies itself; liquid glass is
 * compiled in the preset worker, off the main thread. `failed` means the preset did not match its hash.
 */
export type SnapshotFrame = { kind: 'tokens' } | { kind: 'worker' } | { kind: 'failed' }

export type FrameStatus = 'connecting' | 'ready' | 'failed'

/** The worker's compile of a glass snapshot: null while it runs, 'failed' if it failed or did not match the hash. */
export function useSnapshotCompile(preset: Preset | null, presetHash: string): CompileResult | 'failed' | null {
  const [result, setResult] = useState<CompileResult | 'failed' | null>(null)
  useEffect(() => {
    if (!preset) return
    const { worker, release } = acquireWorker('/preset-compiler.worker.js')
    const requestId = nextRequestId()
    const onMessage = ({ data }: MessageEvent<PresetCompileResponse>) => {
      if (data?.requestId !== requestId) return
      setResult(data.type === 'preset-compiled' && data.result?.preset?.hash === presetHash ? data.result : 'failed')
    }
    const onError = () => setResult('failed')
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    const request: SnapshotCompileRequest = { type: 'compile-snapshot', requestId, preset }
    worker.postMessage(request)
    return () => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      release()
    }
  }, [preset, presetHash])
  return result
}

/** The status line under the preview controls; a null frame or result means the preview is still being prepared. */
export function snapshotPreviewMessage(frame: SnapshotFrame | null, status: FrameStatus, compiled: CompileResult | 'failed' | null = null): string {
  if (!frame || (frame.kind === 'worker' && compiled === null)) return 'Compiling snapshot preview…'
  if (frame.kind === 'failed' || compiled === 'failed') return 'Preview compilation unavailable. Preset JSON remains available.'
  return {
    connecting: 'Connecting snapshot gallery…',
    ready: 'Snapshot gallery ready.',
    failed: 'Gallery unavailable. Preset JSON remains available.',
  }[status]
}
