// Test-only transport fixture: keep the built CLI's official origin and TLS
// options observable while forwarding to real loopback API handlers. This file
// is not part of the CLI distribution; live HTTPS is verified at deployment.
import https from 'node:https'
import http from 'node:http'
const origin = new URL(process.env.OMBELLE_TEST_SNAPSHOT_ORIGIN)
if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || origin.username || origin.password || origin.pathname !== '/')
  throw new Error('Test transport requires the owned loopback fixture')
const original = https.get
https.get = function (url, options, ...rest) {
  if (url instanceof URL && url.origin === 'https://ombelle-ui.vercel.app') {
    if (options?.rejectUnauthorized !== true) throw new Error('Official transport must request verified TLS')
    return http.get(new URL(url.pathname, origin), options, ...rest)
  }
  return original.call(this, url, options, ...rest)
}
