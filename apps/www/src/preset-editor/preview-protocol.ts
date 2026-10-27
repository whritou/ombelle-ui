import { canonicalize, compile, sha256 } from '@ombelle/compiler'
import {
  supportedComponentIds,
  isStyleFamily,
  type CompileResult,
} from '@ombelle/contracts'
import type { PresetSourceManifest } from '../../../../scripts/generate-preset-gallery'
export type PresetView = { mode: 'light' | 'dark'; viewport: 'wide' | 'narrow' }
export type PresetRender = {
  type: 'preset-render'
  requestId: number
  result: CompileResult
  view: PresetView
}
export type PresetAck = {
  type: 'preset-render-ack'
  requestId: number
  presetHash: string
  status: 'applied' | 'rejected'
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function exact(value: Record<string, unknown>, keys: string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  )
}
const positiveId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const hash = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
export function isPresetHandshake(
  input: unknown,
  type: 'ready' | 'init',
): boolean {
  return (
    record(input) &&
    exact(input, ['type', 'version']) &&
    input.version === 1 &&
    input.type === `ombelle-preset-preview-${type}`
  )
}
export function isPresetAck(input: unknown): input is PresetAck {
  return (
    record(input) &&
    exact(input, ['type', 'requestId', 'presetHash', 'status']) &&
    input.type === 'preset-render-ack' &&
    positiveId(input.requestId) &&
    hash(input.presetHash) &&
    ['applied', 'rejected'].includes(input.status as string)
  )
}
export async function verifyPresetRender(
  input: unknown,
  previousRequestId: number,
  manifest: PresetSourceManifest,
): Promise<PresetRender | null> {
  try {
    if (
      new TextEncoder().encode(JSON.stringify(input)).length > 1024 * 1024 ||
      !record(input) ||
      !exact(input, ['type', 'requestId', 'result', 'view']) ||
      input.type !== 'preset-render' ||
      !positiveId(input.requestId) ||
      input.requestId <= previousRequestId ||
      !record(input.view) ||
      !exact(input.view, ['mode', 'viewport']) ||
      !['light', 'dark'].includes(input.view.mode as string) ||
      !['wide', 'narrow'].includes(input.view.viewport as string)
    )
      return null
    const result = input.result as CompileResult
    if (
      !record(result) ||
      !record(result.preset) ||
      !record(result.preset.data) ||
      !isStyleFamily(result.preset.data.styleFamily) ||
      result.preset.data.catalogRelease !== '0.1.0' ||
      result.preset.data.compilerVersion !== '0.1.0' ||
      !Array.isArray(result.artifacts)
    )
      return null
    if (
      new Set(result.artifacts.map((a) => a.logicalPath)).size !==
      result.artifacts.length
    )
      return null
    const expected = await compile({
      preset: result.preset.data,
      componentIds: supportedComponentIds,
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    if (
      canonicalize(expected) !== canonicalize(result) ||
      manifest.catalogRelease !== '0.1.0' ||
      manifest.compilerVersion !== '0.1.0'
    )
      return null
    const sources = expected.artifacts.filter(
      (a) => a.kind === 'component' || a.kind === 'utility',
    )
    if (
      sources.length !== Object.keys(manifest.sources).length ||
      sources.some(
        (a) => manifest.sources[a.logicalPath]?.canonicalHash !== a.sha256,
      )
    )
      return null
    return input as PresetRender
  } catch {
    return null
  }
}
export async function verifyGallerySources(
  manifest: PresetSourceManifest,
  sources: Record<string, () => Promise<string>>,
): Promise<boolean> {
  try {
    return (
      Object.keys(sources).length === Object.keys(manifest.sources).length &&
      (
        await Promise.all(
          Object.entries(manifest.sources).map(
            async ([name, entry]) =>
              typeof sources[name] === 'function' &&
              (await sha256(await sources[name]())) === entry.transformedHash,
          ),
        )
      ).every(Boolean)
    )
  } catch {
    return false
  }
}
export function presetRuntimeStyles(result: CompileResult): string {
  // The shared compiler emits this fixed, non-nested Tailwind mapping block.
  // Utilities using the mapping are already built from the generated entry.
  return result.artifacts
    .filter((a) => a.kind === 'style')
    .map((a) => a.content.replace(/@theme inline\s*\{[^}]*\}/g, ''))
    .join('\n')
}
