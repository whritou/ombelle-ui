import type { ComponentRecipe } from '@ombelle/contracts'

export type RecipeSpecimen = {
  tag: string
  props: Record<string, string | number | boolean | null | undefined | readonly string[] | { localId: string }>
  children: readonly (RecipeSpecimen | string)[]
}

type Props = RecipeSpecimen['props']
const node = (tag: string, props: Props = {}, ...children: RecipeSpecimen['children']): RecipeSpecimen => ({ tag, props, children })
const localId = (suffix: string) => ({ localId: '-' + suffix })
const label = (text: string) => node('label', { htmlFor: localId('control') }, text)
const trigger = (tag: string, text: string) => node(tag, { type: 'button' }, text)
// The installed recipe lays out its label and control itself, so the label never touches the control.
const stacked = { className: 'grid gap-2' }
const inline = { className: 'flex items-center gap-2' }

export function describeComponentRecipe(recipe: ComponentRecipe): RecipeSpecimen {
  const { component, content, props } = recipe
  switch (component) {
    case 'spinner':
      return node('Spinner', { size: props.size, 'aria-label': content.label })
    case 'kbd':
      return node('KbdGroup', {}, ...content.keys.split(/\s+/).filter(Boolean).map(key => node('Kbd', {}, key)))
    case 'empty':
      // Native buttons marked for the Empty styles: a recipe compiles only its own component.
      return node('Empty', {}, node('EmptyHeader', {},
        ...(props.media === 'icon' ? [node('EmptyMedia', { variant: 'icon', 'aria-hidden': 'true' }, '+')] : []),
        node('EmptyTitle', {}, content.title), ...(content.description.trim() ? [node('EmptyDescription', {}, content.description)] : [])),
      node('EmptyContent', {},
        ...(content.secondaryAction.trim() ? [node('button', { type: 'button', 'data-empty-action': 'secondary' }, content.secondaryAction)] : []),
        node('button', { type: 'button', 'data-empty-action': 'primary' }, content.primaryAction)))
    case 'field': {
      // A native control marked for the Field styles: a recipe compiles only its own component.
      const control = props.control === 'textarea' ? node('textarea', { placeholder: content.placeholder || undefined, 'data-field-input': '' })
        : props.control === 'native-select' ? node('select', { 'data-field-input': '' }, node('option', { value: '' }, content.placeholder || 'Choose an option'))
        : node('input', { type: 'text', placeholder: content.placeholder || undefined, 'data-field-input': '' })
      return node('Field', { required: props.required, invalid: props.invalid, disabled: props.disabled, orientation: props.orientation },
        node('FieldLabel', {}, content.label), node('FieldControl', {}, control),
        ...(content.description.trim() ? [node('FieldDescription', {}, content.description)] : []), node('FieldError', {}, content.error))
    }
    case 'meter': {
      const tones = ['primary', 'info', 'success', 'warning'] as const
      if (props.mode === 'labelled')
        return node('Meter', { max: props.max }, node('MeterLabel', {}, content.label), node('MeterValue'),
          ...content.parts.map((part, index) => node('MeterSegment', { value: part.value, tone: tones[index] })),
          node('MeterLegend', {}, ...content.parts.map((part, index) => node('MeterLegendItem', { tone: tones[index] }, part.label))))
      return node('Meter', { value: props.value, max: props.max, segments: props.segments,
        warningAt: props.warningPercent === undefined ? undefined : props.warningPercent / 100 }, node('MeterLabel', {}, content.label), node('MeterValue'))
    }
    case 'stepper':
      return node('Stepper', { orientation: props.orientation, 'aria-label': 'Progress' }, ...content.steps.map((step, index) =>
        node('StepperItem', { status: index < (props.current ?? 0) ? 'complete' : index === (props.current ?? 0) ? 'current' : 'upcoming' },
          node('StepperIndicator', {}, String(index + 1)), node('StepperTitle', {}, step.title),
          ...(step.description.trim() ? [node('StepperDescription', {}, step.description)] : []),
          ...(index < content.steps.length - 1 ? [node('StepperSeparator')] : []))))
    case 'toast':
      return node('ToastProvider', { duration: props.duration }, node('Toast', { variant: props.variant, defaultOpen: true },
        node('ToastTitle', {}, content.title), node('ToastDescription', {}, content.description),
        ...(content.action ? [node('ToastAction', { altText: content.actionAltText }, content.action)] : []),
        node('ToastClose', { 'aria-label': content.close })), node('ToastViewport'))
    case 'input-group': {
      const control = node(props.multiline ? 'InputGroupTextarea' : 'InputGroupInput', {
          id: localId('control'), placeholder: content.placeholder, defaultValue: content.initialText,
          disabled: props.disabled, required: props.required, 'aria-invalid': props.invalid || undefined,
        })
      const addons = content.addon || content.action ? [node('InputGroupAddon', { align: props.align },
          ...(content.addon ? [node('InputGroupText', {}, content.addon)] : []),
          ...(content.action ? [node('InputGroupButton', { disabled: props.disabled }, content.action)] : []))] : []
      const leading = props.align === 'inline-start' || props.align === 'block-start'
      return node('div', stacked, label(content.label), node('InputGroup', {},
        ...(leading ? [...addons, control] : [control, ...addons])))
    }
    case 'sheet':
      return node('Sheet', {}, trigger('SheetTrigger', content.trigger), node('SheetContent', props,
        node('SheetHeader', {}, node('SheetTitle', {}, content.title), node('SheetDescription', {}, content.description)),
        node('p', {}, content.body)))
    case 'alert-dialog':
      return node('AlertDialog', {}, trigger('AlertDialogTrigger', content.trigger), node('AlertDialogContent', {},
        node('AlertDialogHeader', {}, node('AlertDialogTitle', {}, content.title), node('AlertDialogDescription', {}, content.description)),
        node('AlertDialogFooter', {}, node('AlertDialogCancel', {}, content.cancel), node('AlertDialogAction', {}, content.action))))
    case 'breadcrumb':
      return node('Breadcrumb', { 'aria-label': content.label }, node('BreadcrumbList', {},
        ...content.items.flatMap((item, index) => [
          ...(index ? [node('BreadcrumbSeparator')] : []),
          node('BreadcrumbItem', {}, index === content.items.length - 1
            ? node('BreadcrumbPage', {}, item.label) : node('BreadcrumbLink', { href: item.href }, item.label)),
        ])))
    case 'pagination':
      return node('Pagination', { 'aria-label': content.label }, node('PaginationContent', {},
        node('PaginationItem', {}, node('PaginationPrevious', { href: '#page-' + (props.page - 1), disabled: props.page === 1 }, content.previous)),
        ...Array.from({ length: props.totalPages }, (_, index) => node('PaginationItem', {}, node('PaginationLink', {
          href: '#page-' + (index + 1), isActive: props.page === index + 1, 'aria-label': 'Page ' + (index + 1),
        }, String(index + 1)))),
        node('PaginationItem', {}, node('PaginationNext', { href: '#page-' + (props.page + 1), disabled: props.page === props.totalPages }, content.next))))
    case 'badge':
      return node('Badge', { variant: props.variant, size: props.size }, ...(props.dot ? [node('BadgeDot')] : []), content.label)
    case 'alert':
      return node('Alert', props, node('AlertTitle', {}, content.title), node('AlertDescription', {}, content.description))
    case 'avatar':
      return node('Avatar', { size: props.size, variant: props.variant, role: 'img', 'aria-label': content.label },
        node('AvatarFallback', {}, content.initials),
        ...(props.status === 'none' ? [] : [node('AvatarStatus', { status: props.status })]))
    case 'card':
      return node('Card', { density: props.density, appearance: props.appearance }, node('CardHeader', {},
        node('CardTitle', { level: props.level }, content.title), node('CardDescription', {}, content.description)),
      node('CardContent', {}, content.body))
    case 'progress':
      return node('Progress', { value: props.indeterminate ? null : props.value, max: props.max, 'aria-label': content.label })
    case 'separator':
      return node('Separator', props, ...(!props.decorative && content.label ? [content.label] : []))
    case 'skeleton':
      return node('div', { role: 'status', 'aria-busy': true, 'aria-label': content.label }, node('Skeleton', props))
    case 'input':
    case 'textarea':
      return node('div', stacked, label(content.label), node(component === 'input' ? 'Input' : 'Textarea', {
        id: localId('control'), placeholder: content.placeholder, defaultValue: content.initialText,
        disabled: props.disabled, required: props.required, 'aria-invalid': props.invalid || undefined,
      }))
    case 'label':
      return node('div', stacked, node('Label', { htmlFor: localId('control') }, content.label,
        ...(props.required ? [node('span', { 'aria-hidden': 'true' }, '*')] : [])),
      node('input', { id: localId('control'), type: 'text', required: props.required }))
    case 'checkbox':
      return node('div', inline, node('Checkbox', { id: localId('control'), disabled: props.disabled, required: props.required,
        defaultChecked: props.checked === 'indeterminate' ? 'indeterminate' : props.checked === 'checked' }), label(content.label))
    case 'switch':
      return node('div', inline, node('Switch', { id: localId('control'), disabled: props.disabled, defaultChecked: props.checked },
        node('SwitchThumb')), label(content.label))
    case 'native-select':
      return node('div', stacked, label(content.label), node('NativeSelect', {
        id: localId('control'), defaultValue: props.selection, size: props.size, disabled: props.disabled, required: props.required,
      }, ...(props.selection ? [] : [node('NativeSelectOption', { value: '' }, 'Choose an option')]),
      ...content.options.map(item => node('NativeSelectOption', { value: item.id }, item.label))))
    case 'radio-group':
      return node('div', stacked, node('p', { id: localId('group-label') }, content.label), node('RadioGroup', {
        'aria-labelledby': localId('group-label'), defaultValue: props.selection || undefined,
        orientation: props.orientation, disabled: props.disabled, required: props.required,
      }, ...content.options.map(item => node('RadioGroupOption', {}, node('RadioGroupItem', { value: item.id }),
        node('span', {}, node('RadioGroupOptionLabel', {}, item.label), ...(item.description
          ? [node('RadioGroupOptionDescription', {}, item.description)] : []))))))
    case 'select':
      return node('div', stacked, label(content.label), node('Select', {
        defaultValue: props.selection || undefined, disabled: props.disabled, required: props.required,
      }, node('SelectTrigger', { id: localId('control'), size: props.size }, node('SelectValue', { placeholder: content.placeholder })),
      node('SelectContent', { position: props.position }, ...content.options.map(item =>
        node('SelectItem', { value: item.id, hint: item.hint || undefined }, item.label)))))
    case 'accordion':
      return node('Accordion', props.type === 'single'
        ? { type: 'single', collapsible: props.collapsible, defaultValue: props.expanded[0] }
        : { type: 'multiple', defaultValue: props.expanded },
      ...content.items.map(item => node('AccordionItem', { value: item.id },
        node('AccordionTrigger', {}, item.label), node('AccordionContent', {}, item.body))))
    case 'tabs':
      return node('Tabs', { defaultValue: props.selection, orientation: props.orientation },
        node('TabsList', { 'aria-label': 'Sections', appearance: props.appearance }, ...content.items.map(item => node('TabsTrigger', { value: item.id }, item.label))),
        ...content.items.map(item => node('TabsContent', { value: item.id }, item.body)))
    case 'table': {
      const numeric = new Set(props.numeric)
      return node('Table', { density: props.density, striped: props.striped }, node('TableCaption', {}, content.caption), node('TableHeader', {},
        node('TableRow', {}, ...content.columns.map(column => node('TableHead', { numeric: numeric.has(column.id) }, column.label)))),
      node('TableBody', {}, ...content.rows.map(row => node('TableRow', {}, ...row.cells.map((cell, index) =>
        node('TableCell', { numeric: numeric.has(content.columns[index].id) }, cell))))))
    }
    case 'dialog':
      return node('Dialog', {}, trigger('DialogTrigger', content.trigger), node('DialogContent', {},
        node('DialogHeader', {}, node('DialogTitle', {}, content.title), node('DialogDescription', {}, content.description))))
    case 'dropdown-menu':
      return node('DropdownMenu', {}, trigger('DropdownMenuTrigger', content.trigger), node('DropdownMenuContent', {},
        ...content.items.map(item => node('DropdownMenuItem', { variant: item.variant, disabled: item.disabled }, item.label))))
    case 'popover':
      return node('Popover', {}, trigger('PopoverTrigger', content.trigger), node('PopoverContent', {
        ...props, 'aria-labelledby': localId('title'),
      }, node('PopoverTitle', { id: localId('title') }, content.title), node('PopoverDescription', {}, content.description)))
    case 'tooltip':
      return node('TooltipProvider', { delayDuration: 300 }, node('Tooltip', {}, trigger('TooltipTrigger', content.trigger),
        node('TooltipContent', props, content.text, node('TooltipArrow'))))
  }
}

export function specimenExports(specimen: RecipeSpecimen): string[] {
  const names = new Set<string>()
  const visit = (part: RecipeSpecimen) => {
    if (/^[A-Z]/.test(part.tag)) names.add(part.tag)
    for (const child of part.children) if (typeof child !== 'string') visit(child)
  }
  visit(specimen)
  return [...names].sort()
}

export function specimenUsesLocalIds(specimen: RecipeSpecimen): boolean {
  return Object.values(specimen.props).some(value => value && typeof value === 'object' && 'localId' in value) ||
    specimen.children.some(child => typeof child !== 'string' && specimenUsesLocalIds(child))
}

export function renderRecipeSpecimen(specimen: RecipeSpecimen): string {
  const props = Object.entries(specimen.props)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([name, value]) => ` ${name}={${value && typeof value === 'object' && 'localId' in value
      ? 'instanceId + ' + JSON.stringify(value.localId) : JSON.stringify(value)}}`).join('')
  const children = specimen.children.map(child =>
    typeof child === 'string' ? `{${JSON.stringify(child)}}` : renderRecipeSpecimen(child)).join('')
  return children
    ? `<${specimen.tag}${props}>${children}</${specimen.tag}>`
    : `<${specimen.tag}${props} />`
}
