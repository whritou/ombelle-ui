import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import postcss, { type Container, type Node } from 'postcss'
import { getCatalog, glassControlSlots, glassHaloSelector, glassHostedSlots, glassMarkSlots, glassSurfaceSlots } from '@ombelle/catalog'
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
const TUNED_DARK_MUTED = '#E2E8F0'
const TUNED_DESTRUCTIVE = { light: '#7F1D1D', dark: '#FECACA' }

const normalize = (css: string) =>
  css.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')

describe('liquid-glass compile', () => {
  it('compiles the twenty-three experimental components', async () => {
    expect([...experimental].sort()).toEqual(['accordion', 'alert', 'avatar', 'badge', 'button', 'card', 'checkbox', 'dialog', 'dropdown-menu', 'input', 'label', 'native-select', 'popover', 'progress', 'radio-group', 'select', 'separator', 'skeleton', 'switch', 'table', 'tabs', 'textarea', 'tooltip'])
    const preset = builtin()
    const result = await build(preset)
    expect(
      result.artifacts.filter((a) => a.kind === 'style').map((a) => a.logicalPath),
    ).toEqual([
      'components/ui/accordion.css',
      'components/ui/alert.css',
      'components/ui/avatar.css',
      'components/ui/badge.css',
      'components/ui/card.css',
      'components/ui/checkbox.css',
      'components/ui/dropdown-menu.css',
      'components/ui/label.css',
      'components/ui/native-select.css',
      'components/ui/popover.css',
      'components/ui/progress.css',
      'components/ui/radio-group.css',
      'components/ui/select.css',
      'components/ui/separator.css',
      'components/ui/skeleton.css',
      'components/ui/switch.css',
      'components/ui/table.css',
      'components/ui/tabs.css',
      'components/ui/textarea.css',
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

  // Every component is experimental in glass, so no component can be refused; Task C4 replaces the refusal tests.
  it('has no unavailable component left to refuse', () => {
    expect(unavailable).toEqual([])
  })

  it('reduced transparency emits opaque tokens', async () => {
    const result = await build(withDesign({ transparency: 'reduced', glassOpacity: 0.6 }))
    const tokens = artifact(result, 'styles/ui-tokens.css').replace(/\s+/g, '')
    expect(tokens).toContain('--glass-blur:0px;')
    expect(tokens).toContain('--glass-opacity:1;')
  })

  // The bound evaluates every pair opaque under transparency "reduced", so the CSS must paint every glass surface
  // opaque: covered surfaces read --glass-inner-opacity before their coverage fallback, so it is pinned at the root.
  it('reduced transparency paints every covered and nested surface opaque, with no filter or sheen', async () => {
    const preset = withDesign({ transparency: 'reduced', glassOpacity: 0.6 })
    expect(glassContrastReport(preset).passes).toBe(true)
    const result = await build(preset)
    const tokens = squash(artifact(result, 'styles/ui-tokens.css'))
    const block = (selector: string) => {
      const start = tokens.indexOf(selector + '{') + selector.length + 1
      return Object.fromEntries(
        tokens.slice(start, tokens.indexOf('}', start)).split(';').filter(Boolean)
          .map((d) => [d.slice(0, d.indexOf(':')), d.slice(d.indexOf(':') + 1)]),
      ) as Record<string, string>
    }
    const light = block(':root')
    const dark = { ...light, ...block('.dark') }
    expect(light).toMatchObject({
      '--glass-inner-opacity': '1',
      '--glass-inner-filter': 'none',
      '--glass-nested-opacity': '1',
      '--glass-film-backing': '1',
    })
    expect(dark['--glass-nested-opacity']).toBe('1')
    // Resolve var() with fallbacks, as the cascade does.
    const resolve = (value: string, env: Record<string, string>): string => {
      let out = value
      for (let i = out.lastIndexOf('var('); i !== -1; i = out.lastIndexOf('var(')) {
        let depth = 0
        let end = i + 3
        let comma = -1
        for (; end < out.length; end++) {
          if (out[end] === '(') depth++
          else if (out[end] === ')' && --depth === 0) break
          else if (out[end] === ',' && depth === 1 && comma === -1) comma = end
        }
        const name = out.slice(i + 4, comma === -1 ? end : comma).trim()
        const fallback = comma === -1 ? undefined : out.slice(comma + 1, end).trim()
        const replacement =
          name in env ? resolve(env[name]!, env) : name.startsWith('--glass') ? (fallback ?? '') : '#000'
        out = out.slice(0, i) + replacement + out.slice(end + 1)
      }
      return out
    }
    // Every calc(... * 100%) evaluates to a fraction of the whole token.
    const fractions = (value: string) => {
      const out: number[] = []
      for (const match of value.matchAll(/calc\(/g)) {
        let depth = 0
        let end = match.index!
        for (; end < value.length; end++) {
          if (value[end] === '(') depth++
          else if (value[end] === ')' && --depth === 0) break
        }
        const body = value.slice(match.index! + 5, end)
        if (!/\*\s*100%$/.test(body.trim())) continue
        const expression = body.trim().replace(/\*\s*100%$/, '').replaceAll('calc', '')
        expect(expression, value).toMatch(/^[\d.\s*+\-()]+$/)
        out.push(Function('return ' + expression)() as number)
      }
      return out
    }
    const sheets = result.artifacts.filter((a) => a.kind === 'style' && a.logicalPath !== 'styles/ui-tokens.css')
    let surfaces = 0
    for (const env of [light, dark])
      // Top level, and nested in a glass Card, Dialog or Tooltip, which re-point the inner values.
      for (const nested of [false, true]) {
        const scope = nested
          ? { ...env, '--glass-inner-opacity': 'var(--glass-nested-opacity)', '--glass-inner-filter': 'none' }
          : env
        for (const sheet of sheets)
          postcss.parse(sheet.content).walkDecls((d) => {
            const raw = squash(d.value)
            if (d.prop === 'background' && /--glass-(inner-opacity|opacity|film-backing)/.test(raw)) {
              surfaces++
              const resolved = resolve(raw, scope)
              for (const sheen of raw.match(/calc\(var\(--glass-sheen\)\*\d+%\)/g) ?? [])
                expect(resolve(sheen, scope), sheet.logicalPath).toBe('calc(0*' + sheen.match(/(\d+%)\)$/)![1] + ')')
              // The Skeleton film's literal sheen fades with its backing.
              if (raw.includes('(1-var(--glass-film-backing,0))')) expect(resolved).toContain('calc((1-1)*35%)')
              const coverage = fractions(resolved.replace(/calc\(0\*\d+%\)/g, ''))
              expect(coverage.length, sheet.logicalPath + ' ' + raw).toBeGreaterThan(0)
              for (const c of coverage) expect(c, sheet.logicalPath + ' ' + raw).toBe(1)
            }
            if (d.prop.endsWith('backdrop-filter') && raw.includes('--glass-inner-filter'))
              expect(resolve(raw, scope), sheet.logicalPath).toBe('none')
          })
      }
    expect(surfaces).toBeGreaterThan(40)
    // The built-in preset keeps its translucent tokens: none of the reduced pins are emitted.
    const builtinTokens = artifact(await build(builtin()), 'styles/ui-tokens.css')
    for (const pin of ['--glass-inner-opacity', '--glass-inner-filter', '--glass-film-backing'])
      expect(builtinTokens).not.toContain(pin)
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
      /^Liquid glass text contrast fails in (light|dark) for \w+ on \w+( tinted \w+ \d+%)?( at \d+% coverage)?: \d+\.\d+:1 (over the (darkest|brightest) filtered backdrop|on the opaque fallback surface)\. Minimum passing glassOpacity is 0\.\d+\. See "Upgrading from 0\.4\.x" in docs\/components\/liquid-glass\.md\.$/,
    )
  })

  it("names the failing pair's tint and coverage and points a 0.4.x preset to the upgrade note", async () => {
    // The values a 0.4.x init saved into ui-preset.json.
    const saved = withDesign({ glassOpacity: 0.5 })
    saved.modes.light.mutedForeground = '#334155'
    saved.modes.light.destructive = '#B91C1C'
    saved.modes.dark.destructive = '#FCA5A5'
    const error = await build(saved, ['button']).catch((e) => e)
    expect(error).toMatchObject({ code: 'INVALID_DATA', path: '/design/glassOpacity' })
    expect(error.message).toBe(
      'Liquid glass text contrast fails in light for mutedForeground on background at 55% coverage: 2.98:1 over the darkest filtered backdrop. ' +
        'Minimum passing glassOpacity is 0.93. See "Upgrading from 0.4.x" in docs/components/liquid-glass.md.',
    )
    // A tinted pair names its tint, and a tinted pair at partial coverage names both.
    const tinted = builtin()
    tinted.modes.dark.primary = '#D0D0D0'
    const tintError = await build(tinted, ['button']).catch((e) => e)
    expect(tintError.message).toMatch(
      /^Liquid glass text contrast fails in dark for mutedForeground on card tinted primary 22% at 78% coverage: \d+\.\d+:1 over the brightest filtered backdrop\. Minimum passing glassOpacity is 0\.64\. See "Upgrading from 0\.4\.x" in docs\/components\/liquid-glass\.md\.$/,
    )
    const hover = builtin()
    hover.modes.dark.primary = '#FFFFFF'
    const hoverError = await build(hover, ['button']).catch((e) => e)
    expect(hoverError.message).toMatch(
      /^Liquid glass text contrast fails in dark for foreground on card tinted primary 30%: \d+\.\d+:1 [^.]+\. Raise contrast between foreground and card; no glassOpacity passes\. See "Upgrading from 0\.4\.x" in docs\/components\/liquid-glass\.md\.$/,
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

  // --glass-tint inherits: a selected table row or an open accordion trigger sets 12% primary, which would reach a
  // nested Button, Avatar, Switch or Select item if it read the variable without setting it. Every rule that reads
  // the tint therefore sits on an element that sets it itself, in the same selector or in its bare data-slot rule.
  it('never reads an inherited glass tint', async () => {
    const result = await build(builtin())
    const setters = new Set<string>()
    const readers: string[] = []
    for (const sheet of result.artifacts.filter((a) => a.kind === 'style'))
      postcss.parse(sheet.content).walkRules((rule) => {
        const sets = rule.nodes.some((n) => n.type === 'decl' && n.prop === '--glass-tint')
        const reads = rule.nodes.some((n) => n.type === 'decl' && n.prop !== '--glass-tint' && n.value.includes('var(--glass-tint'))
        for (const selector of rule.selectors.map(squash)) {
          if (sets) setters.add(selector)
          if (reads) readers.push(sheet.logicalPath + ' ' + selector)
        }
      })
    expect(readers.length).toBeGreaterThan(10)
    for (const reader of readers) {
      const selector = reader.split(' ')[1]!
      const subject = selector.split(/[>+~]/).at(-1)!
      const slot = subject.match(/^\[data-slot="[^"]+"\]/)?.[0]
      expect(setters.has(selector) || (slot !== undefined && setters.has(slot)), reader).toBe(true)
    }
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
    expect(tinted).toHaveLength(24)
    for (const pair of report.pairs) expect(pair.passes, JSON.stringify(pair)).toBe(true)
    expect(report.passes).toBe(true)
    expect(report.minimumOpacityByMode).toEqual({ light: 0.57, dark: 0.57 })
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
    expect(preset.modes.dark.mutedForeground).toBe(TUNED_DARK_MUTED)
    expect(preset.modes.light.destructive).toBe(TUNED_DESTRUCTIVE.light)
    expect(preset.modes.dark.destructive).toBe(TUNED_DESTRUCTIVE.dark)
    expect(report.minimumOpacityByMode).toEqual({ light: 0.57, dark: 0.57 })
    expect(report.nestedOpacity).toEqual({ light: 0.69, dark: 0.92 })
  })
  it('glass selection pairs are declared and pass', () => {
    const rest = { color: 'primary', light: 0.18, dark: 0.22 } as const
    const checked = { color: 'primary', light: 0.26, dark: 0.3 } as const
    // Checked boxes, checked radios and on switches reuse the Button hover tint; checked rows the rest tint.
    expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'foreground', tint: checked })
    expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'foreground', tint: rest })
    // The check mark and radio dot sit on the checked control at 80% coverage.
    expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'foreground', tint: checked, coverage: 0.8 })
    // Unchecked option rows are the field surface, so the field pairs at 55% bound their label and description;
    // checked rows are the rest tint at 78%, the lowest coverage at which their text passes.
    expect(glassContrastPairs).toContainEqual({ surface: 'background', text: 'foreground', coverage: 0.55 })
    expect(glassContrastPairs).toContainEqual({ surface: 'background', text: 'mutedForeground', coverage: 0.55 })
    expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'foreground', tint: rest, coverage: 0.78 })
    expect(glassContrastPairs).toContainEqual({ surface: 'card', text: 'mutedForeground', tint: rest, coverage: 0.78 })
    expect(glassContrastPairs.filter((p) => p.coverage === 0.4 || p.coverage === 0.7)).toEqual([])
    const report = glassContrastReport(builtin())
    const selection = report.pairs.filter(
      (p) => p.tint?.color === 'primary' || p.coverage === 0.55,
    )
    // With the Table selected row and open Accordion trigger (primary 12%) in both modes.
    expect(selection).toHaveLength(20)
    for (const pair of selection) expect(pair.passes, JSON.stringify(pair)).toBe(true)
  })
  it('declares the Select highlighted option and hint pairs and they pass', () => {
    const rest = { color: 'primary', light: 0.18, dark: 0.22 } as const
    // Highlighted options tint the popover glass, under both the option text and its hint;
    // the disabled option's mutedForeground is already declared on the untinted popover.
    expect(glassContrastPairs).toContainEqual({ surface: 'popover', text: 'foreground', tint: rest })
    expect(glassContrastPairs).toContainEqual({ surface: 'popover', text: 'mutedForeground', tint: rest })
    expect(glassContrastPairs).toContainEqual({ surface: 'popover', text: 'mutedForeground' })
    const report = glassContrastReport(builtin())
    const pairs = report.pairs.filter((p) => p.surface === 'popover' && p.tint?.color === 'primary')
    expect(pairs).toHaveLength(4)
    for (const pair of pairs) expect(pair.passes, JSON.stringify(pair)).toBe(true)
    expect(report.minimumOpacityByMode).toEqual({ light: 0.57, dark: 0.57 })
    expect(report.nestedOpacity).toEqual({ light: 0.69, dark: 0.92 })
  })
  it('declares plain Select item text, foreground on the untinted popover, and it passes', () => {
    // Select items are var(--foreground) on the popover glass list; popoverForeground alone does not bound them.
    expect(glassContrastPairs).toContainEqual({ surface: 'popover', text: 'foreground' })
    const report = glassContrastReport(builtin())
    const pairs = report.pairs.filter((p) => p.surface === 'popover' && p.text === 'foreground' && !p.tint && p.coverage === undefined)
    expect(pairs.map((p) => p.mode)).toEqual(['light', 'dark'])
    for (const pair of pairs) expect(pair.passes, JSON.stringify(pair)).toBe(true)
    expect(report.minimumOpacityByMode).toEqual({ light: 0.57, dark: 0.57 })
    expect(report.nestedOpacity).toEqual({ light: 0.69, dark: 0.92 })
  })
})

