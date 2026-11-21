import http, { type IncomingMessage } from 'node:http'
import https from 'node:https'
import { FoundationError, isSupportedContractRelease, supportedContractReleases } from '@ombelle/contracts'

export async function fetchPublication<T>(url: URL, reference: string, verify: (input: unknown) => Promise<T>): Promise<T> {
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
    if (response.statusCode !== 200) {
      const retry = Number(response.headers['retry-after'])
      throw new Error(
        response.statusCode === 404 ? 'No snapshot exists for this code (HTTP 404)'
          : response.statusCode === 410 ? 'This code was withdrawn by the service and can no longer be installed (HTTP 410)'
          : response.statusCode === 429 ? 'The snapshot service is rate limiting requests (HTTP 429)' +
            (Number.isFinite(retry) && retry >= 0 ? `; retry in ${Math.ceil(retry)} s` : '')
          : `Snapshot request failed (HTTP ${response.statusCode})`)
    }
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
      return await verify(input)
    } catch (error) {
      if (error instanceof FoundationError && /\/schemaVersion$/.test(error.path ?? '')) {
        let version: unknown = input
        for (const segment of error.path!.split('/').slice(1))
          version = version && typeof version === 'object' ? (version as Record<string, unknown>)[segment] : undefined
        const supported = error.path!.startsWith('/recipe/') ? ['1.0', '2.0'] : ['1.0', '1.1']
        if (typeof version === 'string' && /^\d+\.\d+$/.test(version) && !supported.includes(version))
          throw new FoundationError('UNSUPPORTED_RELEASE', `Snapshot schema ${version} is not supported`,
            error.path, 'Upgrade the CLI to a release that supports this snapshot schema.')
      }
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
          !isSupportedContractRelease(value)
        )
          throw new FoundationError(
            'UNSUPPORTED_RELEASE', `Snapshot release ${value} is not supported`,
            error.path, 'Use a snapshot for catalog/compiler ' + supportedContractReleases.join(', ') + '.',
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
      reference,
      'Check the snapshot origin, reference, hash and availability; retry with --offline only if a verified cached copy is available.',
    )
  } finally {
    clearTimeout(timer)
    response?.destroy()
    request?.destroy()
  }
}
