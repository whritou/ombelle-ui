# Font consumer fixtures

The `vite-fonts` and `next-fonts` matrix rows reuse the ordinary framework fixture
files and replace only `package.json` and `pnpm-lock.yaml` with these frozen
inputs. Both include exactly pinned Inter, Fraunces and JetBrains Mono Fontsource
packages. The consumer preparer applies the matching schema 1.1 preset through
the CLI and verifies installed artifacts against the compiler, physical package
versions, unchanged locks and production dependency audit before building.

The separate real CLI install case in `tests/integration/font-pairs-cli.test.ts`
starts without fonts and verifies that installation supplies their CSS/woff2
assets while lifecycle scripts remain disabled.
