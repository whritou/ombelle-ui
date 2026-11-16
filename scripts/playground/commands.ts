import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { supportedComponentIds } from '../../packages/contracts/src/component-ids.js'
import { assertStandaloneProject } from '../../packages/cli/src/project/workspace.js'
import { managerEntry } from '../../packages/cli/src/apply/manager.js'
import { matrix, help, type Options } from './model.js'
import { createRun, renderReport, type RunRecorder } from './evidence.js'
import {
  assertRoot,
  assertOwned,
  scaffold,
  projectPath,
  baselinePath,
  cleanOwned,
} from './projects.js'
import {
  snapshot,
  recordManaged,
  restore,
  assertUnmodified,
  files,
} from './baseline.js'
import { execute } from './process.js'
import { startServer, stopServer, type ServerRecord } from './servers.js'
import { writeShowcase } from './showcase.js'
import { verifyProject } from './verify.js'
const exists = async (p: string) =>
  fs.access(p).then(
    () => true,
    (e) => {
      if (e.code === 'ENOENT') return false
      throw e
    },
  )
export async function dispatch(
  o: Options,
  adapters: { prerequisite?: () => Promise<void> } = {},
) {
  if (o.command === 'help') {
    console.log(help)
    return 0
  }
  if (o.command === 'setup') await assertStandaloneProject(o.root)
  await assertRoot(o.root)
  for (const name of ['runs', 'baselines', 'projects', 'state', '.lock'])
    await assertRoot(path.join(o.root, name))
  await fs.mkdir(o.root, { recursive: true })
  const lockPath = path.join(o.root, '.lock')
  let lock
  const readOnly = ['stop', 'status', 'report'].includes(o.command)
  if (!readOnly) {
    try {
      lock = await fs.open(lockPath, 'wx')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
      const pid = Number(await fs.readFile(lockPath, 'utf8'))
      if (!Number.isInteger(pid) || pid <= 0)
        throw Error('Invalid playground lock; inspect ' + lockPath)
      try {
        process.kill(pid, 0)
        throw Error('Another playground invocation is running: ' + pid)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
      }
      await fs.rm(lockPath)
      lock = await fs.open(lockPath, 'wx')
    }
    await lock.writeFile(String(process.pid))
  }
  let run: RunRecorder | undefined
  try {
    run = await createRun(o.root, o.command, !readOnly)
    const recorder = run
    const command = async (
      project: string,
      name: string,
      cwd: string,
      args: string[],
      ready = true,
      timeoutMs = 900000,
    ) => {
      let output = ''
      const ok = await recorder.step(
        project,
        name,
        async (i) => {
          const log = path.join(recorder.dir, 'step-' + i)
          recorder.data.steps[i]!.details = {
            executable: process.execPath,
            args,
            cwd,
            stdout: 'step-' + i + '.stdout.log',
            stderr: 'step-' + i + '.stderr.log',
            result: 'step-' + i + '.result.json',
          }
          const result = await execute({
            executable: process.execPath,
            args,
            cwd,
            timeoutMs,
            log,
          })
          output = result.output
        },
        ready,
      )
      return { ok, output }
    }
    let pnpm = ''
    const mutates = ['setup', 'install', 'add', 'theme', 'uninstall']
    let ready = true
    if (!['status', 'report', 'stop', 'clean'].includes(o.command)) {
      ready = await recorder.step(
        'all',
        'prerequisites',
        adapters.prerequisite ??
          (async () => {
            if (process.versions.node !== '24.19.0')
              throw Error('Expected Node 24.19.0, found ' + process.version)
            pnpm = await managerEntry('pnpm')
            const version = await execute({
              executable: process.execPath,
              args: [pnpm, '--version'],
              cwd: o.repo,
              timeoutMs: 15000,
              log: path.join(recorder.dir, 'pnpm-version'),
            })
            if (version.output.trim() !== '11.25.0')
              throw Error(
                'Expected pnpm 11.25.0, found ' + version.output.trim(),
              )
          }),
      )
      if (ready && mutates.includes(o.command) && o.command !== 'uninstall') {
        const result = await command('all', 'build local CLI', o.repo, [
          pnpm,
          'run',
          'build:packages',
        ])
        ready = result.ok
      }
    }
    for (const spec of matrix.filter((s) => o.projects.includes(s.id))) {
      if (recorder.data.steps.some((s) => s.status === 'interrupted'))
        ready = false
      const project = projectPath(o, spec),
        base = baselinePath(o, spec),
        state = path.join(o.root, 'state', spec.id + '.server.json')
      if (!ready) {
        await recorder.step(spec.id, o.command, async () => {}, false)
        continue
      }
      if (o.command === 'status') {
        await recorder.step(spec.id, 'status', async () => {
          const present = await exists(project)
          if (present) await assertOwned(o, spec)
          const installed =
            present &&
            (await exists(path.join(project, 'ui-library.lock.json')))
          let latest: unknown = null
          const dirs = await fs.readdir(path.join(o.root, 'runs'), {
            withFileTypes: true,
          })
          for (const item of dirs
            .filter((d) => d.isDirectory() && !d.isSymbolicLink())
            .sort((a, b) => b.name.localeCompare(a.name))) {
            const dir = path.join(o.root, 'runs', item.name)
            if (dir === recorder.dir) continue
            const prior = JSON.parse(
              await fs.readFile(path.join(dir, 'summary.json'), 'utf8'),
            )
            if (['status', 'report'].includes(prior.command)) continue
            const steps = prior.steps.filter(
              (step: { project: string }) => step.project === spec.id,
            )
            if (steps.length) {
              latest = {
                command: prior.command,
                report: path.join(dir, 'report.md'),
                steps: steps.map((step: { name: string; status: string }) => ({
                  name: step.name,
                  status: step.status,
                })),
              }
              break
            }
          }
          const data = {
            latest,
            project,
            present,
            installed,
            url: 'http://127.0.0.1:' + spec.port,
            serverRecorded: await exists(state),
          }
          console.log(JSON.stringify(data, null, 2))
          await fs.writeFile(
            path.join(recorder.dir, spec.id + '.status.json'),
            JSON.stringify(data, null, 2),
          )
        })
        continue
      }
      if (o.command === 'report') {
        await recorder.step(spec.id, 'regenerate reports', async () => {
          for (const item of await fs.readdir(path.join(o.root, 'runs'), {
            withFileTypes: true,
          }))
            if (item.isDirectory() && !item.isSymbolicLink())
              await renderReport(path.join(o.root, 'runs', item.name))
        })
        continue
      }
      let ok = true
      if (o.command === 'setup') {
        ok = await recorder.step(spec.id, 'create scaffold', async () => {
          await scaffold(o, spec)
          if (await exists(base)) {
            await assertRoot(base)
            await fs.rename(base, base + '-archived-' + randomUUID())
          }
        })
        const install = await command(
          spec.id,
          'install baseline dependencies',
          project,
          [pnpm, 'install', '--ignore-scripts', '--no-frozen-lockfile'],
          ok,
        )
        ok = install.ok
        ok = await recorder.step(
          spec.id,
          'snapshot baseline',
          () => snapshot(project, base),
          ok,
        )
      } else
        ok = await recorder.step(spec.id, 'validate ownership', () =>
          assertOwned(o, spec),
        )
      if (['stop', 'clean'].includes(o.command)) {
        ok = await recorder.step(
          spec.id,
          'stop owned server',
          async () => {
            if (await exists(state)) {
              await assertRoot(state)
              await stopServer(
                JSON.parse(await fs.readFile(state, 'utf8')) as ServerRecord,
              )
              const until = Date.now() + 10000
              while (await exists(state)) {
                if (Date.now() > until) throw Error('Server did not stop')
                await new Promise((r) => setTimeout(r, 100))
              }
            }
          },
          ok,
        )
        if (o.command === 'clean')
          await recorder.step(
            spec.id,
            'remove owned project',
            () => cleanOwned(o, spec),
            ok,
          )
        continue
      }
      if (['setup', 'install', 'add', 'theme'].includes(o.command)) {
        ok = await recorder.step(
          spec.id,
          'check managed files',
          () => assertUnmodified(project, base),
          ok,
        )
        const before = ok ? await files(project) : {}
        let args: string[] = []
        const hasLock =
          ok && (await exists(path.join(project, 'ui-library.lock.json')))
        if (['setup', 'install'].includes(o.command)) {
          args =
            spec.shadcn || hasLock
              ? ['theme', 'add', o.preset]
              : ['init', '--preset', o.preset]
        } else if (o.command === 'theme') args = ['theme', 'add', o.preset]
        const cli = path.join(o.repo, 'packages/cli/dist/main.js')
        const apply = async (
          name: string,
          operation: string[],
          enabled: boolean,
        ) => {
          const plan = await command(
            spec.id,
            name + ' plan',
            project,
            [cli, ...operation, '--dry-run', '--json'],
            enabled,
          )
          return (
            await command(
              spec.id,
              name + ' apply',
              project,
              [cli, ...operation, '--yes', '--json'],
              plan.ok,
            )
          ).ok
        }
        try {
          if (args.length) ok = await apply('preset', args, ok)
          if (o.command !== 'theme') {
            const ids =
              o.command === 'add' ? o.components : [...supportedComponentIds]
            const button =
              spec.framework === 'next'
                ? 'components/ui/button.tsx'
                : 'src/components/ui/button.tsx'
            // Only resolve the original unowned Button on its first addition.
            const lock = hasLock
              ? JSON.parse(
                  await fs.readFile(
                    path.join(project, 'ui-library.lock.json'),
                    'utf8',
                  ),
                )
              : undefined
            const beside =
              spec.shadcn &&
              ids.includes('button') &&
              !Object.keys(lock?.artifacts ?? {}).some((p) =>
                p.replaceAll('\\', '/').includes('/ombelle/button.'),
              )
            ok = await apply(
              'components',
              ['add', ...ids, ...(beside ? ['--beside', button] : [])],
              ok,
            )
            ok = await recorder.step(
              spec.id,
              'generate showcase',
              () => writeShowcase(project, spec, supportedComponentIds),
              ok,
            )
          }
        } finally {
          if (Object.keys(before).length)
            await recorder.step(spec.id, 'record managed changes', () =>
              recordManaged(project, base, before),
            )
        }
        if (ok)
          await recorder.step(
            spec.id,
            'record installed identity',
            async () => {
              await fs.copyFile(
                path.join(project, 'ui-library.lock.json'),
                path.join(recorder.dir, spec.id + '.installation.json'),
              )
              await fs.copyFile(
                path.join(project, 'package.json'),
                path.join(recorder.dir, spec.id + '.package.json'),
              )
            },
          )
      }
      if (o.command === 'uninstall') {
        ok = await recorder.step(
          spec.id,
          'restore baseline',
          () => restore(project, base),
          ok,
        )
        await command(
          spec.id,
          'reconcile baseline dependencies',
          project,
          [pnpm, 'install', '--ignore-scripts', '--frozen-lockfile'],
          ok,
        )
        continue
      }
      if (
        ['setup', 'install', 'add', 'theme', 'build', 'verify'].includes(
          o.command,
        )
      ) {
        const previous = ok ? await files(project) : undefined
        const result = await command(
          spec.id,
          'production build',
          project,
          [pnpm, 'run', 'build'],
          ok,
          600000,
        )
        ok = result.ok
        if (previous && (await exists(path.join(base, 'manifest.json'))))
          await recorder.step(spec.id, 'record build-generated changes', () =>
            recordManaged(project, base, previous),
          )
      }
      if (o.command === 'verify')
        await recorder.step(
          spec.id,
          'browser verification',
          () => verifyProject(o, spec, recorder),
          ok,
        )
      if (o.command === 'dev')
        await recorder.step(
          spec.id,
          'development server',
          async (i) => {
            const server = await startServer(
              project,
              spec.framework,
              spec.port,
              'dev',
              path.join(recorder.dir, 'step-' + i),
              state,
            )
            console.log(spec.id + ': ' + server.url)
            await server.done
          },
          ok,
        )
    }
    await run.finish()
    return run.data.steps.some(
      (s) => s.status === 'failed' || s.status === 'interrupted',
    )
      ? 1
      : 0
  } finally {
    if (lock) {
      await lock.close()
      await fs.rm(lockPath, { force: true })
    }
  }
}
