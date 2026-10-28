import fs, { type FileHandle } from 'node:fs/promises'
import { constants, type Stats } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createHash, randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { canonicalize, verifyPresetSnapshot } from '@ombelle/compiler'
import {
  validateSnapshotSource,
  type PresetSnapshot,
  type SnapshotSource,
} from '@ombelle/contracts'

export type SnapshotCacheKey = SnapshotSource
const maxBytes = 128 * 1024
const maxEntries = 100
const maxTotalBytes = 16 * 1024 * 1024
const run = promisify(execFile)
const windowsOwnership = new Map<string, Promise<void>>()
const missing = (error: unknown) =>
  (error as NodeJS.ErrnoException).code === 'ENOENT'
const unsafe = () =>
  new Error('Snapshot cache requires a private owned directory without substituted paths')
const identical = (a: Stats, b: Stats) => a.dev === b.dev && a.ino === b.ino

type DirectoryPolicy =
  | { platform: 'posix'; uid: number; currentUid: number; mode: number; root: boolean }
  | { platform: 'win32'; owner: string; currentUser: string; root: boolean; withinUserProfile: boolean; rules: { sid: string; rights: number; allow: boolean; inheritOnly: boolean }[] }

const trustedWindowsSystemOwners = [
  'S-1-5-18', // SYSTEM
  'S-1-5-32-544', // Administrators
  'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464', // TrustedInstaller
]
const windowsRights = {
  writeData: 0x2,
  appendData: 0x4,
  writeExtendedAttributes: 0x10,
  deleteChild: 0x40,
  writeAttributes: 0x100,
  delete: 0x10000,
  changePermissions: 0x40000,
  takeOwnership: 0x80000,
}
const windowsAncestorControl = windowsRights.deleteChild | windowsRights.delete |
  windowsRights.changePermissions | windowsRights.takeOwnership
const windowsRootControl = windowsAncestorControl | windowsRights.writeData |
  windowsRights.appendData | windowsRights.writeExtendedAttributes | windowsRights.writeAttributes

// Pure policy is shared by live filesystem inspection and cross-platform
// regressions; fixtures can exercise foreign ownership without privileged chown.
export function assertCacheDirectoryPolicy(policy: DirectoryPolicy): void {
  if (policy.platform === 'posix') {
    if (policy.uid !== policy.currentUid && policy.uid !== 0) throw unsafe()
    if ((policy.mode & 0o022) !== 0 && (policy.mode & 0o1000) === 0) throw unsafe()
    if (policy.root && (policy.uid !== policy.currentUid || (policy.mode & 0o077) !== 0)) throw unsafe()
    return
  }
  if (policy.owner !== policy.currentUser && !trustedWindowsSystemOwners.includes(policy.owner)) throw unsafe()
  if (policy.root && policy.owner !== policy.currentUser) throw unsafe()
  const allowed = [policy.currentUser, ...trustedWindowsSystemOwners, 'S-1-3-0']
  const mask = policy.root ? windowsRootControl : windowsAncestorControl
  for (const rule of policy.rules) {
    if (rule.inheritOnly || !rule.allow || (rule.rights & mask) === 0 || allowed.includes(rule.sid)) continue
    if (!(policy.withinUserProfile && /^S-1-15-[23]-/.test(rule.sid))) throw unsafe()
  }
}

function absolute(value: string): string {
  if (!path.isAbsolute(value))
    throw new Error('Snapshot cache directory must be absolute')
  return path.resolve(value)
}
export function snapshotCacheDirectory(env: NodeJS.ProcessEnv): string {
  if (env.OMBELLE_SNAPSHOT_CACHE_DIR !== undefined)
    return absolute(env.OMBELLE_SNAPSHOT_CACHE_DIR)
  const home = env.HOME || env.USERPROFILE || os.homedir()
  if (process.platform === 'win32') {
    if (!env.LOCALAPPDATA)
      throw new Error('LOCALAPPDATA is required for the snapshot cache')
    return path.join(absolute(env.LOCALAPPDATA), 'ombelle/cache/snapshots')
  }
  if (process.platform === 'darwin')
    return path.join(absolute(home), 'Library/Caches/ombelle/snapshots')
  const base = env.XDG_CACHE_HOME && path.isAbsolute(env.XDG_CACHE_HOME)
    ? env.XDG_CACHE_HOME
    : path.join(absolute(home), '.cache')
  return path.join(base, 'ombelle/snapshots')
}
function filename(key: SnapshotCacheKey): string {
  return createHash('sha256')
    .update(canonicalize(validateSnapshotSource(key)))
    .digest('hex') + '.json'
}

