import { fileURLToPath } from 'node:url'
import { parseArguments } from './model.js'
import { dispatch } from './commands.js'
const repo = fileURLToPath(new URL('../../', import.meta.url))
try {
  process.exitCode = await dispatch(parseArguments(process.argv.slice(2), repo))
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exitCode = 1
}
