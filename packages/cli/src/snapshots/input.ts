import http, { type IncomingMessage } from 'node:http'
import https from 'node:https'
import {
  FoundationError,
  normalizeSnapshotOrigin,
  parseSnapshotReference,
  type Preset,
  type PresetSnapshot,
  type SnapshotSource,
} from '@ombelle/contracts'
import { verifyPresetSnapshot } from '@ombelle/compiler'
import { readPresetFile } from '../preset-file.js'
import { readSnapshotCache } from './cache.js'

export type PresetInputOptions = {
  origin?: string
  expectedHash?: string
  offline?: boolean
  cacheRoot: string
}
export type ResolvedPresetInput = {
  preset: Preset
  snapshot?: PresetSnapshot
  source?: SnapshotSource
  resolution: 'local' | 'network' | 'cache'
  networkAccess: boolean
}
const exactReference = (value: string) =>
  value.length === 37 && /^ps_[0-9a-f]{32}@1$/.test(value)

async function fetchSnapshot(source: SnapshotSource): Promise<PresetSnapshot> {
  const { id, revision } = parseSnapshotReference(source.reference)
  const url = new URL(`/api/v1/presets/${id}/${revision}`, source.origin)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  let response: IncomingMessage | undefined
  let request: ReturnType<typeof http.get> | undefined
  try {
    const outgoing = (url.protocol === 'https:' ? https : http).get(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      // Explicit verification also protects this boundary when a caller has set
      // NODE_TLS_REJECT_UNAUTHORIZED=0 elsewhere in their environment.
      ...(url.protocol === 'https:' ? { rejectUnauthorized: true } : {}),
    })
    request = outgoing
    response = await new Promise<IncomingMessage>((resolve, reject) => {
      outgoing.once('response', resolve)
      outgoing.once('error', reject)
    })
    // Native HTTP does not follow redirects. Every non-200 status is final for
    // this invocation, including authoritative availability failures.
    if (response.statusCode !== 200)
      throw new Error(`Snapshot request failed (HTTP ${response.statusCode})`)
    if (
      !/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/i.test(
        response.headers['content-type'] ?? '',
      )
    )
      throw new Error('Snapshot response must be UTF-8 application/json')
    if (
      response.headers['content-encoding'] &&
      response.headers['content-encoding'] !== 'identity'
    )
      throw new Error('Snapshot response content encoding is unsupported')
    const chunks: Buffer[] = []
    let length = 0
    for await (const chunk of response) {
      const bytes = Buffer.from(chunk)
      length += bytes.length
      if (length > 128 * 1024)
        throw new Error('Snapshot response exceeds 128 KiB')
      chunks.push(bytes)
    }
    const input: unknown = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, length)),
    )
    try {
      return await verifyPresetSnapshot(input, source)
    } catch (error) {
      // The envelope schema pins releases. Preserve the CLI's release exit code
      // for an otherwise syntactically versioned unsupported release.
      if (
        error instanceof FoundationError &&
        /\/(catalogRelease|compilerVersion)$/.test(error.path ?? '')
      ) {
        let value: unknown = input
        for (const segment of error.path!.split('/').slice(1))
          value = value && typeof value === 'object'
            ? (value as Record<string, unknown>)[segment] : undefined
        if (
          typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value) &&
          value !== '0.1.0'
        )
          throw new FoundationError(
            'UNSUPPORTED_RELEASE', `Snapshot release ${value} is not supported`,
            error.path, 'Use a snapshot for catalog/compiler 0.1.0.',
          )
      }
      throw error
    }
  } catch (error) {
    if (error instanceof FoundationError && error.code === 'UNSUPPORTED_RELEASE')
      throw error
    throw new FoundationError(
      'RESOLUTION_FAILURE',
      controller.signal.aborted
        ? 'Snapshot resolution exceeded the ten-second deadline'
        : 'Snapshot resolution failed: ' +
          (error instanceof Error ? error.message : 'transport or integrity failure'),
      source.reference,
      'Check the snapshot origin, reference, hash and availability; retry with --offline only if a verified cached copy is available.',
    )
  } finally {
    clearTimeout(timer)
    response?.destroy()
    request?.destroy()
  }
}

export async function resolvePresetInput(
  value: string, options: PresetInputOptions,
): Promise<ResolvedPresetInput> {
  if (!exactReference(value)) {
    if (
      (/^ps_/i.test(value) && !/[\\/]/.test(value)) ||
      /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Choose an exact snapshot reference ps_<32 lowercase hexadecimal digits>@1, or prefix a local path with ./',
      )
    if (
      options.origin !== undefined || options.expectedHash !== undefined ||
      options.offline
    )
      throw new FoundationError(
        'INVALID_DATA',
        'Snapshot origin, hash and --offline flags require an explicit remote snapshot reference',
      )
    return {
      preset: await readPresetFile(value), resolution: 'local', networkAccess: false,
    }
  }
  if (
    !options.origin || !options.expectedHash || options.expectedHash.length !== 64 ||
    !/^[0-9a-f]{64}$/.test(options.expectedHash)
  )
    throw new FoundationError(
      'INVALID_DATA',
      'Remote snapshots require --snapshot-origin <origin> and --preset-hash <64 lowercase hexadecimal digits>',
    )
  const source: SnapshotSource = {
    origin: normalizeSnapshotOrigin(options.origin),
    reference: value,
    presetHash: options.expectedHash,
  }
  if (options.offline) {
    let snapshot: PresetSnapshot | null
    try {
      snapshot = await readSnapshotCache(options.cacheRoot, source)
    } catch (error) {
      throw new FoundationError(
        'RESOLUTION_FAILURE',
        'Cannot read snapshot cache: ' +
          (error instanceof Error ? error.message : 'invalid cache configuration'),
        value,
        'Set OMBELLE_SNAPSHOT_CACHE_DIR to an absolute private cache directory, or retry online without --offline.',
      )
    }
    if (!snapshot)
      throw new FoundationError(
        'RESOLUTION_FAILURE',
        'Offline snapshot cache is missing, unsafe, corrupt, or does not match the required hash',
        value,
        'Retry online without --offline to verify current availability and install the snapshot.',
      )
    return {
      preset: snapshot.preset, snapshot, source,
      resolution: 'cache', networkAccess: false,
    }
  }
  const snapshot = await fetchSnapshot(source)
  return {
    preset: snapshot.preset, snapshot, source,
    resolution: 'network', networkAccess: true,
  }
}
