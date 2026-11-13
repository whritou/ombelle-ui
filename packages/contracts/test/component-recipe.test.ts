import { expect, it } from 'vitest'
import badge from '../../../examples/component-recipe.badge.json'
import button from '../../../examples/recipe.example.json'
import { componentRecipeComponents, componentRecipeFields, defaultRecipeFields, supportedComponentIds, validateComponentRecipe, validateInstallableRecipe } from '../src/index.js'

it('validates Badge and fills its omitted variant', () => {
  expect(validateComponentRecipe({ ...badge, props: {} })).toEqual({
    ...badge, props: { variant: 'default' },
  })
  expect(validateInstallableRecipe(button)).toEqual(button)
})

it('has one versioned recipe definition for every catalog component outside Button', () => {
  expect([...componentRecipeComponents].sort()).toEqual(supportedComponentIds.filter(id => id !== 'button').sort())
})

it.each([
  { content: { label: '   ' } },
  { content: { label: 'x'.repeat(201) } },
  { content: { label: 'Ready', extra: true } },
  { props: { variant: 'unknown' } },
  { props: { className: 'unknown' } },
  { revision: Number.MAX_SAFE_INTEGER + 1 },
])('rejects invalid Badge recipe data %#', (override) => {
  expect(() => validateInstallableRecipe({ ...badge, ...override })).toThrow()
})

it('rejects dangling and duplicate IDs independently of the editor', () => {
  const recipe = { ...badge, component: 'native-select', props: { selection: 'team' },
    content: { label: 'Plan', options: [{ id: 'starter', label: 'Starter' }] } }
  expect(() => validateComponentRecipe(recipe)).toThrow('Choose an item present')
  recipe.content.options.push({ id: 'starter', label: 'Other' })
  expect(() => validateComponentRecipe(recipe)).toThrow('Item IDs must be unique')
})

it('rejects multiple starting items in single expansion mode and nonrectangular tables', () => {
  expect(() => validateComponentRecipe({ ...badge, component: 'accordion',
    props: { type: 'single', expanded: ['one', 'two'] }, content: { items: [
      { id: 'one', label: 'One', body: '' }, { id: 'two', label: 'Two', body: '' },
    ] } })).toThrow('Single expansion accepts at most one item')
  expect(() => validateComponentRecipe({ ...badge, component: 'table', props: {},
    content: { caption: 'Projects', columns: [{ id: 'name', label: 'Name' }, { id: 'owner', label: 'Owner' }],
      rows: [{ id: 'one', cells: ['First'] }] } })).toThrow('Every row must have one cell per column')
})

it('rejects invalid paging, unsafe breadcrumb links and undescribed toast actions', () => {
  expect(() => validateComponentRecipe({ ...badge, component: 'pagination', props: { page: 3, totalPages: 2 },
    content: { label: 'Pages', previous: 'Previous', next: 'Next' } })).toThrow('Current page must not exceed total pages')
  expect(() => validateComponentRecipe({ ...badge, component: 'breadcrumb', props: {}, content: { label: 'Location', items: [
    { id: 'home', label: 'Home', href: 'javascript:alert(1)' }, { id: 'current', label: 'Current', href: '' },
  ] } })).toThrow()
  expect(() => validateComponentRecipe({ ...badge, component: 'breadcrumb', props: {}, content: { label: 'Location', items: [
    { id: 'home', label: 'Home', href: '' }, { id: 'current', label: 'Current', href: '' },
  ] } })).toThrow('Ancestor pages require a link')
  expect(() => validateComponentRecipe({ ...badge, component: 'toast', props: {}, content: {
    title: 'Saved', description: '', action: 'Undo', actionAltText: '', close: 'Dismiss',
  } })).toThrow('Toast actions require an alternative description')
})

it.each([
  ['input-group', { label: 'Website', placeholder: '', initialText: '', addon: '', action: '   ' }],
  ['toast', { title: 'Saved', description: '', action: '   ', actionAltText: 'Undo saving', close: 'Dismiss' }],
])('rejects whitespace-only optional action labels in %s', (component, content) => {
  expect(() => validateComponentRecipe({ ...badge, component, props: {}, content }))
    .toThrow(expect.objectContaining({ path: '/content/action' }))
})

