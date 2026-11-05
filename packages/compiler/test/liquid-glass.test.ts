import { describe, expect, it } from 'vitest'
import postcss, { type Container, type Node } from 'postcss'
import { getCatalog } from '@ombelle/catalog'
import {
  componentsWithStyleSupport,
  type ComponentId,
  type Preset,
} from '@ombelle/contracts'
import { compile, glassContrastPairs, glassContrastReport, glassTints } from '../src/index.js'
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

// The built-in preset is tuned so every declared pair passes at its minimum opacity.
const TUNED_OPACITY = 0.57
const TUNED_LIGHT_MUTED = '#1E293B'
const TUNED_DESTRUCTIVE = { light: '#7F1D1D', dark: '#FECACA' }

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
    const magnitude = 'max(var(--shadow-x),calc(var(--shadow-x)*-1),var(--shadow-y),calc(var(--shadow-y)*-1))'
    expect(ruleBody(result, 'dialog-content')).toContain(
      'calc(var(--shadow-x)*2)calc(var(--shadow-y)*2)calc(' + magnitude + '*4)calc(' + magnitude + '*-1.333)',
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
    // Blur and spread scale from the offset magnitude, so a negative or X-only offset keeps a
    // positive blur and a non-positive spread instead of a hard slab.
    const magnitude = 'max(var(--shadow-x),calc(var(--shadow-x)*-1),var(--shadow-y),calc(var(--shadow-y)*-1))'
    for (const slot of ['card', 'dialog-content', 'popover-content', 'dropdown-menu-content', 'tooltip-content']) {
      const body = ruleBody(result, slot)
      expect(body, slot).toContain('calc(' + magnitude + '*')
      expect(body, slot).toContain('calc(' + magnitude + '*-')
      expect(body, slot).not.toMatch(/calc\(var\(--shadow-y\)\*-?[\d.]+\)(rgb|var\(--glass-glow)/)
    }
    for (const selector of ['[data-slot="button"]', '[data-slot="button"]:not(:disabled):hover']) {
      let shadow = ''
      postcss.parse(artifact(result, 'styles/ui-style.css')).walkRules((rule) => {
        if (rule.parent?.type === 'root' && rule.selectors.map(squash).includes(squash(selector)))
          rule.walkDecls('box-shadow', (d) => { shadow = squash(d.value) })
      })
      expect(shadow, selector).toContain('calc(' + magnitude + '*')
      expect(shadow, selector).toContain('calc(' + magnitude + '*-')
      expect(shadow, selector).not.toMatch(/calc\(var\(--shadow-y\)\*-?[\d.]+\)(rgb|var\(--glass-glow)/)
    }
    const reference = glassContrastReport(builtin())
    const report = glassContrastReport(preset)
    expect(report.passes).toBe(reference.passes)
    expect(report.pairs).toEqual(reference.pairs)
  })
})

