import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
async function atomicJson(file: string, value: unknown) {
  const temporary = file + '.next'
  await fs.writeFile(temporary, JSON.stringify(value, null, 2))
  await fs.rename(temporary, file)
}
export type Step = {
  project: string
  name: string
  status: 'running' | 'passed' | 'failed' | 'skipped' | 'interrupted'
  start: string
  end?: string
  durationMs?: number
  error?: string
  details?: unknown
}
export type RunRecorder = Awaited<ReturnType<typeof createRun>>
export async function renderReport(dir: string) {
  const data = JSON.parse(
    await fs.readFile(path.join(dir, 'summary.json'), 'utf8'),
  ) as { command: string; started: string; steps: Step[] }
  const escape = (v: string) =>
    v
      .replace(
        /[|<>]/g,
        (c) => ({ '|': '&#124;', '<': '&lt;', '>': '&gt;' })[c]!,
      )
      .replace(/[\r\n]+/g, ' ')
  const lines = [
    '# Playground run',
    '',
    'Command: ' + escape(data.command),
    'Started: ' + data.started,
    '',
    '| Project | Step | Status | Duration | Error |',
    '| --- | --- | --- | --- | --- |',
    ...data.steps.map(
      (s, i) =>
        '| ' +
        [
          s.project,
          '[' + escape(s.name) + '](step-' + i + '.json)',
          s.status,
          String(s.durationMs ?? 0) + ' ms',
          escape(s.error ?? ''),
        ].join(' | ') +
        ' |',
    ),
    '',
    'Full events: [events.jsonl](events.jsonl). Process logs use the step index.',
    '',
  ]
  const artifacts = (await fs.readdir(dir)).filter(
    (f) =>
      /\.(?:png|log)$/.test(f) ||
      f.endsWith('.installation.json') ||
      f.endsWith('.package.json') ||
      f.endsWith('-browser.json'),
  )
  lines.push(
    '## Artifacts',
    '',
    ...artifacts
      .sort()
      .map((f) => '- [' + escape(f) + '](' + encodeURIComponent(f) + ')'),
    '',
  )
  await fs.writeFile(path.join(dir, 'report.md'), lines.join('\n'))
}
export async function createRun(root: string, command: string, recover = true) {
  const runs = path.join(root, 'runs')
  await fs.mkdir(runs, { recursive: true })
  // An unfinalized prior invocation is evidence of interrupted work.
  for (const item of recover
    ? await fs.readdir(runs, { withFileTypes: true })
    : []) {
    if (!item.isDirectory() || item.isSymbolicLink()) continue
    const file = path.join(runs, item.name, 'summary.json')
    try {
      const old = JSON.parse(await fs.readFile(file, 'utf8'))
      if (!old.finished) {
        for (const s of old.steps)
          if (s.status === 'running') {
            s.status = 'interrupted'
            s.error = 'Invocation ended before completion'
          }
        old.finished = new Date().toISOString()
        await atomicJson(file, old)
        await renderReport(path.dirname(file))
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
  }
  const dir = path.join(
    runs,
    new Date().toISOString().replace(/[:.]/g, '-') +
      '-' +
      randomUUID().slice(0, 8),
  )
  await fs.mkdir(dir)
  const data = {
    command,
    started: new Date().toISOString(),
    finished: undefined as string | undefined,
    environment: { node: process.version, platform: process.platform },
    steps: [] as Step[],
  }
  const save = async () => {
    await atomicJson(path.join(dir, 'summary.json'), data)
    await renderReport(dir)
  }
  const record = async (step: Step, index: number) => {
    await fs.appendFile(
      path.join(dir, 'events.jsonl'),
      JSON.stringify({ ...step, index }) + '\n',
    )
    await fs.writeFile(
      path.join(dir, 'step-' + index + '.json'),
      JSON.stringify(step, null, 2),
    )
    await save()
  }
  await save()
  return {
    dir,
    data,
    async step(
      project: string,
      name: string,
      action: (index: number) => Promise<void>,
      prerequisite = true,
    ) {
      const start = Date.now(),
        index = data.steps.length
      const step: Step = {
        project,
        name,
        start: new Date().toISOString(),
        status: prerequisite ? 'running' : 'skipped',
      }
      data.steps.push(step)
      await record(step, index)
      if (!prerequisite) {
        step.error = 'Prerequisite failed'
        await record(step, index)
        return false
      }
      console.log('[' + project + '] ' + name)
      try {
        await action(index)
        step.status = 'passed'
      } catch (e) {
        step.status =
          e instanceof Error && e.message.includes('Command interrupted')
            ? 'interrupted'
            : 'failed'
        step.error = e instanceof Error ? e.message : String(e)
        console.error('[' + project + '] FAILED ' + name + ': ' + step.error)
      }
      step.end = new Date().toISOString()
      step.durationMs = Date.now() - start
      await record(step, index)
      return step.status === 'passed'
    },
    async finish() {
      data.finished = new Date().toISOString()
      await save()
      console.log('Report: ' + path.join(dir, 'report.md'))
    },
  }
}