const displayComponents = ['spinner', 'kbd', 'empty', 'field', 'meter', 'stepper'] as const
const draft = (component: (typeof displayComponents)[number], props: Record<string, unknown> = {}, content?: Record<string, unknown>) => ({
  ...badge, component, props,
  content: content ?? defaultRecipeFields(componentRecipeFields(component).content),
})

it.each(displayComponents)('accepts the default %s recipe', component => {
  expect(componentRecipeComponents).toContain(component)
  expect(validateComponentRecipe(draft(component)).component).toBe(component)
})

it.each([
  ['meter', { segments: 1 }],
  ['meter', { warningPercent: 150 }],
  ['meter', { max: 0 }],
  ['stepper', { current: 6 }],
  ['field', { control: 'select' }],
] as const)('rejects %s with %o', (component, props) => {
  expect(() => validateComponentRecipe(draft(component, props))).toThrow()
})

it('rejects a stepper with seven steps or a current step past the last', () => {
  const steps = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `step-${index}`, title: 'Step', description: '' }))
  expect(() => validateComponentRecipe(draft('stepper', {}, { steps: steps(7) }))).toThrow()
  expect(() => validateComponentRecipe(draft('stepper', { current: 3 }, { steps: steps(3) })))
    .toThrow('Choose a step present in the recipe')
})

const formControls = ['slider', 'toggle-group', 'chip', 'tag-input', 'input-otp'] as const
const formDraft = (component: (typeof formControls)[number], props: Record<string, unknown> = {}, content?: Record<string, unknown>) => ({
  ...badge, component, props,
  content: content ?? defaultRecipeFields(componentRecipeFields(component).content),
})

it.each(formControls)('accepts the default %s recipe', component => {
  expect(componentRecipeComponents).toContain(component)
  expect(validateComponentRecipe(formDraft(component)).component).toBe(component)
})

it.each([
  ['slider', { value: 101 }, '/props/value'],
  ['slider', { min: 50, max: 50 }, '/props/max'],
  ['slider', { mode: 'range', rangeStart: 90, rangeEnd: 10 }, '/props/rangeStart'],
  ['slider', { mode: 'range', rangeEnd: 120 }, '/props/rangeEnd'],
  ['toggle-group', { selection: ['year'] }, '/props/selection'],
  ['toggle-group', { type: 'single', selection: ['day', 'week'] }, '/props/selection'],
  ['chip', { selection: ['archived'] }, '/props/selection'],
  ['tag-input', { max: 1 }, '/content/tags'],
  ['input-otp', { length: 4, separatorAfter: 4 }, '/props/separatorAfter'],
] as const)('rejects %s with %o at %s', (component, props, path) => {
  expect(() => validateComponentRecipe(formDraft(component, props))).toThrow(expect.objectContaining({ path }))
})

it.each([
  ['input-otp', { length: 9 }],
  ['toggle-group', { variant: 'pill' }],
] as const)('rejects %s with %o by schema', (component, props) => {
  expect(() => validateComponentRecipe(formDraft(component, props))).toThrow()
})

it('gives every editable item list an id, as the editor adds one to each new item', () => {
  for (const component of componentRecipeComponents)
    for (const [key, field] of Object.entries(componentRecipeFields(component).content))
      if (field.type === 'array' && field.items?.properties)
        expect(Object.keys(field.items.properties), `${component} ${key}`).toContain('id')
})

const overlays = ['combobox', 'command', 'hover-card', 'context-menu'] as const
const overlayDraft = (component: (typeof overlays)[number], props: Record<string, unknown> = {}, content?: Record<string, unknown>) => ({
  ...badge, component, props,
  content: content ?? defaultRecipeFields(componentRecipeFields(component).content),
})
const menuItems = (...kinds: string[]) => kinds.map((kind, index) => ({ id: `item-${index}`, label: 'Item', shortcut: '', kind }))

it.each(overlays)('accepts the default %s recipe', component => {
  expect(componentRecipeComponents).toContain(component)
  expect(validateComponentRecipe(overlayDraft(component)).component).toBe(component)
})

it.each([
  ['combobox', { selection: ['missing'] }, undefined, '/props/selection'],
  ['combobox', { mode: 'single', selection: ['liquid-glass', 'ombelle'] }, undefined, '/props/selection'],
  ['command', {}, { placeholder: 'Search', emptyText: 'None', groups: [{ id: 'empty', heading: 'Empty', items: [] }] }, '/content/groups'],
  ['context-menu', {}, { zoneText: 'Zone', items: menuItems('separator', 'item') }, '/content/items'],
  ['context-menu', {}, { zoneText: 'Zone', items: menuItems('item', 'separator') }, '/content/items'],
  ['context-menu', {}, { zoneText: 'Zone', items: menuItems('separator') }, '/content/items'],
] as const)('rejects %s with %o %o at %s', (component, props, content, path) => {
  expect(() => validateComponentRecipe(overlayDraft(component, props, content))).toThrow(expect.objectContaining({ path }))
})