describe('liquid glass material tokens', () => {
  const tokensOf = async (preset: Preset) =>
    artifact(await build(preset, ['button']), 'styles/ui-tokens.css')
  const block = (css: string, selector: string) => {
    const start = css.indexOf(selector + ' {')
    return css.slice(start, css.indexOf('}', start)).replace(/\s+/g, '')
  }

  it('a preset without material settings keeps byte-identical tokens', async () => {
    const css = await tokensOf(builtin())
    // Recorded on main before the material settings existed.
    expect(createHash('sha256').update(css).digest('hex')).toBe('b4bb4064391a19e314a341d297533fd0f8c5aae4c53dbcc8a9c578b6db76e6a9')
    expect(css).not.toContain('--glass-halo')
  })

  it('material settings become tokens', async () => {
    const material = {
      glassRefraction: 0.5,
      glassRefractionWidth: 0.5 * 0.3,
      glassHalo: 0.5,
      glassDepth: 0.5,
      glassMotion: 0.5,
      glassDispersion: 0.5,
      // With the material on, the bound counts the pointer shine; the built-in then needs 0.79.
      glassOpacity: 0.8,
    }
    const root = block(await tokensOf(withDesign(material)), ':root')
    expect(root).toContain('--glass-halo:0.5;')
    expect(root).toContain('--glass-depth:0.5;')
    expect(root).toContain('--glass-motion:0.5;')
    expect(root).toContain('--glass-dispersion:0.5;')
    expect(root).toContain('--glass-refraction-width:0.15;')
    expect(root).toContain('--glass-refraction-strength:0.0725;')
    expect(root).not.toContain('--glass-drop')
    const reduced = block(await tokensOf(withDesign({ ...material, glassBackdropContrast: 1.25, transparency: 'reduced' })), ':root')
    expect(reduced).toContain('--glass-halo:0;')
    expect(reduced).toContain('--glass-refraction-strength:0;')
    expect(reduced).toContain('--glass-dispersion:0;')
    expect(reduced).toContain('--glass-depth:0.5;')
    // Opaque, so the bound passes at any contrast; the extra drop shadow still follows it.
    expect(reduced).toContain('--glass-drop:0.1363;')
  })

  it('extremes compile and the bound reports', async () => {
    const preset = withDesign({
      glassBackdropContrast: 1.6,
      glassRefraction: 1,
      glassRefractionWidth: 0.3,
      glassHalo: 1,
      glassDepth: 1,
      glassMotion: 1,
      glassDispersion: 1,
    })
    const report = glassContrastReport(preset)
    for (const pair of report.pairs) {
      expect(Number.isFinite(pair.ratioOverBlack) && Number.isFinite(pair.ratioOverWhite)).toBe(true)
    }
    await build(preset).catch((error) => {
      expect(error.code).toBe('INVALID_DATA')
    })
  })
})

