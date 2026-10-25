import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

// Replace reports atomically so interruption never leaves a partially written JSON file.
export function persistFoundationReport(reportPath, report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  const temporary = reportPath + '.tmp'
  fs.writeFileSync(temporary, JSON.stringify(report, null, 2) + '\n')
  fs.renameSync(temporary, reportPath)
}

function cancellationCode(reason) {
  return reason === 'SIGINT' ? 130 : 143
}

async function terminateTree(child, closed, graceMs) {
  if (!child.pid) return
  if (process.platform === 'win32') {
    // Node cannot deliver catchable POSIX signals on Windows. taskkill /T waits
    // for the supported Windows tree termination operation before we return.
    await new Promise((resolve, reject) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore', windowsHide: true,
      })
      killer.once('error', reject)
      killer.once('close', (code) => {
        if (code === 0 || code === 128 || child.exitCode !== null) resolve()
        else reject(new Error(`taskkill failed with exit code ${code}`))
      })
    })
  } else {
    const killGroup = (signal) => {
      try { process.kill(-child.pid, signal) }
      catch (error) { if (error.code !== 'ESRCH') throw error }
    }
    killGroup('SIGTERM')
    let timer
    await Promise.race([
      closed,
      new Promise((resolve) => { timer = setTimeout(resolve, graceMs) }),
    ])
    clearTimeout(timer)
    // The parent can exit before a descendant. Finish the entire process group.
    killGroup('SIGKILL')
  }
  await closed
}

/** Run ordered command stages. On success the report stays running until the
 * caller validates its evidence and finalizes it with persistFoundationReport.
 * AbortSignal also supports cancellation on Windows, where process.kill cannot
 * deliver catchable termination signals. Each command owns a process tree.
 */
export async function runFoundationStages({
  stages, reportPath, logsDirectory, metadata = {}, signal,
  tailBytes = 16 * 1024, terminationGraceMs = 2000,
}) {
  const report = { ...metadata, startedAt: new Date().toISOString(), status: 'running', steps: [] }
  const started = performance.now()
  const persist = () => persistFoundationReport(reportPath, report)
  const finish = (status, exitCode) => {
    Object.assign(report, {
      status, exitCode, completedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - started),
    })
    persist()
    return { report, exitCode }
  }
  fs.mkdirSync(logsDirectory, { recursive: true })
  persist()
  for (const stage of stages) {
    if (signal?.aborted) return finish('canceled', cancellationCode(signal.reason))
    const log = path.join(logsDirectory, stage.name.replaceAll(':', '-') + '.log')
    const step = { name: stage.name, status: 'running', startedAt: new Date().toISOString(), log }
    report.steps.push(step)
    const stageStarted = performance.now()
    persist()
    console.log('Checking ' + stage.name)
    const fd = fs.openSync(log, 'w')
    let tail = Buffer.alloc(0)
    const record = (chunk, destination) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      fs.writeSync(fd, bytes)
      destination.write(bytes)
      tail = Buffer.concat([tail, bytes]).subarray(-tailBytes)
    }
    let exitCode = 1
    let termination
    let cancellationError
    let canceled = false
    try {
      const child = spawn(stage.command, stage.args ?? [], {
        cwd: stage.cwd ?? process.cwd(), env: stage.env ?? process.env,
        shell: false, windowsHide: true, detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      for (const [stream, destination] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
        stream.on('data', (chunk) => {
          record(chunk, destination)
          if (destination.writableNeedDrain) {
            stream.pause()
            destination.once('drain', () => stream.resume())
          }
        })
      }
      child.once('error', (error) => record('\n' + error.message + '\n', process.stderr))
      const closed = new Promise((resolve) => child.once('close', (code, childSignal) => {
        resolve({ code, signal: childSignal })
      }))
      const abort = () => {
        if (termination) return
        canceled = true
        termination = terminateTree(child, closed, terminationGraceMs).catch((error) => {
          cancellationError = error
          record('\n' + error.message + '\n', process.stderr)
          child.kill('SIGKILL')
        })
      }
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) abort()
      const result = await closed
      await termination
      signal?.removeEventListener('abort', abort)
      exitCode = canceled
        ? cancellationCode(signal.reason)
        : result.code !== null && result.code >= 0 ? result.code : 1
      if (result.signal) step.signal = result.signal
      if (cancellationError) step.error = String(cancellationError)
    } finally {
      fs.closeSync(fd)
    }
    Object.assign(step, {
      status: canceled ? 'canceled' : exitCode === 0 ? 'passed' : 'failed',
      completedAt: new Date().toISOString(), durationMs: Math.round(performance.now() - stageStarted),
      exitCode, tail: tail.toString('utf8'),
    })
    persist()
    console.log(`${stage.name}: ${step.status.toUpperCase()} (${step.durationMs}ms)`)
    if (exitCode !== 0) return finish(canceled ? 'canceled' : 'failed', exitCode)
  }
  return { report, exitCode: 0 }
}