it('accepts a multiple combobox with several selections', () => {
  expect(validateComponentRecipe(overlayDraft('combobox', { mode: 'multiple', selection: ['liquid-glass', 'ombelle'] })).component).toBe('combobox')
})

const calendarDraft = (props: Record<string, unknown> = {}) => ({
  ...badge, component: 'calendar', props,
  content: defaultRecipeFields(componentRecipeFields('calendar').content),
})

it('accepts the default calendar recipe and a range with an end date', () => {
  expect(componentRecipeComponents).toContain('calendar')
  expect(validateComponentRecipe(calendarDraft()).component).toBe('calendar')
  expect(validateComponentRecipe(calendarDraft({ mode: 'range', selectedFrom: '2026-11-12', selectedTo: '2026-11-18' })).component).toBe('calendar')
})

it.each([
  [{ selectedFrom: '2026-02-30' }, '/props/selectedFrom'],
  [{ mode: 'range', selectedTo: '2026-13-01' }, '/props/selectedTo'],
  [{ mode: 'range', selectedFrom: '2026-11-18', selectedTo: '2026-11-12' }, '/props/selectedTo'],
  [{ mode: 'single', selectedTo: '2026-11-18' }, '/props/selectedTo'],
  [{ mode: 'picker', selectedTo: '2026-11-18' }, '/props/selectedTo'],
] as const)('rejects the calendar recipe %o at %s', (props, path) => {
  expect(() => validateComponentRecipe(calendarDraft(props))).toThrow(expect.objectContaining({ path }))
})

const variantDraft = (component: string, props: Record<string, unknown> = {}) => ({
  ...badge, component, props,
  content: defaultRecipeFields(componentRecipeFields(component as 'badge').content),
})

it.each([
  ['badge', { appearance: 'soft', variant: 'warning' }],
  ['badge', { appearance: 'outline', variant: 'destructive' }],
  ['badge', { variant: 'success' }],
  ['badge', { variant: 'info' }],
  ['alert', { dismissible: true, actions: true, layout: 'compact' }],
  ['card', { mode: 'link' }],
  ['card', { mode: 'options' }],
  ['card', { mode: 'media' }],
  ['avatar', { shape: 'square', overflow: 99 }],
  ['accordion', { appearance: 'flush', icon: 'plus' }],
  ['accordion', { icon: 'family' }],
] as const)('accepts the 0.7.3 %s variant %o', (component, props) => {
  expect(validateComponentRecipe(variantDraft(component, props)).props).toMatchObject(props)
})

it.each([
  ['badge', { appearance: 'raised' }, '/props/appearance'],
  ['avatar', { overflow: 100 }, '/props/overflow'],
  ['avatar', { overflow: -1 }, '/props/overflow'],
  ['card', { mode: 'grid' }, '/props/mode'],
  ['accordion', { icon: 'arrow' }, '/props/icon'],
  ['alert', { layout: 'wide' }, '/props/layout'],
] as const)('rejects the %s variant %o at %s', (component, props, path) => {
  expect(() => validateComponentRecipe(variantDraft(component, props))).toThrow(expect.objectContaining({ path }))
})

it('keeps existing recipes free of the 0.7.3 variant fields', () => {
  for (const component of ['badge', 'alert', 'card', 'avatar', 'accordion'] as const) {
    const props = validateComponentRecipe(variantDraft(component)).props as Record<string, unknown>
    for (const key of ['appearance', 'dismissible', 'actions', 'layout', 'mode', 'shape', 'overflow', 'icon'])
      if (!(component === 'card' && key === 'appearance')) expect(props).not.toHaveProperty(key)
  }
})


const moreDraft = (component: string, props: Record<string, unknown> = {}) => ({
  ...badge, component, props,
  content: defaultRecipeFields(componentRecipeFields(component as 'badge').content),
})

