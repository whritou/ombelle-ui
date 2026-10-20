import { spawn } from 'node:child_process'
export async function run(
  file: string,
  args: string[],
  cwd = process.cwd(),
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    })
    let out = ''
    child.stdout.on('data', (s) => {
      out += s
    })
    child.stderr.on('data', (s) => {
      out += s
    })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0
        ? resolve(out)
        : reject(
            new Error(file + ' ' + args.join(' ') + '\n' + out.slice(-6000)),
          ),
    )
  })
}
export function pnpmEntry() {
  const p = process.env.npm_execpath
  if (!p) throw new Error('Launch preparation/build scripts with pnpm run')
  return p
}
