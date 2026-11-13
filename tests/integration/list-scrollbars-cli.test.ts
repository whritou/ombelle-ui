// How a project installed before 0.7.5 gets the family list scrollbars (docs/components/scroll-area.md, "Existing lists").
// The rules changed the installed component stylesheets, which the lock records; `add` never replaces a recorded file
// whose bytes the catalog changed, and `theme add` writes only the tokens and the shared `ui-style.css`.
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

it('refreshes an unedited Command stylesheet from before 0.7.5 once it is deleted and added again', async () => {
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

  // `add` stops on the recorded file and writes nothing, even with --yes.
  const blocked = await command(['add', 'command', '--yes'])
  expect(blocked.code, blocked.output).toBe(4)
  expect(jsonRecord(blocked.data)).toMatchObject({
    warnings: expect.arrayContaining([
      expect.objectContaining({ code: 'FILE_CONFLICT', path: file, message: 'Existing source requires an explicit migration' }),
    ]),
  })
  expect(await read(file)).toBe(before075)
  // --overwrite is only for files Ombelle does not own.
  const overwrite = await command(['add', 'command', '--overwrite', file, '--yes'])
  expect(overwrite.code, overwrite.output).not.toBe(0)
  expect(await read(file)).toBe(before075)
  // `theme add` leaves component stylesheets alone.
  const themed = await command(['theme', 'add', './ui-preset.json', '--yes'])
  expect(themed.code, themed.output).toBe(0)
  expect(await read(file)).toBe(before075)

  // The route: delete the unedited stylesheet and add the component again. A missing file is planned as new.
  await fs.rm(path.join(root, file))
  const migrated = await command(['add', 'command', '--yes'])
  expect(migrated.code, migrated.output).toBe(0)
  expect(await read(file)).toBe(current)
  expect((JSON.parse(await read('ui-library.lock.json')) as ProjectLock).artifacts[file]!.sha256).toBe(sha(current))
})