it.each([
  ['tabs', { appearance: 'pills', counts: true }],
  ['table', { stickyHeader: true, sortable: true, actions: true, loading: true }],
  ['input', { size: 'sm' }],
  ['textarea', { size: 'lg' }],
  ['input-group', { clearable: true, counter: true }],
  ['pagination', { layout: 'compact', pageSize: true }],
  ['select', { multiple: true, icons: true }],
  ['toast', { mode: 'promise' }],
  ['toast', { mode: 'stack' }],
  ['sheet', { handle: true, resizable: true }],
] as const)('accepts the 0.7.3 %s variant %o', (component, props) => {
  expect(validateComponentRecipe(moreDraft(component, props)).props).toMatchObject(props)
})

it.each([
  ['input', { size: 'xl' }, '/props/size'],
  ['pagination', { layout: 'wide' }, '/props/layout'],
  ['toast', { mode: 'queue' }, '/props/mode'],
  ['tabs', { appearance: 'chips' }, '/props/appearance'],
] as const)('rejects the %s variant %o at %s', (component, props, path) => {
  expect(() => validateComponentRecipe(moreDraft(component, props))).toThrow(expect.objectContaining({ path }))
})

it('keeps existing 6b and 6c recipes free of the new fields', () => {
  const added = ['counts', 'stickyHeader', 'sortable', 'actions', 'loading', 'size', 'clearable', 'counter', 'layout', 'pageSize', 'multiple', 'icons', 'mode', 'handle', 'resizable']
  for (const component of ['tabs', 'table', 'input', 'textarea', 'input-group', 'pagination', 'toast', 'sheet'] as const) {
    const props = validateComponentRecipe(moreDraft(component)).props as Record<string, unknown>
    // Sheet already had its own size field.
    for (const key of added) if (!(component === 'sheet' && key === 'size')) expect(props, component + ' ' + key).not.toHaveProperty(key)
  }
})

const primitives075 = ['toggle', 'collapsible', 'scroll-area', 'button-group', 'item'] as const
const primitiveDraft = (component: (typeof primitives075)[number], props: Record<string, unknown> = {}, content?: Record<string, unknown>) => ({
  ...badge, component, props,
  content: content ?? defaultRecipeFields(componentRecipeFields(component).content),
})

it.each(primitives075)('accepts the default %s recipe', component => {
  expect(componentRecipeComponents).toContain(component)
  expect(validateComponentRecipe(primitiveDraft(component)).component).toBe(component)
})

it('gives each 0.7.5 primitive the documented defaults', () => {
  const defaults = (component: (typeof primitives075)[number]) => ({
    props: defaultRecipeFields(componentRecipeFields(component).props),
    content: defaultRecipeFields(componentRecipeFields(component).content),
  })
  expect(defaults('toggle')).toEqual({ props: { variant: 'default', size: 'default', iconOnly: false, pressed: true }, content: { label: 'Show grid' } })
  expect(defaults('collapsible')).toEqual({ props: { defaultOpen: true }, content: { label: 'Advanced shadow', rows: ['Offset X', 'Offset Y'] } })
  expect(defaults('scroll-area')).toEqual({ props: { orientation: 'vertical', height: 200 }, content: { label: 'Components', itemCount: 12 } })
  expect(defaults('button-group')).toEqual({ props: { mode: 'split', orientation: 'horizontal' }, content: { label: 'Install actions', items: ['Install', 'More install options'] } })
  expect(defaults('item')).toEqual({
    props: { variant: 'outline', size: 'default', media: 'icon', actions: true },
    content: { title: 'Ombelle', description: 'Built-in · stable in light and dark' },
  })
})

it.each([
  ['toggle', { iconOnly: true }, { label: '' }, '/content/label'],
  // A text toggle with no label would compile to a button with no name.
  ['toggle', {}, { label: '' }, '/content/label'],
  ['toggle', { iconOnly: false }, { label: '  ' }, '/content/label'],
  ['button-group', {}, { label: '' }, '/content/label'],
  ['button-group', {}, { label: '   ' }, '/content/label'],
  ['scroll-area', {}, { label: '' }, '/content/label'],
  ['button-group', { mode: 'split' }, { items: ['Install'] }, '/content/items'],
] as const)('rejects %s with %o and %o at %s', (component, props, content, path) => {
  const base = defaultRecipeFields(componentRecipeFields(component).content)
  expect(() => validateComponentRecipe(primitiveDraft(component, props, { ...base, ...content })))
    .toThrow(expect.objectContaining({ path }))
})

