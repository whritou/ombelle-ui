import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { assertPublishOrigin, readSnapshotConfig } from './config'

const env = {
  OMBELLE_SNAPSHOT_DB_PATH: join(tmpdir(), 'snapshots', 'store.sqlite'),
  OMBELLE_PUBLIC_ORIGIN: 'https://example.test',
  OMBELLE_SNAPSHOT_RATE_SECRET: 's'.repeat(32),
  OMBELLE_SNAPSHOT_CLIENT_IP_HEADER: 'X-Trusted-Client-IP',
}

it('normalizes trusted configuration without deriving values from requests', () => {
  expect(readSnapshotConfig({ ...env, OMBELLE_PUBLIC_ORIGIN: 'https://EXAMPLE.test:443/' })).toEqual({
    dbPath: env.OMBELLE_SNAPSHOT_DB_PATH, publicOrigin: 'https://example.test',
    rateSecret: 's'.repeat(32), clientIdentity: { mode: 'trusted-header', header: 'x-trusted-client-ip' },
  })
})

it.each([
  { OMBELLE_SNAPSHOT_DB_PATH: undefined },
  { OMBELLE_SNAPSHOT_DB_PATH: 'relative.sqlite' },
  { OMBELLE_SNAPSHOT_DB_PATH: 'C:relative.sqlite' },
  { OMBELLE_SNAPSHOT_DB_PATH: '\0bad' },
  { OMBELLE_PUBLIC_ORIGIN: undefined },
  { OMBELLE_PUBLIC_ORIGIN: 'http://example.test' },
  { OMBELLE_PUBLIC_ORIGIN: 'https://example.test/path' },
  { OMBELLE_SNAPSHOT_RATE_SECRET: undefined },
  { OMBELLE_SNAPSHOT_RATE_SECRET: 's'.repeat(31) },
  { OMBELLE_SNAPSHOT_CLIENT_IP_HEADER: 'bad header' },
  { OMBELLE_SNAPSHOT_CLIENT_IP_HEADER: '' },
  { OMBELLE_SNAPSHOT_CLIENT_IP_HEADER: undefined },
])('fails closed for invalid configuration %j', (overrides) => {
  expect(() => readSnapshotConfig({ ...env, ...overrides })).toThrowError(
    expect.objectContaining({ status: 503, code: 'SNAPSHOT_SERVICE_UNAVAILABLE' }),
  )
})

it('measures secret strength in UTF-8 bytes', () => {
  expect(readSnapshotConfig({ ...env, OMBELLE_SNAPSHOT_RATE_SECRET: 'é'.repeat(16) }).rateSecret).toBe('é'.repeat(16))
})

it.each(['http://localhost:3000', 'http://127.0.0.1:3000', 'https://[::1]'])('permits one development bucket only on loopback %s', (origin) => {
  expect(readSnapshotConfig({ ...env, OMBELLE_PUBLIC_ORIGIN: origin, OMBELLE_SNAPSHOT_CLIENT_IP_HEADER: undefined }).clientIdentity)
    .toEqual({ mode: 'development' })
})

it('configuration has no storage side effects on valid or invalid reads', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ombelle-config-'))
  try {
    await writeFile(join(root, 'sentinel'), 'untouched')
    const before = await readdir(root, { recursive: true })
    const configured = { ...env, OMBELLE_SNAPSHOT_DB_PATH: join(root, 'uncreated', 'store.sqlite') }
    readSnapshotConfig(configured)
    expect(() => readSnapshotConfig({ ...configured, OMBELLE_SNAPSHOT_RATE_SECRET: '' })).toThrow()
    expect(await readdir(root, { recursive: true })).toEqual(before)
  } finally { await rm(root, { recursive: true, force: true }) }
})

