# Generated shadcn projects

`vite/` and `next/` (Radix) and `vite-base/` and `next-base/` (Base UI) are the unmodified output of the repository's pinned `shadcn` 4.22.1, minus `node_modules/` and the `.git/` directory the template creates. [`shadcn-theme-merge.test.ts`](../../tests/integration/shadcn-theme-merge.test.ts) copies them to a temporary directory and runs `theme add` on them with no Ombelle `init`. `.gitattributes` keeps their bytes exact on every checkout.

Generated on 3 November 2026 on Windows 11 with Node 24.19.0 and pnpm 11.25.0:

```bash
pnpm exec shadcn init -t vite -b radix -p nova -n shadcn-vite --no-monorepo -y -c <dir>
```

```bash
pnpm exec shadcn init -t next -b radix -p nova -n shadcn-next --no-monorepo -y -c <dir>
```

`shadcn init -t` clones its template from the default branch of `shadcn-ui/ui` (then at `4aaea19d9cff3e0908e12a8c1d504b8c5ec34610`), so the template files reflect that commit rather than the CLI's release. The templates themselves declare `shadcn` `^4.23.0`. The CLI installed dependencies with pnpm, which wrote `pnpm-lock.yaml` and a settings-only `pnpm-workspace.yaml` (`packages: []` plus `allowBuilds`).

Both use the `radix-nova` style, `neutral` base colour, CSS variables and Tailwind v4. The Vite template declares `react` and `react-dom` as `^19.3.1`; the Next.js template pins `19.3.1`. Both `lib/utils.ts` files re-export `cn` from the `cn` package instead of defining it with `clsx` and `tailwind-merge`.

## Base UI fixtures

`vite-base/` and `next-base/` were generated on 7 November 2026 on Windows 11 with Node 24.19.0 and pnpm 11.25.0, with the same pinned `shadcn` 4.22.1:

```bash
pnpm exec shadcn init -t vite -b base -p nova -n shadcn-vite-base --no-monorepo -y -c <dir>
```

```bash
pnpm exec shadcn init -t next -b base -p nova -n shadcn-next-base --no-monorepo -y -c <dir>
```

The templates came from `shadcn-ui/ui` at `42f3bb63b46a69e52a24bd005cdc9ec15ba7a7b9`. Both use the `base-nova` style: `components/ui/button.tsx` imports `@base-ui/react/button`. Their file layout, React declarations (Vite `^19.3.1`, Next.js `19.3.1`) and `lib/utils.ts` bytes match the Radix fixtures. [`shadcn-theme-merge.test.ts`](../../tests/integration/shadcn-theme-merge.test.ts) covers both editions.

To regenerate, run the commands above in an empty directory outside this repository, copy the results here without `node_modules/` or `.git/`, and review the diff together with the test.
