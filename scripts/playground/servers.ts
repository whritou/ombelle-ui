import net from 'node:net'
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { killOwned } from './process.js'
export type ServerRecord = { controlPort: number; token: string; url: string }
export async function assertPortFree(port: number) {
  await new Promise<void>((resolve, reject) => {
    const s = net.createServer()
    s.once('error', reject)
    s.listen(port, '127.0.0.1', () =>
      s.close((e) => (e ? reject(e) : resolve())),
    )
  })
}
export async function stopServer(s: ServerRecord) {
  const response = await fetch('http://127.0.0.1:' + s.controlPort + '/stop', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + s.token },
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok)
    throw Error('Cannot verify server ownership; refusing PID termination')
}
export async function startServer(
  project: string,
  framework: 'next' | 'vite',
  port: number,
  mode: 'dev' | 'production',
  log: string,
  stateFile: string,
) {
  await fs.access(stateFile).then(
    () => {
      throw Error('Server state already exists; inspect ' + stateFile)
    },
    (e) => {
      if (e.code !== 'ENOENT') throw e
    },
  )
  await assertPortFree(port)
  const require = createRequire(path.join(project, 'package.json'))
  const entry =
    framework === 'next'
      ? require.resolve('next/dist/bin/next')
      : path.join(
          path.dirname(require.resolve('vite/package.json')),
          'bin/vite.js',
        )
  const args =
    framework === 'next'
      ? [
          entry,
          mode === 'dev' ? 'dev' : 'start',
          '--hostname',
          '127.0.0.1',
          '--port',
          String(port),
        ]
      : [
          entry,
          ...(mode === 'production' ? ['preview'] : []),
          '--host',
          '127.0.0.1',
          '--port',
          String(port),
          '--strictPort',
        ]
  const out = await fs.open(log + '.stdout.log', 'w'),
    err = await fs.open(log + '.stderr.log', 'w')
  const child = spawn(process.execPath, args, {
    cwd: project,
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', out.fd, err.fd],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  })
  let spawnError: Error | undefined
  child.on('error', (e) => {
    spawnError = e
  })
  const token = randomUUID(),
    url = 'http://127.0.0.1:' + port
  let closing: Promise<void> | undefined
  const control = http.createServer((req, res) => {
    if (
      req.url !== '/stop' ||
      req.method !== 'POST' ||
      req.headers.authorization !== 'Bearer ' + token
    ) {
      res.writeHead(403).end()
      return
    }
    res.end('stopping')
    void close()
  })
  const close = (): Promise<void> => (closing ??= cleanup())
  const cleanup = async () => {
    await killOwned(child)
    await new Promise<void>((resolve) => {
      if (spawnError || child.exitCode !== null || child.signalCode !== null)
        resolve()
      else child.once('close', () => resolve())
    })
    control.close()
    await out.close()
    await err.close()
    await fs.rm(stateFile, { force: true })
    process.removeListener('SIGINT', onSignal)
    process.removeListener('SIGTERM', onSignal)
  }
  const onSignal = () => {
    void close()
  }
  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)
  let record: ServerRecord
  try {
    await new Promise<void>((resolve, reject) => {
      control.once('error', reject)
      control.listen(0, '127.0.0.1', resolve)
    })
    record = {
      token,
      controlPort: (control.address() as net.AddressInfo).port,
      url,
    }
    await fs.mkdir(path.dirname(stateFile), { recursive: true })
    await fs.writeFile(stateFile, JSON.stringify(record), { mode: 0o600 })
    const until = Date.now() + 90000
    for (;;) {
      if (spawnError) throw spawnError
      if (child.exitCode !== null || child.signalCode !== null)
        throw Error('Server exited; inspect ' + log)
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(1500) })
        if (r.ok) break
      } catch {}
      if (Date.now() > until)
        throw Error('Server startup timeout; inspect ' + log)
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  } catch (e) {
    await close()
    throw e
  }
  return {
    ...record,
    close,
    done: new Promise<void>((resolve) =>
      child.once('close', () => {
        void close().then(resolve)
      }),
    ),
  }
}
