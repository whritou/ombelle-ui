#!/usr/bin/env node
// Pointer package: it never runs, downloads or installs the real CLI. It prints the right package and exits 1,
// so a mistyped name can only ever show a message.
import { readFileSync } from 'node:fs'

const { name, version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const args = process.argv.slice(2)
const shown = args.length > 0 && args.every(arg => /^[\w@./:=,+-]+$/.test(arg)) ? args.join(' ') : '<command>'
process.stderr.write(`The npm package "${name}" is not the Ombelle UI installer. It only points to it.

Ombelle UI's CLI is @ombelle-ui/cli. Run:

  npx @ombelle-ui/cli@${version} ${shown}

For example: npx @ombelle-ui/cli@${version} init --preset <ps_ code>@1 --dry-run --json
Current version: npm view @ombelle-ui/cli version
Coding agents: read https://ombelle-ui.com/llms.txt or install the skills with npx skills add whritou/ombelle-ui
`)
process.exitCode = 1
