import cliPackage from '../package.json' with { type: 'json' }
/** The CLI's own version, as `--version`, `info` and `doctor` print it. */
export const cliVersion: string = cliPackage.version