describe('liquid-glass Button', () => {
  type Where = 'root' | 'supports' | 'reduced' | 'forced' | 'supports-forced'
  const where = (rule: postcss.Rule): Where => {
    const chain: string[] = []
    for (let p = rule.parent as Container | undefined; p && p.type !== 'root'; p = p.parent as Container | undefined)
      if (p.type === 'atrule') chain.unshift(normalize((p as postcss.AtRule).name + ' ' + (p as postcss.AtRule).params))
    const key = chain.join('|')
    if (key === '') return 'root'
    if (key === normalize(supportsCondition.slice(1))) return 'supports'
    if (key.endsWith('media (prefers-reduced-transparency: reduce)')) return 'reduced'
    if (key === 'media (forced-colors: active)') return 'forced'
    return 'supports-forced'
  }
  /** Squashed declarations of every rule with exactly this selector in this context. */
  const decls = (css: string, selector: string, at: Where = 'root') => {
    const out: Record<string, string> = {}
    postcss.parse(css).walkRules((rule) => {
      if (where(rule) !== at || !rule.selectors.map(squash).includes(squash(selector))) return
      rule.walkDecls((d) => {
        out[d.prop] = squash(d.value)
      })
    })
    return out
  }
  const styleOf = async () => artifact(await build(builtin()), 'styles/ui-style.css')

  it('glass Button is one ink', async () => {
    const result = await build(builtin())
    const css = artifact(result, 'styles/ui-style.css')
    postcss.parse(css).walkRules((rule) => {
      if (!rule.selector.includes('data-slot="button"')) return
      rule.walkDecls('color', (d) => {
        expect(d.value, rule.selector).not.toMatch(/--(primary|destructive|secondary|accent)-foreground/)
      })
    })
    expect(decls(css, '[data-slot="button"]')).toMatchObject({
      color: 'var(--foreground)',
      'font-weight': '600',
    })
    expect(decls(css, '[data-slot="button"][data-variant="default"]')).toMatchObject({
      '--glass-tint': 'var(--primary)',
      '--glass-tint-amount': 'var(--glass-primary-tint)',
      'border-color': 'color-mix(insrgb,var(--primary)55%,transparent)',
    })
    expect(decls(css, '[data-slot="button"][data-variant="destructive"]')).toMatchObject({
      '--glass-tint': 'var(--destructive)',
      '--glass-tint-amount': 'var(--glass-destructive-tint)',
      'border-color': 'color-mix(insrgb,var(--destructive)60%,transparent)',
    })
    // The resting tints are per-mode tokens, so scoped recipes follow their own dark class.
    const tokens = squash(artifact(result, 'styles/ui-tokens.css'))
    const root = tokens.slice(0, tokens.indexOf('}'))
    const dark = tokens.slice(tokens.indexOf('.dark{'), tokens.indexOf('}', tokens.indexOf('.dark{')))
    expect(root).toContain('--glass-primary-tint:18%;')
    expect(root).toContain('--glass-destructive-tint:16%;')
    expect(dark).toContain('--glass-primary-tint:22%;')
    expect(dark).toContain('--glass-destructive-tint:20%;')
    // Hover adds 8 tint points.
    expect(decls(css, '[data-slot="button"][data-variant="default"]:not(:disabled):hover')).toMatchObject({
      '--glass-tint-amount': 'calc(var(--glass-primary-tint)+8%)',
    })
    expect(decls(css, '[data-slot="button"][data-variant="destructive"]:not(:disabled):hover')).toMatchObject({
      '--glass-tint-amount': 'calc(var(--glass-destructive-tint)+8%)',
    })
    // One shared surface rule mixes the tint into the card, then applies the glass coverage.
    expect(decls(css, '[data-slot="button"]', 'supports').background).toContain(
      'color-mix(insrgb,color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))calc(var(--glass-inner-opacity,var(--glass-opacity))*100%),transparent)',
    )
    expect(decls(css, '[data-slot="button"][data-variant="link"]')).toMatchObject({
      'text-decoration-color': 'var(--primary)',
      'text-decoration-thickness': '2px',
    })
    expect(decls(css, '[data-slot="button"][data-variant="default"]', 'forced')).toMatchObject({
      'border-width': '3px',
    })
    expect(decls(css, '[data-slot="button"][data-variant]', 'forced')).toMatchObject({
      background: 'ButtonFace',
      'border-color': 'ButtonText',
    })
  })

  it('glass Button pairs are declared and pass', () => {
    const specs = [
      { color: 'primary', light: 0.18, dark: 0.22 },
      { color: 'primary', light: 0.26, dark: 0.3 },
      { color: 'destructive', light: 0.16, dark: 0.2 },
      { color: 'destructive', light: 0.24, dark: 0.28 },
    ] as const
    for (const tint of specs)
      expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'foreground', tint })
    // Secondary rest and ghost hover are foreground on card glass; secondary hover adds a 6%
    // foreground tint to card glass, and outline hover to background glass at 60% coverage.
    const neutral = { color: 'foreground', light: 0.06, dark: 0.06 } as const
    expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'foreground' })
    expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'foreground', tint: neutral })
    expect(glassContrastPairs).toContainEqual({ surface: 'background', text: 'foreground', tint: neutral, coverage: 0.6 })
    // The tint fractions follow the emitted tokens.
    expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'foreground', tint: { color: 'primary', ...glassTints.primary } })
    expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'foreground', tint: { color: 'destructive', ...glassTints.destructive } })
    const report = glassContrastReport(builtin())
    const tinted = report.pairs.filter((p) => p.tint !== undefined)
    expect(tinted).toHaveLength(12)
    for (const pair of report.pairs) expect(pair.passes, JSON.stringify(pair)).toBe(true)
    expect(report.passes).toBe(true)
    expect(report.minimumOpacityByMode).toEqual({ light: 0.57, dark: 0.4 })
    expect(report.nestedOpacity).toEqual({ light: 0.69, dark: 0.92 })
  })

  it('glass link keeps 6px inline padding at every size', async () => {
    const css = await styleOf()
    // The link rule must out-rank the size rules, which come later at equal specificity.
    for (const size of ['sm', 'lg'])
      expect(decls(css, '[data-slot="button"][data-variant="link"][data-size="' + size + '"]'), size).toMatchObject({
        'padding-inline': '0.375rem',
      })
    let sizeIndex = -1
    let linkIndex = -1
    postcss.parse(css).walkRules((rule) => {
      if (where(rule) !== 'root') return
      const selectors = rule.selectors.map(squash)
      if (selectors.includes('[data-slot="button"][data-size="lg"]')) sizeIndex = rule.source!.start!.offset
      if (selectors.includes('[data-slot="button"][data-variant="link"][data-size="lg"]')) linkIndex = rule.source!.start!.offset
    })
    expect(linkIndex).toBeGreaterThan(sizeIndex)
  })

  it('reduced transparency paints the tinted Button opaque', async () => {
    const css = await styleOf()
    const reduced = decls(css, '[data-slot="button"]', 'reduced')
    expect(reduced['backdrop-filter']).toBe('none')
    expect(reduced['-webkit-backdrop-filter']).toBe('none')
    expect(reduced.background).toBe('color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--card))')
    // The fallback without backdrop-filter is the same opaque tinted surface.
    expect(decls(css, '[data-slot="button"]').background).toBe(reduced.background)
  })
  it('fields are background glass with a declared placeholder pair', async () => {
    const css = await styleOf()
    const glassField = decls(css, '[data-slot="input"]', 'supports')
    expect(glassField.background).toContain('color-mix(insrgb,whitecalc(var(--glass-sheen)*60%),transparent)')
    expect(glassField.background).toContain(
      'color-mix(insrgb,var(--background)calc(var(--glass-inner-opacity,calc(var(--glass-opacity)*0.55))*100%),transparent)',
    )
    expect(glassField['backdrop-filter']).toContain('var(--glass-inner-filter,')
    // The value is foreground on the field; the opaque baselines are the background token.
    expect(decls(css, '[data-slot="input"]')).toMatchObject({
      background: 'var(--background)',
      color: 'var(--foreground)',
      border: 'var(--border-width)solidvar(--input)',
    })
    expect(decls(css, '[data-slot="input"]', 'reduced').background).toBe('var(--background)')
    expect(decls(css, '[data-slot="input"]', 'supports-forced').background).toBe('Field')
    expect(decls(css, '[data-slot="input"]', 'forced').color).toBe('FieldText')
    // States: ring and ring-coloured border on focus, 2px destructive when invalid, dashed at 50% when disabled.
    expect(decls(css, '[data-slot="input"]:focus-visible')).toMatchObject({
      'border-color': 'var(--ring)',
      outline: '3pxsolidvar(--ring)',
      'outline-offset': '2px',
    })
    expect(decls(css, '[data-slot="input"][aria-invalid="true"]')).toMatchObject({
      'border-color': 'var(--destructive)',
      'border-width': 'max(var(--border-width),2px)',
    })
    expect(decls(css, '[data-slot="input"]:disabled')).toMatchObject({ 'border-style': 'dashed', opacity: '0.5' })

    // Field value and placeholder are bounded at the field's 55% coverage; error text on card glass.
    expect(glassContrastPairs).toContainEqual({ surface: 'background', text: 'foreground', coverage: 0.55 })
    expect(glassContrastPairs).toContainEqual({ surface: 'background', text: 'mutedForeground', coverage: 0.55 })
    expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'destructive' })
    // Outline Buttons are background glass at 60%, at rest and with the 6% hover tint; nested, both paint at the full nested opacity.
    expect(decls(css, '[data-slot="button"][data-variant="outline"]', 'supports').background).toContain(
      'color-mix(insrgb,color-mix(insrgb,var(--glass-tint)var(--glass-tint-amount),var(--background))calc(var(--glass-inner-opacity,calc(var(--glass-opacity)*0.6))*100%),transparent)',
    )
    const neutral = { color: 'foreground', light: 0.06, dark: 0.06 } as const
    expect(glassContrastPairs).toContainEqual({ surface: 'background', text: 'foreground', coverage: 0.6 })
    expect(glassContrastPairs).toContainEqual({ surface: 'background', text: 'foreground', tint: neutral, coverage: 0.6 })
    expect(glassContrastPairs).not.toContainEqual({ surface: 'background', text: 'foreground', tint: neutral })

    const preset = builtin()
    const report = glassContrastReport(preset)
    for (const pair of report.pairs) expect(pair.passes, JSON.stringify(pair)).toBe(true)
    expect(report.passes).toBe(true)
    expect(preset.design.glassOpacity).toBe(report.minimumOpacity)
    expect(preset.design.glassOpacity).toBe(TUNED_OPACITY)
    expect(preset.modes.light.mutedForeground).toBe(TUNED_LIGHT_MUTED)
    expect(preset.modes.light.destructive).toBe(TUNED_DESTRUCTIVE.light)
    expect(preset.modes.dark.destructive).toBe(TUNED_DESTRUCTIVE.dark)
    expect(report.minimumOpacityByMode).toEqual({ light: 0.57, dark: 0.4 })
    expect(report.nestedOpacity).toEqual({ light: 0.69, dark: 0.92 })
  })
})
