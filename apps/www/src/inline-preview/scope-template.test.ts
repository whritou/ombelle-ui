import { describe, expect, it } from 'vitest'
import { compile } from '@ombelle/compiler'
import { getCatalog } from '@ombelle/catalog'
import { scopePreviewTemplate } from '../../../../scripts/www-previews/scope-template'

const imports = { utils: '../../ui/lib/utils', portal: '../../../inline-preview/preview-portal' }

describe('scopePreviewTemplate', () => {
  it('renames slot attributes', async () => {
    expect(await scopePreviewTemplate(`const a = <><div data-slot="button" /><i data-slot='x' /></>`, imports)).toBe(
      `const a = <><div data-slot="pv-button" /><i data-slot='pv-x' /></>`,
    )
  })

  it('renames slot object literals and leaves type annotations', async () => {
    const out = await scopePreviewTemplate(`const p = { 'data-slot': 'item' }\ntype T = { 'data-slot': string }`, imports)
    expect(out).toContain(`{ 'data-slot': 'pv-item' }`)
    expect(out).toContain(`{ 'data-slot': string }`)
  })

  it('renames slot selectors inside string literals', async () => {
    const out = await scopePreviewTemplate(`x.closest('[data-slot="input-group"]'); y.closest("[data-slot='a']")`, imports)
    expect(out).toContain(`closest('[data-slot="pv-input-group"]')`)
    expect(out).toContain(`closest("[data-slot='pv-a']")`)
  })

  it('routes primitive portals through PreviewPortal', async () => {
    const out = await scopePreviewTemplate(
      `import * as DialogPrimitive from '@radix-ui/react-dialog'\nconst a = <DialogPrimitive.Portal forceMount={x}>y</DialogPrimitive.Portal>\nconst b = <DialogPrimitive.Portal data-slot="p" {...props} />`,
      imports,
    )
    expect(out).toContain('<PreviewPortal portal={DialogPrimitive.Portal} forceMount={x}>y</PreviewPortal>')
    expect(out).toContain('<PreviewPortal portal={DialogPrimitive.Portal} data-slot="pv-p" {...props} />')
    expect(out.match(/import \{ PreviewPortal \} from "..\/..\/..\/inline-preview\/preview-portal"/g)).toHaveLength(1)
    expect(out).not.toContain('Primitive.Portal>')
  })

  it('does not touch type positions or add an import without portals', async () => {
    const src = `import * as P from 'x'\ntype A = React.ComponentProps<typeof P.Portal>`
    expect(await scopePreviewTemplate(src, imports)).toBe(src)
  })

  it('strips stylesheet imports and rewrites utils and sibling imports', async () => {
    const out = await scopePreviewTemplate(
      `import './button.css'\nimport { cn } from '@/lib/utils'\nimport { A } from '@/components/ui/x'\nimport * as React from 'react'`,
      imports,
    )
    expect(out).not.toContain('button.css')
    expect(out).toContain(`from "../../ui/lib/utils"`)
    expect(out).toContain(`from "./x"`)
    expect(out).toContain(`from 'react'`)
  })

  it('leaves no unrenamed slot in any catalog template', async () => {
    const templates = Object.values(getCatalog('0.1.0').templates)
    expect(templates.length).toBeGreaterThan(40)
    for (const template of templates) {
      const out = await scopePreviewTemplate(template.content, imports)
      const bad = [...out.matchAll(/data-slot(?:["']?\s*[:=]\s*)["']([^"']*)["']/g)].filter((m) => !m[1].startsWith('pv-'))
      expect(
        bad.map((m) => m[0]),
        template.id,
      ).toEqual([])
      expect(out, template.id).not.toMatch(/data-slot=\{/)
      expect(out, template.id).not.toMatch(/<\w+\.Portal[\s/>]/)
      expect(out, template.id).not.toMatch(/@\/|\.css['"]/)
    }
  })

  it('transforms every compiled radix component artifact', async () => {
    const catalog = getCatalog('0.1.0')
    const result = await compile({
      preset: catalog.presets.flat,
      componentIds: Object.keys(catalog.templates) as never,
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
    })
    const components = result.artifacts.filter((a) => a.kind === 'component')
    expect(components.length).toBeGreaterThan(40)
    for (const artifact of components) {
      const out = await scopePreviewTemplate(artifact.content, imports)
      expect(out, artifact.logicalPath).not.toMatch(/@\/|\.css['"]/)
      expect(out, artifact.logicalPath).not.toMatch(/data-slot=["'](?!pv-)/)
    }
  }, 120000)
})
