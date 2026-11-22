# Notice

Ombelle UI is released under the [MIT License](LICENSE). Copyright (c) 2026 Arthur THOMAS (see `LICENSE`).

## shadcn/ui

Ombelle's components follow the composition, slot names and prop conventions of [shadcn/ui](https://ui.shadcn.com)
(MIT License, Copyright (c) 2023 shadcn), and some catalog templates were written starting from its component source.
Until the author records which templates are original and which are derived (see [1.0 decisions](docs/1.0-decisions.md)),
all catalog templates are treated as derived from shadcn/ui, and this notice applies to them:

> MIT License
>
> Copyright (c) 2023 shadcn
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
> documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
> rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
> persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
> Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
> WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
> COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
> OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Ombelle is not affiliated with or endorsed by shadcn.

## What reaches your project

- **Installed source** (components, styles, examples): written by the CLI into your project. The notice above and the
  MIT licence of this repository apply to it. The CLI does not yet add a notice file or per-file headers to your
  project; the proposal is a single `NOTICE` written once, which needs an owner decision (see
  [1.0 decisions](docs/1.0-decisions.md)).
- **Runtime dependencies** the CLI adds to your `package.json` (Radix UI or Base UI, `lucide-react`, `cmdk`,
  `class-variance-authority`, `clsx`, `tailwind-merge`, `react-day-picker`, `date-fns`, `input-otp`, TanStack Table and
  others, each pinned in `packages/catalog/src/manifest.ts`) arrive through your package manager under their own
  licences.
- **Fonts** are never copied. A preset that uses a registry font adds the pinned Fontsource package (SIL OFL 1.1) as a
  dependency.
- **The published CLI** bundles its own dependencies; `THIRD_PARTY_NOTICES.txt` in the package lists each with its licence
  text. Where the version installed into projects differs from the bundled one (today `lucide-react`: projects get
  1.55.0, the CLI was built against 1.72.0, both ISC), the notice says so.