it('accepts a labelled toggle, and a one-item toolbar group', () => {
  expect(validateComponentRecipe(primitiveDraft('toggle', {}, { label: 'Bold' })).component).toBe('toggle')
  expect(validateComponentRecipe(primitiveDraft('button-group', { mode: 'toolbar' }, { label: 'Tools', items: ['Bold'] })).component).toBe('button-group')
})

it.each([
  ['collapsible', { content: { rows: [] } }],
  ['collapsible', { content: { rows: Array(7).fill('Row') } }],
  ['scroll-area', { props: { height: 100 } }],
  ['scroll-area', { content: { itemCount: 3 } }],
  ['button-group', { content: { items: [] } }],
  ['button-group', { content: { items: Array(6).fill('Action') } }],
  ['item', { props: { media: 'video' } }],
  ['toggle', { props: { size: 'xl' } }],
] as const)('rejects the %s recipe %o by schema', (component, override) => {
  const base = primitiveDraft(component)
  const recipe = { ...base, props: { ...base.props, ...('props' in override ? override.props : {}) },
    content: { ...base.content, ...('content' in override ? override.content : {}) } }
  expect(() => validateComponentRecipe(recipe)).toThrow()
})

it('names the 0.7.5 appearance parts', async () => {
  const { componentRecipeParts } = await import('../src/component-recipe-appearance.js')
  const slots = (id: (typeof primitives075)[number]) => componentRecipeParts[id].map(part => part.slot)
  expect(slots('toggle')).toEqual(['toggle'])
  expect(slots('collapsible')).toEqual(['collapsible-trigger', 'collapsible-content'])
  expect(slots('scroll-area')).toEqual(['scroll-area', 'scroll-area-thumb'])
  expect(slots('button-group')).toEqual(['button-group'])
  expect(slots('item')).toEqual(['item', 'item-media'])
})

const editorInputs075 = ['number-input', 'color-picker'] as const
const editorInputDraft = (component: (typeof editorInputs075)[number], props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) => ({
  ...badge, component,
  props: { ...defaultRecipeFields(componentRecipeFields(component).props), ...props },
  content: { ...defaultRecipeFields(componentRecipeFields(component).content), ...content },
})

it.each(editorInputs075)('accepts the default %s recipe', component => {
  expect(componentRecipeComponents).toContain(component)
  expect(validateComponentRecipe(editorInputDraft(component)).component).toBe(component)
})

it('gives Number Input and Color Picker the board defaults', () => {
  const defaults = (component: (typeof editorInputs075)[number]) => ({
    props: defaultRecipeFields(componentRecipeFields(component).props),
    content: defaultRecipeFields(componentRecipeFields(component).content),
  })
  expect(defaults('number-input')).toEqual({
    props: { min: 0, max: 32, step: 1, unit: 'px', value: 12 },
    content: { label: 'Border radius', hint: 'Arrow keys step by 1, Shift + arrow by 10.' },
  })
  expect(defaults('color-picker')).toEqual({
    props: { format: 'oklch', paired: true, contrast: true, swatches: 5, eyeDropper: true },
    content: { label: 'Primary', value: 'oklch(0.55 0.22 6)', darkValue: 'oklch(0.7 0.18 6)' },
  })
})

it.each([
  ['number-input', { min: 10, max: 4, value: 5 }, {}, '/props/max'],
  ['number-input', { value: 40 }, {}, '/props/value'],
  ['number-input', {}, { label: ' ' }, '/content/label'],
  ['color-picker', {}, { value: 'red' }, '/content/value'],
  ['color-picker', {}, { darkValue: '#12345' }, '/content/darkValue'],
  ['color-picker', {}, { label: '' }, '/content/label'],
] as const)('rejects %s with %o and %o at %s', (component, props, content, path) => {
  expect(() => validateComponentRecipe(editorInputDraft(component, props, content)))
    .toThrow(expect.objectContaining({ path }))
})

it('ignores the dark value of an unpaired Color Picker, so the editor can switch the pair off', () => {
  expect(validateComponentRecipe(editorInputDraft('color-picker', { paired: false })).component).toBe('color-picker')
  expect(validateComponentRecipe(editorInputDraft('color-picker', { paired: false }, { darkValue: 'not a colour' })).component).toBe('color-picker')
})

it('accepts an unpaired Color Picker without a dark value', () => {
  const draft = editorInputDraft('color-picker', { paired: false })
  delete (draft.content as { darkValue?: string }).darkValue
  expect(validateComponentRecipe(draft).component).toBe('color-picker')
})

