import { describe, expect, it } from 'vitest'
import postcss, { type Container, type Node } from 'postcss'
import { getCatalog } from '@ombelle/catalog'
import {
  componentsWithStyleSupport,
  type ComponentId,
  type Preset,
} from '@ombelle/contracts'
import { compile, glassContrastReport } from '../src/index.js'
import { squash } from './new-component-artifacts.js'

const experimental = componentsWithStyleSupport('liquid-glass', ['experimental'])
const unavailable = componentsWithStyleSupport('liquid-glass', ['unavailable'])
const builtin = () => structuredClone(getCatalog('0.1.0').presets['liquid-glass'])
const build = (preset: unknown, componentIds: readonly ComponentId[] = experimental) =>
  compile({ preset, componentIds, catalogRelease: '0.1.0', compilerVersion: '0.1.0' })
const artifact = (
  result: Awaited<ReturnType<typeof build>>,
  logicalPath: string,
) => result.artifacts.find((a) => a.logicalPath === logicalPath)?.content ?? ''
const withDesign = (design: Partial<Preset['design']>): Preset => {
  const preset = builtin()
  preset.design = { ...preset.design, ...design }
  return preset
}
const supportsCondition =
  '@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))'

const normalize = (css: string) =>
  css.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')

describe('liquid-glass compile', () => {
  it('compiles the ten experimental components', async () => {
    expect([...experimental].sort()).toEqual(['alert', 'badge', 'button', 'card', 'dialog', 'dropdown-menu', 'input', 'popover', 'tabs', 'tooltip'])
    const preset = builtin()
    const result = await build(preset)
    expect(
      result.artifacts.filter((a) => a.kind === 'style').map((a) => a.logicalPath),
    ).toEqual([
      'components/ui/alert.css',
      'components/ui/badge.css',
      'components/ui/card.css',
      'components/ui/dropdown-menu.css',
      'components/ui/popover.css',
      'components/ui/tabs.css',
      'components/ui/tooltip.css',
      'styles/ui-style.css',
      'styles/ui-tokens.css',
    ])
    const tokens = artifact(result, 'styles/ui-tokens.css').replace(/\s+/g, '')
    expect(tokens).toContain('--glass-blur:3px;')
    expect(tokens).toContain('--glass-opacity:' + preset.design.glassOpacity + ';')
    const root = tokens.slice(0, tokens.indexOf('}'))
    expect(root).toContain('--glass-blur')
    expect(root).toContain('--glass-opacity')
  })

  it('is deterministic', async () => {
    const first = await build(builtin())
    const second = await build(builtin(), [...experimental].reverse())
    expect(second.artifacts.map((a) => a.sha256)).toEqual(
      first.artifacts.map((a) => a.sha256),
    )
    expect(second.preset.hash).toBe(first.preset.hash)
  })

  it.each(unavailable)('refuses unavailable component %s', async (id) => {
    expect(unavailable).toHaveLength(13)
    await expect(build(builtin(), ['button', id])).rejects.toMatchObject({
      code: 'STYLE_UNAVAILABLE',
      path: '/componentIds',
    })
  })

  it('reduced transparency emits opaque tokens', async () => {
    const result = await build(withDesign({ transparency: 'reduced', glassOpacity: 0.6 }))
    const tokens = artifact(result, 'styles/ui-tokens.css').replace(/\s+/g, '')
    expect(tokens).toContain('--glass-blur:0px;')
    expect(tokens).toContain('--glass-opacity:1;')
  })

  it('emits no glass tokens for other families', async () => {
    for (const family of ['flat', 'minimalist', 'neo-brutalism'] as const) {
      const result = await build(getCatalog('0.1.0').presets[family], ['button'])
      expect(artifact(result, 'styles/ui-tokens.css')).not.toContain('--glass')
    }
  })

  it('rejects low opacity', async () => {
    const error = await build(withDesign({ glassOpacity: 0.3 })).catch((e) => e)
    expect(error).toMatchObject({ code: 'INVALID_DATA', path: '/design/glassOpacity' })
    expect(error.message).toMatch(
      /^Liquid glass text contrast fails in (light|dark) for \w+ on \w+: \d+\.\d+:1 (over the (darkest|brightest) filtered backdrop|on the opaque fallback surface)\. Minimum passing glassOpacity is 0\.\d+\.$/,
    )
  })

  it('compiles a failing draft only in report mode, so an editor can preview it', async () => {
    const preset = withDesign({ glassOpacity: 0.3 })
    const preview = await compile({ preset, componentIds: experimental, catalogRelease: '0.1.0', compilerVersion: '0.1.0', glassContrast: 'report' })
    expect(preview.artifacts.length).toBeGreaterThan(0)
    expect(glassContrastReport(preview.preset.data).passes).toBe(false)
    // The default still enforces the bound for installers and publication.
    await expect(compile({ preset, componentIds: experimental, catalogRelease: '0.1.0', compilerVersion: '0.1.0', glassContrast: 'enforce' })).rejects.toMatchObject({ code: 'INVALID_DATA', path: '/design/glassOpacity' })
  })

  it('bounds a sparse custom palette', async () => {
    const error = await build({
      schemaVersion: '1.0',
      id: 'sparse-glass',
      name: 'Sparse glass',
      revision: 1,
      catalogRelease: '0.1.0',
      compilerVersion: '0.1.0',
      platform: 'react-web',
      styleFamily: 'liquid-glass',
      modes: { light: {}, dark: { muted: '#64748B' } },
      design: {},
    }).catch((e) => e)
    expect(error).toMatchObject({ code: 'INVALID_DATA', path: '/design/glassOpacity' })
    expect(error.message).toContain('fails in dark')
  })

  it('built-in opacity is minimal', () => {
    const preset = builtin()
    const report = glassContrastReport(preset)
    expect(report.passes).toBe(true)
    expect(preset.design.glassOpacity).toBe(report.minimumOpacity)
  })

  it('keeps every backdrop-filter inside the @supports fallback', async () => {
    const result = await build(builtin())
    const sheets = result.artifacts.filter((a) => a.kind === 'style')
    const familyCss = artifact(result, 'styles/ui-style.css')
    // The catalog source carries the condition verbatim; prettier wraps it in the artifact.
    expect(getCatalog('0.1.0').styles['liquid-glass']).toContain(supportsCondition)
    expect(normalize(familyCss)).toContain(supportsCondition + ' {')
    expect(familyCss).toContain('@media (prefers-reduced-transparency: reduce)')
    const insideSupports = (node: Node) => {
      for (let p: Container | undefined = node.parent as Container | undefined; p; p = p.parent as Container | undefined)
        if (p.type === 'atrule' && (p as postcss.AtRule).name === 'supports') return true
      return false
    }
    let filters = 0
    for (const sheet of sheets) {
      postcss.parse(sheet.content).walkDecls((decl) => {
        if (!/backdrop-filter$/.test(decl.prop)) return
        filters++
        const reset = decl.value === 'none'
        if (!reset) expect(insideSupports(decl), sheet.logicalPath + ' ' + decl.toString()).toBe(true)
      })
      postcss.parse(sheet.content).walkAtRules('supports', (rule) => {
        expect(normalize('@supports ' + rule.params)).toBe(supportsCondition)
      })
    }
    expect(filters).toBeGreaterThan(0)
  })

  it('uses no descendant selectors in glass styles', async () => {
    const result = await build(builtin())
    for (const sheet of result.artifacts.filter((a) => a.kind === 'style' && a.logicalPath !== 'styles/ui-tokens.css'))
      postcss.parse(sheet.content).walkRules((rule) => {
        if (rule.parent?.type === 'atrule' && (rule.parent as postcss.AtRule).name === 'keyframes') return
        for (const selector of rule.selectors)
          expect(selector.match(/\[data-slot=/g)?.length ?? 0, sheet.logicalPath + ' ' + selector).toBeLessThanOrEqual(1)
      })
  })
})

describe('liquid-glass edges and shadows', () => {
  const styleSheets = (result: Awaited<ReturnType<typeof build>>) =>
    result.artifacts.filter((a) => a.kind === 'style' && a.logicalPath !== 'styles/ui-tokens.css')
  const ruleBody = (result: Awaited<ReturnType<typeof build>>, slot: string) => {
    let body = ''
    for (const sheet of styleSheets(result))
      postcss.parse(sheet.content).walkRules((rule) => {
        if (rule.selectors.map(squash).includes('[data-slot="' + slot + '"]'))
          body += rule.nodes.map((n) => squash(n.toString())).join(';') + ';'
      })
    return body
  }

  it('glass edges and drop shadows read the preset tokens', async () => {
    const result = await build(builtin())
    for (const sheet of styleSheets(result))
      expect(squash(sheet.content), sheet.logicalPath).not.toContain(
        'color-mix(insrgb,var(--foreground)14%,transparent)',
      )
    for (const slot of ['card', 'dialog-content', 'popover-content', 'tooltip-content']) {
      const body = ruleBody(result, slot)
      expect(body, slot).toContain('var(--border-width)solidvar(--border)')
    }
    for (const slot of ['card', 'popover-content'])
      expect(ruleBody(result, slot), slot).toContain('var(--shadow-x)var(--shadow-y)')
    expect(ruleBody(result, 'dialog-content')).toContain(
      'calc(var(--shadow-x)*2)calc(var(--shadow-y)*2)calc(var(--shadow-y)*4)calc(var(--shadow-y)*-1.333)',
    )
    // Tooltip's drop shadow is 8px at the built-in offset, so it scales by 2/3 to keep its look.
    expect(ruleBody(result, 'tooltip-content')).toContain(
      'calc(var(--shadow-x)*0.667)calc(var(--shadow-y)*0.667)',
    )
  })

  it('built-in glass preset reproduces the kit edge and shadow', () => {
    const preset = builtin()
    expect(preset.design.shadowOffsetXPx).toBe(0)
    expect(preset.design.shadowOffsetYPx).toBe(12)
    expect(preset.design.borderWidthPx).toBe(1)
    expect(preset.modes.light.border).toBe('oklch(20.8% 0.040 265.8 / 14%)')
    expect(preset.modes.dark.border).toBe('oklch(96.8% 0.007 247.9 / 14%)')
    expect(glassContrastReport(preset).passes).toBe(true)
  })

  it('opaque border and negative offsets still compile', async () => {
    const preset = withDesign({ shadowOffsetXPx: -16, shadowOffsetYPx: -16 })
    preset.modes.light.border = '#CBD5E1'
    preset.modes.dark.border = '#475569'
    const result = await build(preset)
    expect(ruleBody(result, 'card')).toContain('var(--shadow-x)var(--shadow-y)')
    expect(artifact(result, 'styles/ui-tokens.css').replace(/\s+/g, '')).toContain('--shadow-x:-16px')
    const reference = glassContrastReport(builtin())
    const report = glassContrastReport(preset)
    expect(report.passes).toBe(reference.passes)
    expect(report.pairs).toEqual(reference.pairs)
  })
})