describe('liquid glass shared material', () => {
  const familyRoot = async (preset: Preset = builtin()) => postcss.parse(artifact(await build(preset), 'styles/ui-style.css'))
  const material = /var\(--glass-(depth|dispersion|halo|motion|drop|material)(?![-\w])([^)]*)\)/g
  const inside = (node: Node, name: string, params?: RegExp) => {
    for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent)
      if (parent.type === 'atrule' && (parent as postcss.AtRule).name === name && (!params || params.test((parent as postcss.AtRule).params))) return true
    return false
  }

  it('every material layer is scaled by a token that falls back to 0', async () => {
    const root = await familyRoot()
    let reads = 0
    root.walkDecls((decl) => {
      for (const match of decl.value.matchAll(material)) {
        reads++
        expect(squash(match[2]!), decl.toString()).toBe(',0')
      }
    })
    expect(reads).toBeGreaterThan(5)
    root.walkRules((rule) => {
      if (!rule.nodes.some((n) => n.type === 'decl' && n.value.includes('--glass-halo'))) return
      for (const selector of rule.selectors) expect(selector).toContain('[data-halo-active]')
    })
  })

  it('recipes reach their slots', async () => {
    const root = await familyRoot()
    const rulesFor = (slot: string) => {
      const found: postcss.Rule[] = []
      root.walkRules((rule) => {
        if (rule.selectors.some((s) => squash(s).startsWith('[data-slot="' + slot + '"]'))) found.push(rule)
      })
      return found
    }
    for (const slot of [...glassSurfaceSlots, ...glassControlSlots]) {
      if ((glassHostedSlots as readonly string[]).includes(slot)) continue
      expect(glassHaloSelector).toContain('[data-slot="' + slot + '"]')
      expect(rulesFor(slot).some((r) => r.selectors.some((s) => s.includes('::after')) && r.toString().includes('--glass-halo')), slot).toBe(true)
    }
    for (const slot of glassMarkSlots) {
      expect(glassHaloSelector).not.toContain('[data-slot="' + slot + '"]')
      expect(rulesFor(slot).some((r) => r.toString().includes('--glass-halo')), slot).toBe(false)
    }
    const moves = (slot: string, state: string, prop: string) =>
      rulesFor(slot).some((r) => !inside(r, 'media') && r.selectors.some((s) => s.includes(state)) && r.nodes.some((n) => n.type === 'decl' && n.prop === prop && n.value.includes('--glass-motion')))
    for (const slot of ['button', 'select-trigger']) {
      expect(moves(slot, ':active', 'scale'), slot).toBe(false)
      expect(moves(slot, ':hover', 'translate'), slot).toBe(false)
    }
    root.walkDecls((decl) => {
      if (!inside(decl, 'media', /prefers-reduced-motion/)) return
      expect(decl.value.includes('--glass-motion') && (decl.prop === 'translate' || decl.prop === 'scale'), decl.toString()).toBe(false)
      expect(decl.value).not.toContain('--pointer-x')
    })
    let pseudoOff = 0
    root.walkRules((rule) => {
      if (!inside(rule, 'media', /forced-colors/)) return
      if (rule.selectors.some((s) => s.includes('::before') || s.includes('::after')) && rule.toString().includes('content: none')) pseudoOff++
    })
    expect(pseudoOff).toBeGreaterThan(0)
  })
})

