# Toolchain baseline

20 October 2026. Foundation runtime: Node 24.19.0 (the actual bundled executable) and pnpm 11.25.0. Root manifest and pnpm lockfile pin all installed tooling: TypeScript 7.0.2, Vitest 5.0.5, Ajv 8.20.0 (2020-12 validator), json-schema-to-ts 3.1.1, tsx 4.23.15 and esbuild 0.28.2. React, Radix, Vite, Next, Tailwind and test browser packages will be added and pinned with the tasks that consume them.

Schemas remain authoritative: sync-schema.mjs generates const schema bindings for both Ajv and FromSchema. The semantic color policy supports six-digit hex and numeric OKLCH, lightness/alpha in [0,1], chroma in [0,0.4], and hue in [0,360]. These are input bounds, not a claim of gamut or contrast certification.

Only esbuild's reviewed native-binary installation hook is permitted in pnpm-workspace.yaml. The initial 119-package lockfile audit reported zero advisories. Exact npm metadata was checked for lifecycle scripts. npmscan connector tools are unavailable, so no maintainer/provenance or private advisory coverage is claimed.

Run with the pinned runtime; the machine's alternate Node executable is older. Normal TLS verification stays enabled; the host certificate store is used through Node's use-system-ca option when needed.
