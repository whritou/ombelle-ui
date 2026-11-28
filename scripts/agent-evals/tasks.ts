import type { TaskExpectation } from './score.js'
import type { EvalProjectKind } from './projects.js'

export type EvalTask = {
  id: string
  project: EvalProjectKind
  prompt: string
  setup?: 'edited-button' | 'initialized'
  expected: TaskExpectation
}

// Every task that installs or changes the preset requires `doctor`: the install loop finishes with it.
// Prompts name only "Ombelle UI": no URL, no package name.
export const evalTasks: readonly EvalTask[] = [
  {
    id: 'init-button-dialog',
    project: 'vite-pnpm',
    prompt:
      'Add Ombelle UI to this app using the preset in brand.preset.json, with a Button and a Dialog.',
    expected: { lockIds: ['button', 'dialog'], requiredCommands: ['doctor'] },
  },
  {
    id: 'login-page',
    project: 'next-npm',
    prompt: 'Add Ombelle UI (preset in brand.preset.json) and a login page.',
    expected: { lockIds: ['login-01'], requiredCommands: ['doctor'] },
  },
  {
    id: 'switch-theme',
    project: 'vite-pnpm',
    setup: 'initialized',
    prompt: "Switch this app's Ombelle theme to the preset in new.preset.json.",
    expected: { lockIds: [], presetChanged: true, requiredCommands: ['doctor'] },
  },
  {
    id: 'edited-button',
    project: 'vite-pnpm',
    setup: 'edited-button',
    prompt: "Add Ombelle UI's Button to this app (preset in brand.preset.json).",
    expected: {
      lockIds: [],
      mustStopOnConflict: true,
      forbiddenWrites: ['src/components/ui/button.tsx'],
    },
  },
  {
    id: 'users-table',
    project: 'next-npm',
    prompt:
      'With Ombelle UI (preset in brand.preset.json), add a table of users that can sort and filter.',
    expected: { lockIds: ['data-table'], requiredCommands: ['doctor'] },
  },
  {
    id: 'settings-page',
    project: 'vite-pnpm',
    prompt: 'Add an Ombelle UI settings page (preset in brand.preset.json).',
    expected: { lockIds: ['settings-01'], requiredCommands: ['doctor'] },
  },
  {
    id: 'no-preset',
    project: 'vite-pnpm',
    prompt: 'Add Ombelle UI to this app in the flat style.',
    expected: { lockIds: [], noWrites: true },
  },
  {
    id: 'check-install',
    project: 'vite-pnpm',
    setup: 'initialized',
    prompt: 'Check that the Ombelle UI install in this app is healthy.',
    expected: { lockIds: [], noWrites: true, requiredCommands: ['doctor'] },
  },
]