it.each([
  ['number-input', { props: { unit: 'em' } }],
  ['number-input', { props: { step: 0 } }],
  ['color-picker', { props: { swatches: 9 } }],
  ['color-picker', { props: { format: 'hsl' } }],
] as const)('rejects the %s recipe %o by schema', (component, override) => {
  expect(() => validateComponentRecipe(editorInputDraft(component, 'props' in override ? override.props : {}))).toThrow()
})

it('names the editor input appearance parts', async () => {
  const { componentRecipeParts } = await import('../src/component-recipe-appearance.js')
  expect(componentRecipeParts['number-input'].map(part => part.slot)).toEqual(['number-input'])
  expect(componentRecipeParts['color-picker'].map(part => part.slot)).toEqual(['color-picker-trigger', 'color-picker-content', 'color-picker-area-thumb'])
})

it.each(['oklch(0.97 0.004 350 / 14%)', '#1d4ed8', '#abc', '#ABCDEF', 'rgb(29 78 216)', 'rgb(29, 78, 216)', 'oklch(55% 0.22 6)', 'oklch(0.55 0.22 6)', ' oklch(0.7 0.18 6) '])('reads %s as a colour', async text => {
  const { isParsableColor } = await import('../src/color-syntax.js')
  expect(isParsableColor(text)).toBe(true)
})

it.each(['red', '#12345', 'rgb(1 2)', 'rgb(300 0 0)', 'hsl(0 0% 0%)', 'oklch(1 2)', 'oklch(140% 0.1 20)', ''])('rejects %s as a colour', async text => {
  const { isParsableColor } = await import('../src/color-syntax.js')
  expect(isParsableColor(text)).toBe(false)
})

const codeBlockDraft = (props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) => ({
  ...badge, component: 'code-block',
  props: { ...defaultRecipeFields(componentRecipeFields('code-block').props), ...props },
  content: { ...defaultRecipeFields(componentRecipeFields('code-block').content), ...content },
})

it('accepts the default Code Block recipe and gives it the board defaults', () => {
  expect(componentRecipeComponents).toContain('code-block')
  expect(validateComponentRecipe(codeBlockDraft()).component).toBe('code-block')
  expect(defaultRecipeFields(componentRecipeFields('code-block').props)).toEqual({ mode: 'file', language: 'tsx', lineNumbers: true })
  expect(defaultRecipeFields(componentRecipeFields('code-block').content)).toEqual({
    title: 'button.tsx',
    code: "import { cn } from '@/lib/utils'\n// generated by @ombelle-ui/cli\nexport function Button(props) {",
    args: '@ombelle-ui/cli add button',
  })
})

it('accepts a command Code Block with only args', () => {
  expect(validateComponentRecipe({ ...badge, component: 'code-block', props: { mode: 'command' }, content: { args: '@ombelle-ui/cli add card' } }).component).toBe('code-block')
})

it.each([
  [{ mode: 'command' }, { args: ' ' }, '/content/args', 'Enter the command arguments'],
  [{ mode: 'command' }, { args: '' }, '/content/args', 'Enter the command arguments'],
  [{ mode: 'file' }, { code: '  \n' }, '/content/code', 'Enter the code to show'],
] as const)('rejects a Code Block with %o and %o at %s', (props, content, path, message) => {
  expect(() => validateComponentRecipe(codeBlockDraft(props, content)))
    .toThrow(expect.objectContaining({ path, message }))
})

it('rejects Code Block code over 4000 characters by schema', () => {
  expect(validateComponentRecipe(codeBlockDraft({}, { code: 'a'.repeat(4000) })).component).toBe('code-block')
  expect(() => validateComponentRecipe(codeBlockDraft({}, { code: 'a'.repeat(4001) }))).toThrow()
})

it('names the Code Block appearance part', async () => {
  const { componentRecipeParts } = await import('../src/component-recipe-appearance.js')
  expect(componentRecipeParts['code-block'].map(part => part.slot)).toEqual(['code-block'])
})

const variants075Draft = (component: string, props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) => ({
  ...badge, component, props,
  content: { ...defaultRecipeFields(componentRecipeFields(component as 'badge').content), ...content },
})