describe('liquid glass material review fixes', () => {
  const familyRoot = async (preset: Preset = builtin()) => postcss.parse(artifact(await build(preset), 'styles/ui-style.css'))
  const insideAt = (node: Node, name: string, params?: RegExp) => {
    for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent)
      if (parent.type === 'atrule' && (parent as postcss.AtRule).name === name && (!params || params.test((parent as postcss.AtRule).params))) return true
    return false
  }
  const overflowSlots = ['dialog-content', 'popover-content', 'dropdown-menu-content', 'dropdown-menu-sub-content', 'select-content', 'table-container', 'accordion']

  it('counts the pointer shine in the bound when a material setting is on', () => {
    const plain = glassContrastReport(builtin())
    const lit = glassContrastReport(withDesign({ glassHalo: 0.5 }))
    const pick = (r: typeof plain) => r.pairs.find((p) => p.mode === 'dark' && p.surface === 'card' && p.text === 'cardForeground' && !p.tint && p.coverage === undefined)!
    expect(pick(lit).ratioOverWhite).toBeLessThan(pick(plain).ratioOverWhite)
  })

  it('writes the material flag only when a material setting is above 0', async () => {
    const zeros = { glassHalo: 0, glassDepth: 0, glassMotion: 0, glassDispersion: 0, glassRefraction: 0, glassRefractionWidth: 0 }
    const tokens = artifact(await build(withDesign(zeros), ['button']), 'styles/ui-tokens.css')
    expect(tokens).not.toContain('--glass-material')
    expect(glassContrastReport(withDesign(zeros))).toEqual(glassContrastReport(builtin()))
  })

  it('keeps relief light within 3px of the rim', async () => {
    const root = await familyRoot()
    let insets = 0
    root.walkDecls((decl) => {
      if (!decl.value.includes('--glass-depth') && !decl.value.includes('--glass-dispersion')) return
      const shadows: string[] = []
      let depth = 0
      let start = 0
      for (let i = 0; i < decl.value.length; i++) {
        const c = decl.value[i]
        if (c === '(') depth++
        else if (c === ')') depth--
        else if (c === ',' && depth === 0) {
          shadows.push(decl.value.slice(start, i))
          start = i + 1
        }
      }
      shadows.push(decl.value.slice(start))
      for (const shadow of shadows) {
        const parts = shadow.trim().match(/^inset\s+(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?/)
        if (!parts) continue
        insets++
        const [x, y, blur] = parts.slice(1).map(Number)
        expect(Math.max(Math.abs(x!), Math.abs(y!)) + blur!, shadow).toBeLessThanOrEqual(4)
      }
    })
    expect(insets).toBeGreaterThan(3)
  })

  it('puts the material on the host shadow of scrolling surfaces, with no pseudo layers', async () => {
    const result = await build(builtin())
    const root = postcss.root()
    for (const sheet of result.artifacts.filter((a) => a.kind === 'style')) root.append(postcss.parse(sheet.content).nodes)
    for (const slot of overflowSlots) {
      expect(glassHaloSelector).not.toContain('[data-slot="' + slot + '"]')
      let pseudo = false
      let hosted = false
      root.walkRules((rule) => {
        for (const selector of rule.selectors.map(squash)) {
          if (!selector.startsWith('[data-slot="' + slot + '"]')) continue
          if (selector.includes('::before') || selector.includes('::after')) pseudo = true
          if (rule.nodes.some((n) => n.type === 'decl' && n.prop === 'box-shadow' && n.value.includes('var(--glass-material-shadow'))) hosted = true
        }
      })
      expect(pseudo, slot).toBe(false)
      expect(hosted, slot).toBe(true)
    }
  })

  it('drops the material layers under prefers-reduced-transparency', async () => {
    const root = await familyRoot()
    let off = 0
    root.walkRules((rule) => {
      if (!insideAt(rule, 'media', /prefers-reduced-transparency/)) return
      if (rule.selectors.some((s) => s.includes('::before')) && rule.selectors.some((s) => s.includes('::after')) && rule.toString().includes('content: none')) off++
    })
    expect(off).toBe(1)
  })

  it('layers the layout rules below utilities and moves nothing on press', async () => {
    const root = await familyRoot()
    root.walkDecls((decl) => {
      if (decl.prop === 'isolation' || (decl.prop === 'position' && decl.value === 'relative' && decl.parent && (decl.parent as postcss.Rule).selectors?.length > 3)) {
        expect(insideAt(decl, 'layer', /^components$/), decl.parent!.toString().slice(0, 60)).toBe(true)
      }
      if (decl.prop === 'translate' && decl.value.includes('--glass-motion')) {
        expect(insideAt(decl, 'layer', /^components$/)).toBe(true)
        expect(insideAt(decl, 'media', /hover:\s*hover/)).toBe(true)
      }
      expect(decl.prop === 'scale' && decl.value.includes('--glass-motion'), decl.toString()).toBe(false)
    })
  })

  it('lights recipe and scoped Buttons too', () => {
    expect(glassHaloSelector).toContain('[data-slot="recipe-button"]')
    expect(glassHaloSelector).toContain('[data-slot="scoped-button"]')
  })

  it('resets the pointer position on surfaces that are not lit', async () => {
    const root = await familyRoot()
    let resets = 0
    root.walkRules((rule) => {
      if (rule.selectors.some((s) => s.includes(':not([data-halo-active])')) && rule.toString().includes('--pointer-x')) resets++
    })
    expect(resets).toBe(1)
  })
})
