// CLI-06: :root and .dark nested in @layer are edited in place, not shadowed by appended unlayered copies.
import { afterEach, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import postcss from 'postcss'
import { compile } from '@ombelle/compiler'
import example from '../../../examples/preset.example.json'
import { createProject } from '../../../tests/helpers/projects.js'
import { inspectProject } from '../src/project/inspect.js'
import { planTheme } from '../src/plan/theme.js'

const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true }) })
const result = () => compile({ preset: example, componentIds: [], catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
async function project(css: string) {
  const root = await createProject('vite')
  roots.push(root)
  const context = await inspectProject(root)
  await fs.writeFile(path.join(root, context.cssEntry), css)
  return inspectProject(root)
}
const planned = (plan: Awaited<ReturnType<typeof planTheme>>, file: string) =>
  postcss.parse(plan.changes.find(change => change.path === file)!.afterContent)

it('merges tokens into the layered :root and .dark blocks', async () => {
  const context = await project('@import "tailwindcss";\n@layer base {\n  :root { --background: #000; --primary: red; }\n  .dark { --background: #111; }\n}\n')
  const plan = await planTheme(context, await result())
  expect(plan.diagnostics).toEqual([])
  const css = planned(plan, context.cssEntry)
  const top = css.nodes.filter(node => node.type === 'rule').map(node => (node as postcss.Rule).selector)
  expect(top).not.toContain(':root')
  expect(top).not.toContain('.dark')
  let backgrounds = 0
  css.walkDecls('--background', () => { backgrounds++ })
  expect(backgrounds).toBe(2)
  css.walkRules(':root', rule => {
    expect(rule.parent?.type).toBe('atrule')
    rule.walkDecls('--primary', decl => { expect(decl.value).not.toBe('red') })
  })
})

it('refuses a selector declared both inside and outside @layer', async () => {
  const context = await project('@layer base { :root { --background: #000; } }\n:root { --primary: red; }\n')
  await expect(planTheme(context, await result())).rejects.toMatchObject({ code: 'UNSUPPORTED_PROJECT', path: ':root' })
})