// The boundary is an owner-controlled directory. Node has no portable openat /
// renameat: these checks detect substitution, but cannot protect against a
// hostile same-user/admin actor concurrently replacing ancestors between calls.
async function components(root: string, create: boolean): Promise<Stats> {
  const parsed = path.parse(root)
  let current = parsed.root
  const directories = [current]
  for (const segment of root.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment)
    directories.push(current)
  }
  for (current of directories) {
    let stat: Stats
    try {
      stat = await fs.lstat(current)
    } catch (error) {
      if (!create || !missing(error)) throw error
      try {
        await fs.mkdir(current, { mode: 0o700 })
      } catch (mkdirError) {
        if ((mkdirError as NodeJS.ErrnoException).code !== 'EEXIST') throw mkdirError
      }
      stat = await fs.lstat(current)
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw unsafe()
    if (process.platform !== 'win32') assertCacheDirectoryPolicy({
      platform: 'posix', uid: stat.uid, currentUid: process.getuid?.() ?? -1,
      mode: stat.mode, root: current === root,
    })
  }
  return fs.lstat(root)
}
async function owned(root: string, create = false): Promise<Stats> {
  const stat = await components(root, create)
  if (process.platform === 'win32') {
    // Windows mode bits do not establish ACL ownership. Fail closed if the
    // platform ACL cannot be inspected. Cache this owner-bound proof by identity;
    // ACL mutation by the owner/admin is outside the boundary described above.
    const token = `${root}:${stat.dev}:${stat.ino}`
    let proof = windowsOwnership.get(token)
    if (!proof) {
      proof = (async () => {
        const script = `
$ErrorActionPreference='Stop'
$root=$env:OMBELLE_CACHE_ACL_PATH
$u=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$directories=@()
$p=$root
while ($p) {
  $a=[System.IO.Directory]::GetAccessControl($p)
  $rules=@()
  foreach ($r in $a.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])) {
    $rules+=@{sid=$r.IdentityReference.Value; rights=[int]$r.FileSystemRights; allow=($r.AccessControlType -eq 'Allow'); inheritOnly=(($r.PropagationFlags -band [System.Security.AccessControl.PropagationFlags]::InheritOnly) -ne 0)}
  }
  $directories+=@{owner=$a.GetOwner([System.Security.Principal.SecurityIdentifier]).Value; root=($p -eq $root); withinUserProfile=$p.StartsWith($env:USERPROFILE + '\\',[System.StringComparison]::OrdinalIgnoreCase); rules=@($rules)}
  $parent=[System.IO.Directory]::GetParent($p)
  if ($null -eq $parent) { break }
  $p=$parent.FullName
}
@{currentUser=$u; directories=@($directories)} | ConvertTo-Json -Depth 5 -Compress`
        const { stdout } = await run(
          path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'),
          ['-NoProfile', '-NonInteractive', '-Command', script],
          {
            env: { ...process.env, OMBELLE_CACHE_ACL_PATH: root },
            timeout: 10_000, maxBuffer: 16_384, windowsHide: true,
          },
        )
        const inspected = JSON.parse(stdout) as {
          currentUser: string
          directories: Omit<Extract<DirectoryPolicy, { platform: 'win32' }>, 'platform' | 'currentUser'>[]
        }
        if (!inspected.directories.length) throw unsafe()
        for (const directory of inspected.directories) assertCacheDirectoryPolicy({
          ...directory, platform: 'win32', currentUser: inspected.currentUser,
        })
      })()
      windowsOwnership.set(token, proof)
    }
    await proof
  }
  if (!identical(stat, await components(root, false))) throw unsafe()
  return stat
}
async function unchanged(root: string, identity: Stats): Promise<void> {
  if (!identical(identity, await components(root, false))) throw unsafe()
}
function regular(stat: Stats, allowPublishLink = false): boolean {
  return stat.isFile() && !stat.isSymbolicLink() &&
    stat.nlink >= 1 && stat.nlink <= (allowPublishLink ? 2 : 1) &&
    stat.size <= maxBytes &&
    (process.platform === 'win32' ||
      (stat.uid === process.getuid?.() && (stat.mode & 0o022) === 0))
}
async function readEntry(
  root: string, name: string, identity: Stats, key?: SnapshotCacheKey,
): Promise<{ snapshot: PresetSnapshot; stat: Stats } | null> {
  let handle: FileHandle | undefined
  try {
    await unchanged(root, identity)
    const file = path.join(root, name)
    const before = await fs.lstat(file)
    if (!regular(before, true)) return null
    handle = await fs.open(
      file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0),
    )
    const opened = await handle.stat()
    if (!regular(opened, true) || !identical(before, opened)) return null
    const buffer = Buffer.alloc(maxBytes)
    let length = 0
    while (length < buffer.length) {
      const read = await handle.read(buffer, length, buffer.length - length, null)
      if (read.bytesRead === 0) break
      length += read.bytesRead
    }
    const after = await handle.stat()
    if (
      !identical(opened, after) || after.size !== length ||
      after.mtimeMs !== opened.mtimeMs || !identical(after, await fs.lstat(file))
    ) return null
    await unchanged(root, identity)
    const snapshot = await verifyPresetSnapshot(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length))), key,
    )
    return { snapshot, stat: after }
  } catch {
    return null
  } finally {
    await handle?.close()
  }
}
export async function readSnapshotCache(
  root: string, key: SnapshotCacheKey,
): Promise<PresetSnapshot | null> {
  root = absolute(root)
  const name = filename(key)
  try {
    const identity = await owned(root)
    return (await readEntry(root, name, identity, key))?.snapshot ?? null
  } catch {
    return null
  }
}
async function unlinkOwned(
  root: string, name: string, identity: Stats, fileIdentity: Stats,
): Promise<void> {
  await unchanged(root, identity)
  const file = path.join(root, name)
  const current = await fs.lstat(file)
  if (!current.isFile() || current.isSymbolicLink() || !identical(current, fileIdentity))
    throw unsafe()
  await fs.unlink(file)
}
async function boundedNames(root: string, identity: Stats): Promise<string[]> {
  await unchanged(root, identity)
  const names: string[] = []
  // Refuse admission if bounded accounting cannot establish capacity. Unknown
  // files remain untouched, but cannot disable the usable-entry limit.
  for await (const entry of await fs.opendir(root)) {
    if (names.length === maxEntries * 4)
      throw new Error('Snapshot cache capacity cannot be established within the bounded scan')
    names.push(entry.name)
  }
  return names
}
async function evict(root: string, identity: Stats, keep: string): Promise<void> {
  const entries: { name: string; stat: Stats }[] = []
  const names = await boundedNames(root, identity)
  for (const name of names) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) continue
    const entry = await readEntry(root, name, identity)
    if (entry && entry.stat.nlink === 1) entries.push({ name, stat: entry.stat })
  }
  let bytes = entries.reduce((sum, entry) => sum + entry.stat.size, 0)
  let count = entries.length
  entries.sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs || a.name.localeCompare(b.name))
  for (const entry of entries) {
    if (count <= maxEntries && bytes <= maxTotalBytes) break
    if (entry.name === keep) continue
    await unlinkOwned(root, entry.name, identity, entry.stat)
    count--
    bytes -= entry.stat.size
  }
}
export async function writeSnapshotCache(
  root: string, key: SnapshotCacheKey, snapshot: PresetSnapshot,
): Promise<void> {
  root = absolute(root)
  const name = filename(key)
  const bytes = Buffer.from(canonicalize(await verifyPresetSnapshot(snapshot, key)))
  if (bytes.length > maxBytes) throw new Error('Snapshot cache envelope exceeds 128 KiB')
  const identity = await owned(root, true)
  const checkExisting = async () => {
    const existing = await readEntry(root, name, identity, key)
    if (!existing || canonicalize(existing.snapshot) !== bytes.toString())
      throw new Error('Refusing a different or unusable envelope for an immutable snapshot cache key')
  }
  try {
    await fs.lstat(path.join(root, name))
    await checkExisting()
    return
  } catch (error) {
    if (!missing(error)) throw error
  }
  await boundedNames(root, identity)
  const temporary = '.' + randomUUID() + '.tmp'
  let handle: FileHandle | undefined
  let temporaryIdentity: Stats | undefined
  let published = false
  try {
    await unchanged(root, identity)
    handle = await fs.open(
      path.join(root, temporary),
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0),
      0o600,
    )
    temporaryIdentity = await handle.stat()
    if (!regular(temporaryIdentity) || !identical(temporaryIdentity, await fs.lstat(path.join(root, temporary))))
      throw unsafe()
    await unchanged(root, identity)
    await handle.writeFile(bytes)
    await handle.sync()
    await handle.close()
    handle = undefined
    await unchanged(root, identity)
    const ready = await fs.lstat(path.join(root, temporary))
    if (!regular(ready) || !identical(ready, temporaryIdentity)) throw unsafe()
    // link is an atomic no-clobber publish on supported filesystems. rename can
    // overwrite on both POSIX and Windows. Never fall back to overwriting rename.
    try {
      await fs.link(path.join(root, temporary), path.join(root, name))
      published = true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      await checkExisting()
    }
  } finally {
    await handle?.close()
    if (temporaryIdentity) await unlinkOwned(root, temporary, identity, temporaryIdentity)
  }
  // Failure must not leave an admission that bypasses bounded accounting. Only
  // roll back the entry this writer actually published; never another writer's.
  try {
    await evict(root, identity, name)
  } catch (error) {
    if (published && temporaryIdentity) {
      try { await unlinkOwned(root, name, identity, temporaryIdentity) }
      catch (cleanupError) { if (!missing(cleanupError)) throw cleanupError }
    }
    throw error
  }
}
