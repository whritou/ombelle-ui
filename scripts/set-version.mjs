// Aligns every current-version site with one release version.
//   node scripts/set-version.mjs <x.y.z> [--date YYYY-MM-DD]   workspace release
//   node scripts/set-version.mjs --published <x.y.z>           after npm publication
//   node scripts/set-version.mjs --check                       verify alignment
// Add --root <dir> to operate on another checkout. Each site is an explicit
// { file, pattern } entry whose named group `v` is the version. A pattern that
// does not match exactly once is an error; nothing is written in that case.
import fs from 'node:fs'
import path from 'node:path'

const semver = /^\d+\.\d+\.\d+$/
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const packageFiles = ['packages/contracts', 'packages/catalog', 'packages/compiler', 'packages/cli', 'apps/www', 'apps/preview']
  .map(directory => directory + '/package.json')
const packageSites = packageFiles.map(file => ({ file, pattern: /"version"\s*:\s*"(?<v>[^"]+)"/g }))

// Sentences describing the current workspace release. Dated publication notes
// in docs/cli-release.md and everything under docs/evidence/ are left alone.
const workspaceSites = [
  ...packageSites,
  { file: 'README.md', pattern: /The six workspace packages are version \*\*(?<v>\d+\.\d+\.\d+)\*\*/g },
  { file: 'docs/cli-release.md', pattern: /ombelle-ui-cli-(?<v>\d+\.\d+\.\d+)\.tgz/g },
  { file: 'docs/cli-release.md', pattern: /All six workspace packages use software version (?<v>\d+\.\d+\.\d+)/g },
  { file: 'docs/04-presets-and-contracts.md', pattern: /Workspace packages and the published installer are version (?<v>\d+\.\d+\.\d+)/g },
]

// The version the website tells people to install, and the docs that quote it.
const publishedSites = [
  { file: 'apps/www/src/snapshots/install-command.ts', pattern: /publishedInstaller = \{ packageName: publicCliPackageName, version: '(?<v>\d+\.\d+\.\d+)' \}/g },
  { file: 'README.md', pattern: /is published as `@ombelle-ui\/cli@(?<v>\d+\.\d+\.\d+)`/g },
  { file: 'README.md', pattern: /run it with `npx @ombelle-ui\/cli@(?<v>\d+\.\d+\.\d+)`/g },
  { file: 'docs/foundation-local-usage.md', pattern: /runs the same commands as `npx @ombelle-ui\/cli@(?<v>\d+\.\d+\.\d+)/g },
  { file: 'docs/foundation-local-usage.md', pattern: /The page shows the published `npx @ombelle-ui\/cli@(?<v>\d+\.\d+\.\d+)`/g },
  { file: 'docs/snapshot-service-operations.md', pattern: /`npx @ombelle-ui\/cli@(?<v>\d+\.\d+\.\d+)` resolves bare codes/g },
  { file: 'docs/07-delivery-plan.md', pattern: /installer is published as `@ombelle-ui\/cli@(?<v>\d+\.\d+\.\d+)`/g },
]

function fail(message) {
  console.error('set-version: ' + message)
  process.exit(1)
}

function parseArguments(argv) {
  const options = { root: process.cwd(), date: undefined, check: false, published: false, version: undefined }
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === '--check') options.check = true
    else if (argument === '--published') options.published = true
    else if (argument === '--root' || argument === '--date') {
      const value = argv[++index]
      if (value === undefined) fail(argument + ' needs a value')
      options[argument.slice(2)] = value
    } else if (argument.startsWith('--')) fail('unknown option ' + argument)
    else if (options.version === undefined) options.version = argument
    else fail('unexpected argument ' + argument)
  }
  options.root = path.resolve(options.root)
  return options
}

function readSite(root, file) {
  const target = path.join(root, file)
  if (!fs.existsSync(target)) fail(file + ' does not exist')
  return fs.readFileSync(target, 'utf8')
}

function findOnly(text, site) {
  const matches = [...text.matchAll(site.pattern)]
  if (matches.length !== 1) fail(site.file + ': pattern ' + site.pattern + ' matched ' + matches.length + ' times, expected exactly once')
  return { value: matches[0].groups?.v, match: matches[0] }
}

// Replace only the captured version inside the single match.
function replaceVersion(text, site, version) {
  const found = findOnly(text, site)
  const matched = found.match[0]
  const offset = matched.lastIndexOf(found.value)
  const start = found.match.index + offset
  return text.slice(0, start) + version + text.slice(start + found.value.length)
}

// Apply every edit in memory first so a failing pattern leaves the tree untouched.
function applyEdits(root, edits) {
  const pending = new Map()
  for (const edit of edits) {
    const current = pending.has(edit.file) ? pending.get(edit.file) : readSite(root, edit.file)
    pending.set(edit.file, edit.apply(current))
  }
  for (const [file, text] of pending) fs.writeFileSync(path.join(root, file), text)
  return [...pending.keys()]
}

function formatDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) fail('--date must be YYYY-MM-DD')
  const month = Number(match[2])
  if (month < 1 || month > 12) fail('--date has an invalid month')
  return Number(match[3]) + ' ' + months[month - 1] + ' ' + match[1]
}

function check(root) {
  const reference = findOnly(readSite(root, 'packages/cli/package.json'), packageSites[3]).value
  const stale = []
  for (const site of workspaceSites) {
    const { value } = findOnly(readSite(root, site.file), site)
    if (value !== reference) stale.push(site.file + ' has ' + value + ', expected ' + reference)
  }
  if (stale.length > 0) {
    console.error('set-version: version sites disagree with packages/cli/package.json:')
    for (const line of stale) console.error('  ' + line)
    process.exit(1)
  }
  console.log('All ' + workspaceSites.length + ' version sites match ' + reference)
}

const options = parseArguments(process.argv.slice(2))
if (options.check) {
  if (options.version || options.published) fail('--check takes no version')
  check(options.root)
} else {
  if (!options.version || !semver.test(options.version)) fail('expected a version such as 0.4.0')
  const version = options.version
  const siteEdit = site => ({ file: site.file, apply: text => replaceVersion(text, site, version) })
  let edits
  if (options.published) {
    edits = publishedSites.map(siteEdit)
  } else {
    const date = formatDate(options.date ?? new Date().toISOString().slice(0, 10))
    const heading = { file: 'CHANGELOG.md', pattern: /^## Unreleased[ \t]*$/gm }
    edits = [
      ...workspaceSites.map(siteEdit),
      {
        file: heading.file,
        apply: text => {
          findOnly(text, heading)
          const eol = text.includes('\r\n') ? '\r\n' : '\n'
          return text.replace(/^## Unreleased[ \t]*$/m, '## Unreleased' + eol + eol + '## ' + version + ' — ' + date)
        },
      },
    ]
  }
  const written = applyEdits(options.root, edits)
  console.log('Updated ' + written.join(', '))
}
