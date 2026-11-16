import { it, expect } from 'vitest'
import { compile } from '../src/index.js'
import { getCatalog } from '@ombelle/catalog'
import { styleFamilies } from '@ombelle/contracts'
import { parse } from '@babel/parser'
const targets = [
  'alert',
  'card',
  'checkbox',
  'progress',
  'avatar',
  'badge',
  'button-group',
  'calendar',
  'chip',
  'code-block',
  'color-picker',
  'input-group',
  'input',
  'label',
  'native-select',
  'number-input',
  'password-field',
  'radio-group',
  'select',
  'separator',
  'skeleton',
  'slider',
  'spinner',
  'switch',
  'tag-input',
  'textarea',
  'toggle',
] as const
it.each(
  styleFamilies.flatMap((family) =>
    (['radix', 'base'] as const).map((edition) => ({ family, edition })),
  ),
)(
  '$family $edition examples space independent groups and preserve named controls',
  async ({ family, edition }) => {
    const result = await compile({
      preset: getCatalog('0.1.0').presets[family],
      componentIds: targets,
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      edition,
    })
    for (const id of targets) {
      const code = result.artifacts.find(
        (a) => a.logicalPath === 'examples/' + id + '.tsx',
      )!.content
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
      })
      const fn = ast.program.body.find(
        (n: any) =>
          n.type === 'ExportNamedDeclaration' &&
          n.declaration?.type === 'FunctionDeclaration',
      ) as any
      const root = fn.declaration.body.body.find(
        (n: any) => n.type === 'ReturnStatement',
      ).argument
      expect(root.type, id).toBe('JSXElement')
      const style = root.openingElement.attributes.find(
        (a: any) => a.name?.name === 'style',
      )
      expect(style, id + ' has an explicit example layout').toBeDefined()
      expect(code, id).toContain('gap')
      if (id === 'button-group' && edition === 'base') {
        expect(code).not.toMatch(/<DropdownMenuTrigger\s+asChild/)
        expect(code).toContain('render=')
      }
      if (id === 'progress') expect(code).toContain('ProgressLabel')
      if (id === 'checkbox') {
        expect(code).toContain('htmlFor="terms"')
        expect(code).toContain('aria-describedby="terms-error"')
      }
    }
  },
)
