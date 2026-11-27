# Ombelle UI agent skills

Agent Skills (the open `SKILL.md` format, read by Claude Code, Codex, Cursor and other coding agents) that teach a coding agent to install and use Ombelle UI correctly in your own app: the published CLI, preset codes, a dry run before every write, and a stop on conflicts instead of overwriting your files.

## Install

```bash
npx skills add whritou/ombelle-ui
```

Install one skill with `--skill`:

```bash
npx skills add whritou/ombelle-ui --skill ombelle-install
```

## The skills

- `ombelle-install`: install Ombelle components and initialize a preset with the guarded CLI loop; holds the full rules and the diagnostic code table.
- `ombelle-choose`: pick the right component or block from the live catalog before installing.
- `ombelle-theme`: switch or apply a preset, add a component-only preset, show the saved preset.
- `ombelle-blocks`: install and wire login, settings, pricing and dashboard blocks, keeping their auth and data marked as examples.
- `ombelle-check`: inspect, diagnose and update an existing install with `info`, `doctor`, `diff` and `update`.

Every skill reads the current CLI version from `https://ombelle-ui.vercel.app/api/v1/catalog` instead of pinning one.