it.each([
  ['checkbox', { option: 'row' }, {}],
  ['checkbox', { option: 'card' }, { description: 'Adds sample files' }],
  ['switch', { size: 'sm' }, {}],
  ['switch', { size: 'default' }, {}],
  ['progress', { size: 'lg', tone: 'success', showLabel: true, showValue: true }, {}],
  ['progress', { size: 'sm', tone: 'destructive' }, {}],
  ['popover', { arrow: true }, {}],
] as const)('accepts the 0.7.5 %s variant %o %o', (component, props, content) => {
  const recipe = validateComponentRecipe(variants075Draft(component, props, content))
  expect(recipe.props).toMatchObject(props)
  expect(recipe.content).toMatchObject(content)
})

it.each([
  ['switch', { size: 'xl' }, '/props/size'],
  ['progress', { tone: 'info' }, '/props/tone'],
  ['progress', { size: 'xl' }, '/props/size'],
  ['checkbox', { option: 'tile' }, '/props/option'],
  ['popover', { arrow: 'yes' }, '/props/arrow'],
] as const)('rejects the 0.7.5 %s variant %o at %s', (component, props, path) => {
  expect(() => validateComponentRecipe(variants075Draft(component, props))).toThrow(expect.objectContaining({ path }))
})

it('accepts fields the specimen ignores, so the editor can switch them off and back on', () => {
  expect(validateComponentRecipe(variants075Draft('progress', { indeterminate: true, showValue: true })).props).toMatchObject({ showValue: true })
  expect(validateComponentRecipe(variants075Draft('checkbox', { option: 'none' }, { description: 'Adds sample files' })).content)
    .toMatchObject({ description: 'Adds sample files' })
})

it('keeps batch 4a recipes free of the 0.7.5 variant fields', () => {
  const added = ['option', 'description', 'size', 'tone', 'showLabel', 'showValue', 'arrow']
  for (const component of ['checkbox', 'switch', 'progress', 'popover'] as const) {
    const recipe = validateComponentRecipe(variants075Draft(component))
    for (const key of added) {
      expect(recipe.props, component + ' ' + key).not.toHaveProperty(key)
    }
  }
  expect(validateComponentRecipe(variants075Draft('checkbox')).content).not.toHaveProperty('description')
})

it.each([
  ['dialog', { size: 'lg', footer: true, scrollingBody: true }, {}],
  ['dialog', { size: 'fullscreen' }, {}],
  ['dialog', { size: 'sm' }, {}],
  ['alert-dialog', { media: 'destructive' }, { confirmText: 'ombelle-site' }],
  ['alert-dialog', { media: 'none' }, { confirmText: '' }],
  ['breadcrumb', { collapse: 'auto' }, {}],
] as const)('accepts the 0.7.5 %s variant %o %o', (component, props, content) => {
  const recipe = validateComponentRecipe(variants075Draft(component, props, content))
  expect(recipe.props).toMatchObject(props)
  expect(recipe.content).toMatchObject(content)
})

it.each([
  ['dialog', { size: 'xl' }, {}, '/props/size'],
  ['alert-dialog', { media: 'warning' }, {}, '/props/media'],
  ['breadcrumb', { collapse: 'always' }, {}, '/props/collapse'],
  ['alert-dialog', {}, { confirmText: 'x'.repeat(201) }, '/content/confirmText'],
] as const)('rejects the 0.7.5 %s variant %o %o at %s', (component, props, content, path) => {
  expect(() => validateComponentRecipe(variants075Draft(component, props, content))).toThrow(expect.objectContaining({ path }))
})

it('keeps batch 4b recipes free of the 0.7.5 variant fields', () => {
  for (const component of ['dialog', 'alert-dialog', 'breadcrumb'] as const) {
    const recipe = validateComponentRecipe(variants075Draft(component))
    for (const key of ['size', 'footer', 'scrollingBody', 'media', 'collapse']) expect(recipe.props, component + ' ' + key).not.toHaveProperty(key)
    expect(recipe.content).not.toHaveProperty('confirmText')
  }
})

const components076 = ['password-field', 'carousel', 'aspect-ratio', 'toolbar'] as const
const draft076 = (component: string, props: Record<string, unknown> = {}, content: Record<string, unknown> = {}) => ({
  ...badge, component,
  props: { ...defaultRecipeFields(componentRecipeFields(component as never).props), ...props },
  content: { ...defaultRecipeFields(componentRecipeFields(component as never).content), ...content },
})

