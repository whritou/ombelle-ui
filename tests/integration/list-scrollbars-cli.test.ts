// How a project installed before 0.7.5 gets the family list scrollbars (docs/components/scroll-area.md, "Existing lists").
// The rules changed the installed component stylesheets, which the lock records. Since 1.0, `update` and `add` refresh a
// recorded file that is unedited (PUB-01); `theme add` still writes only the tokens and the shared `ui-style.css`.
import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { getCatalog } from '@ombelle/catalog'
import type { ProjectLock } from '@ombelle/contracts'
import { createProject } from '../helpers/projects.js'
import { runBuiltCli, jsonRecord } from '../helpers/cli-runtime.js'

const roots: string[] = []
const sha = (content: string) => createHash('sha256').update(content).digest('hex')

afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true })
})

it('refreshes an unedited Command stylesheet from before 0.7.5 with update or add', async () => {
  const root = await createProject('vite')
  roots.push(root)
  const read = (file: string) => fs.readFile(path.join(root, file), 'utf8')
  const write = (file: string, content: string) => fs.writeFile(path.join(root, file), content)
  const command = (args: string[]) => runBuiltCli('node', [...args, '--cwd', root, '--json'], root)
  // Keeps the run offline: the declared dependencies are already in package.json.
  const pkg = JSON.parse(await read('package.json'))
  for (const dependency of getCatalog('0.1.0').templates.command.dependencies) pkg.dependencies[dependency.name] = dependency.version
  await write('package.json', JSON.stringify(pkg))
  expect((await command(['init', '--preset', path.resolve('packages/catalog/src/presets/ombelle.json'), '--yes'])).code).toBe(0)
  expect((await command(['add', 'command', '--yes'])).code).toBe(0)

  // The stylesheet as 0.7.4 installed it: no scrollbar block, recorded in the lock, never edited.
  const file = 'src/components/ui/command.css'
  const current = await read(file)
  expect(current).toContain('/* 0.7.5 scrollbars */')
  const before075 = current.replace(/\/\* 0\.7\.5 scrollbars \*\/[\s\S]*?\/\* end 0\.7\.5 scrollbars \*\/\n?/, '')
  expect(before075).not.toContain('scrollbar-color')
  await write(file, before075)
  const lock: ProjectLock = JSON.parse(await read('ui-library.lock.json'))
  lock.artifacts[file] = { ...lock.artifacts[file]!, sha256: sha(before075) }
  await write('ui-library.lock.json', JSON.stringify(lock))

  // --overwrite is for unmanaged or edited files; this one is neither.
  const overwrite = await command(['add', 'command', '--overwrite', file, '--yes'])
  expect(overwrite.code, overwrite.output).toBe(2)
  expect(await read(file)).toBe(before075)
  // `theme add` leaves component stylesheets alone.
  const themed = await command(['theme', 'add', './ui-preset.json', '--yes'])
  expect(themed.code, themed.output).toBe(0)
  expect(await read(file)).toBe(before075)
  // `update` plans the refresh; `add` of the installed component plans the same.
  const planned = await command(['update', '--dry-run'])
  expect(planned.code, planned.output).toBe(0)
  expect(jsonRecord(planned.data).changes).toEqual(expect.arrayContaining([expect.objectContaining({ path: file, action: 'update' })]))
  const added = await command(['add', 'command', '--yes'])
  expect(added.code, added.output).toBe(0)
  expect(await read(file)).toBe(current)
  expect((JSON.parse(await read('ui-library.lock.json')) as ProjectLock).artifacts[file]!.sha256).toBe(sha(current))
  await write(file, before075)
  const relock: ProjectLock = JSON.parse(await read('ui-library.lock.json'))
  relock.artifacts[file] = { ...relock.artifacts[file]!, sha256: sha(before075) }
  await write('ui-library.lock.json', JSON.stringify(relock))

  // The earlier route still works: delete the unedited stylesheet and add the component again.
  await fs.rm(path.join(root, file))
  const migrated = await command(['add', 'command', '--yes'])
  expect(migrated.code, migrated.output).toBe(0)
  expect(await read(file)).toBe(current)
  expect((JSON.parse(await read('ui-library.lock.json')) as ProjectLock).artifacts[file]!.sha256).toBe(sha(current))
})
