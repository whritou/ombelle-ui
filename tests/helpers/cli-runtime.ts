import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  resolveBunExecutable,
  resolveNodeExecutable,
  safeRuntimeEnv,
} from '../../packages/cli/src/apply/executable.js'
import { runNative } from './bun-command.js'
export type RuntimeIdentity = {
  executable: string
  name: 'node' | 'bun'
  version: string
}
export function jsonRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a JSON object')
  return value as Record<string, unknown>
}
async function probeRuntime(runtime: 'node' | 'bun'): Promise<RuntimeIdentity> {
  const executable = await (runtime === 'bun'
    ? resolveBunExecutable()
    : resolveNodeExecutable())
  const result = await runNative(
    executable,
    [
      '--eval',
      "process.stdout.write(JSON.stringify({name:process.versions.bun?'bun':'node',version:process.versions.bun??process.versions.node}))",
    ],
    os.tmpdir(),
  )
  const identity = jsonRecord(JSON.parse(result.output))
  if (
    result.code !== 0 ||
    identity.name !== runtime ||
    typeof identity.version !== 'string'
  )
    throw new Error('Wrong actual CLI runtime: ' + result.output)
  return { executable, name: runtime, version: identity.version }
}

/** Test-process cache only. Production native/version validation remains unchanged. */
export function createRuntimeIdentityCache(
  probe: (runtime: 'node' | 'bun') => Promise<RuntimeIdentity>,
) {
  const cache = new Map<string, Promise<RuntimeIdentity>>()
  return async (
    runtime: 'node' | 'bun',
    environment: NodeJS.ProcessEnv = process.env,
  ): Promise<RuntimeIdentity> => {
    const env = safeRuntimeEnv(environment)
    const explicit = env['OMBELLE_' + runtime.toUpperCase() + '_EXECUTABLE']
    const candidates = explicit
      ? [explicit]
      : [
          ...(!!process.versions.bun === (runtime === 'bun')
            ? [process.execPath]
            : []),
          ...(env.PATH ?? env.Path ?? '')
            .split(path.delimiter)
            .filter(Boolean)
            .map((directory) =>
              path.resolve(
                directory,
                runtime + (process.platform === 'win32' ? '.exe' : ''),
              ),
            ),
        ]
    // Replacing/deleting a binary or changing PATH precedence must invalidate probes.
    const files = await Promise.all(
      [...new Set(candidates)].map(async (file) => {
        try {
          const stat = await fs.stat(file, { bigint: true })
          return [
            file,
            ...[
              stat.dev,
              stat.ino,
              stat.mode,
              stat.size,
              stat.mtimeNs,
              stat.ctimeNs,
            ].map(String),
          ]
        } catch (error) {
          return [file, (error as NodeJS.ErrnoException).code]
        }
      }),
    )
    const key = JSON.stringify([
      runtime,
      process.execPath,
      process.cwd(),
      Object.entries(env).sort(([a], [b]) => a.localeCompare(b)),
      files,
    ])
    let pending = cache.get(key)
    if (!pending) {
      pending = probe(runtime).then((identity) => ({ ...identity }))
      cache.set(key, pending)
      pending.catch(() => {
        if (cache.get(key) === pending) cache.delete(key)
      })
    }
    return { ...(await pending) }
  }
}
export const runtimeIdentity = createRuntimeIdentityCache(probeRuntime)

export async function runBuiltCli(
  runtime: 'node' | 'bun',
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = {},
) {
  const identity = await runtimeIdentity(runtime)
  const result = await runNative(
    identity.executable,
    [path.resolve('packages/cli/dist/main.js'), ...args],
    cwd,
    env,
  )
  let data: unknown
  try {
    data = JSON.parse(result.output)
  } catch {
    throw new Error('Built CLI did not return JSON: ' + result.output)
  }
  return { ...result, data, runtime: identity }
}