it.each(components076)('accepts the default %s recipe', component => {
  expect(componentRecipeComponents).toContain(component)
  expect(validateComponentRecipe(draft076(component)).component).toBe(component)
})

it('gives each 0.7.6 component the documented defaults', () => {
  const defaults = (component: (typeof components076)[number]) => ({
    props: defaultRecipeFields(componentRecipeFields(component).props),
    content: defaultRecipeFields(componentRecipeFields(component).content),
  })
  expect(defaults('password-field')).toEqual({ props: { strength: true, capsLockNotice: true, confirm: false }, content: { label: 'Password' } })
  expect(defaults('carousel')).toEqual({
    props: { dots: true, counter: true, slidesPerView: 1 },
    content: { label: 'UI kits', slides: ['Ombelle', 'Flat', 'Minimalist', 'Neo brutalism', 'Liquid glass'] },
  })
  expect(defaults('aspect-ratio')).toEqual({ props: { ratio: '16/9' }, content: { label: 'Preview' } })
  expect(defaults('toolbar')).toEqual({
    props: { overflow: true, toggles: 'single' },
    content: { label: 'View options', items: ['Light', 'Dark', 'Grid', 'Open preview'] },
  })
})

it.each([
  ['aspect-ratio', { ratio: '5/4' }, {}],
  ['toolbar', { toggles: 'all' }, {}],
  ['carousel', { slidesPerView: 4 }, {}],
  ['carousel', {}, { slides: Array(9).fill('Slide') }],
  ['toolbar', {}, { items: [] }],
  ['field', { form: 'wizard' }, {}],
  ['field', { fieldset: 'open' }, {}],
  ['checkbox', { group: 'all' }, {}],
  ['checkbox', {}, { options: Array(7).fill('Option') }],
] as const)('rejects the 0.7.6 %s recipe %o %o by schema', (component, props, content) => {
  expect(() => validateComponentRecipe(draft076(component, props, content))).toThrow()
})

it.each([
  ['toolbar', {}, { label: ' ' }, '/content/label'],
  ['carousel', {}, { label: '' }, '/content/label'],
  ['password-field', {}, { label: '' }, '/content/label'],
  ['toolbar', { toggles: 'multiple' }, { items: ['Grid'] }, '/content/items'],
  ['field', { fieldset: 'default' }, {}, '/content/legend'],
  ['field', { form: 'summary' }, { legend: ' ' }, '/content/legend'],
  ['checkbox', { group: 'parent' }, { options: ['Dialog', 'Popover'] }, '/content/legend'],
  ['checkbox', { group: 'parent' }, { legend: 'Overlays', options: ['Dialog'] }, '/content/options'],
] as const)('rejects the 0.7.6 %s recipe %o %o at %s', (component, props, content, path) => {
  expect(() => validateComponentRecipe(draft076(component, props, content))).toThrow(expect.objectContaining({ path }))
})

it('accepts a Field form and fieldset, and a Checkbox group, with a legend', () => {
  expect(validateComponentRecipe(draft076('field', { form: 'summary', fieldset: 'disabled' }, { legend: 'Save preset', fields: ['Preset name', 'Radius'] })).component).toBe('field')
  expect(validateComponentRecipe(draft076('checkbox', { group: 'parent' }, { legend: 'Overlays to install', options: ['Dialog', 'Popover'] })).component).toBe('checkbox')
})

it('adds no 0.7.6 key to the default Field and Checkbox recipes', () => {
  for (const component of ['field', 'checkbox'] as const) {
    const fields = componentRecipeFields(component)
    const defaults = { ...defaultRecipeFields(fields.props), ...defaultRecipeFields(fields.content) }
    for (const key of ['form', 'fieldset', 'legend', 'fields', 'group', 'options']) expect(defaults, component + ' ' + key).not.toHaveProperty(key)
  }
})

it('names the 0.7.6 appearance parts', async () => {
  const { componentRecipeParts } = await import('../src/component-recipe-appearance.js')
  const slots = (id: (typeof components076)[number]) => componentRecipeParts[id].map(part => part.slot)
  expect(slots('password-field')).toEqual(['password-field-control', 'password-field-strength-bar'])
  expect(slots('carousel')).toEqual(['carousel-content', 'carousel-dot'])
  expect(slots('aspect-ratio')).toEqual(['aspect-ratio'])
  expect(slots('toolbar')).toEqual(['toolbar', 'toolbar-toggle-item'])
})