it('accepts only configured Origin regardless of Host and forwarding headers', () => {
  const config = readSnapshotConfig(env)
  expect(() => assertPublishOrigin(new Headers({ Origin: 'https://example.test', Host: 'evil.test', 'X-Forwarded-Host': 'evil.test' }), config)).not.toThrow()
  for (const origin of [undefined, 'null', 'https://evil.test', 'https://example.test/']) {
    const headers = new Headers({ Host: 'example.test' })
    if (origin) headers.set('Origin', origin)
    expect(() => assertPublishOrigin(headers, config)).toThrowError(expect.objectContaining({ status: 403, code: 'ORIGIN_NOT_ALLOWED' }))
  }
  expect(() => assertPublishOrigin(new Headers({ Origin: 'https://example.test', 'Sec-Fetch-Site': 'cross-site' }), config))
    .toThrowError(expect.objectContaining({ status: 403, code: 'ORIGIN_NOT_ALLOWED' }))
})

it('rejects ambiguous Fetch Metadata values instead of accepting a cross-site chain', () => {
  const config = readSnapshotConfig(env)
  for (const value of ['cross-site, same-origin', 'unexpected']) {
    expect(() => assertPublishOrigin(new Headers({
      Origin: 'https://example.test', 'Sec-Fetch-Site': value,
    }), config)).toThrowError(expect.objectContaining({ status: 403, code: 'ORIGIN_NOT_ALLOWED' }))
  }
  for (const value of ['same-origin', 'same-site', 'none']) {
    expect(() => assertPublishOrigin(new Headers({
      Origin: 'https://example.test', 'Sec-Fetch-Site': value,
    }), config)).not.toThrow()
  }
})

const postgresUrl = 'postgresql://test:test@ep-test-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require'
it('selects postgres explicitly without requiring or falling back to a SQLite path', () => {
  expect(readSnapshotConfig({ ...env, OMBELLE_SNAPSHOT_BACKEND: 'postgres', OMBELLE_SNAPSHOT_DB_PATH: undefined, DATABASE_URL: postgresUrl }))
    .toMatchObject({ backend: 'postgres', databaseUrl: postgresUrl })
  expect(() => readSnapshotConfig({ ...env, OMBELLE_SNAPSHOT_BACKEND: 'postgres', DATABASE_URL: undefined })).toThrow()
  expect(() => readSnapshotConfig({ ...env, OMBELLE_SNAPSHOT_BACKEND: 'unknown' })).toThrow()
})
it('fails closed when a preview deployment points to the production endpoint', () => {
  const preview = { ...env, OMBELLE_SNAPSHOT_BACKEND: 'postgres', DATABASE_URL: postgresUrl,
    VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_URL: 'ombelle-ui-test-team.vercel.app',
    OMBELLE_SNAPSHOT_PRODUCTION_DB_HOST: 'ep-test.eu-central-1.aws.neon.tech' }
  expect(() => readSnapshotConfig(preview)).toThrow()
  expect(() => readSnapshotConfig({ ...preview, OMBELLE_SNAPSHOT_PRODUCTION_DB_HOST: undefined })).toThrow()
  expect(readSnapshotConfig({ ...preview, DATABASE_URL: postgresUrl.replace('ep-test-pooler', 'ep-preview-pooler') }))
    .toMatchObject({ publicOrigin: 'https://ombelle-ui-test-team.vercel.app', clientIdentity: { mode: 'trusted-header', header: 'x-vercel-forwarded-for' } })
})
it('does not derive a hosted preview origin from malformed deployment environment values', () => {
  for (const VERCEL_URL of ['evil.test', 'https://evil.test', 'x.vercel.app/path', 'x.vercel.app@evil.test'])
    expect(() => readSnapshotConfig({ ...env, OMBELLE_SNAPSHOT_BACKEND: 'postgres', DATABASE_URL: postgresUrl,
      VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_URL, OMBELLE_SNAPSHOT_PRODUCTION_DB_HOST: 'ep-production.neon.tech' })).toThrow()
})
