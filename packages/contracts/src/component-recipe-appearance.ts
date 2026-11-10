import type { ComponentRecipe, ComponentRecipeId } from './component-recipe.js'
import { componentRecipeSchema } from './component-recipe-schema.js'

export type ComponentRecipeAppearance = NonNullable<ComponentRecipe['appearance']>
export type ComponentRecipePart = NonNullable<ComponentRecipeAppearance['parts']>[string]

type Part = {
  slot: string
  label: string
  kind: 'surface' | 'text' | 'layout' | 'mark'
  glassTint?: 'card' | 'popover' | 'background' | 'muted'
}

const surface = (slot: string, label: string, glassTint?: Part['glassTint']): Part =>
  ({ slot, label, kind: 'surface', glassTint })
const text = (slot: string, label: string): Part => ({ slot, label, kind: 'text' })
const layout = (slot: string, label: string): Part => ({ slot, label, kind: 'layout' })
const mark = (slot: string, label: string): Part => ({ slot, label, kind: 'mark' })

export const componentRecipeParts: Record<ComponentRecipeId, readonly Part[]> = {
  spinner: [mark('spinner', 'Spinner')],
  kbd: [surface('kbd', 'Key', 'muted')],
  empty: [surface('empty', 'Panel', 'muted'), surface('empty-media', 'Icon tile'), text('empty-title', 'Title'), text('empty-description', 'Description')],
  field: [text('field-label', 'Label'), text('field-description', 'Hint'), text('field-error', 'Error')],
  meter: [layout('meter-track', 'Track'), mark('meter-cell', 'Cell'), text('meter-label', 'Label'), text('meter-value', 'Value')],
  stepper: [mark('stepper-indicator', 'Indicator'), text('stepper-title', 'Title'), text('stepper-description', 'Description'), mark('stepper-separator', 'Connector')],
  slider: [layout('slider-track', 'Track'), mark('slider-range', 'Range'), mark('slider-thumb', 'Thumb')],
  'toggle-group': [surface('toggle-group', 'Group'), surface('toggle-group-item', 'Item')],
  chip: [surface('chip', 'Chip')],
  'tag-input': [surface('tag-input', 'Field')],
  'input-otp': [surface('input-otp-slot', 'Slot')],
  'input-group': [surface('input-group', 'Group', 'background'), text('input-group-input', 'Input'), text('input-group-textarea', 'Textarea'), layout('input-group-addon', 'Addon'), text('input-group-text', 'Addon text'), surface('input-group-button', 'Action')],
  sheet: [surface('sheet-content', 'Sheet', 'popover'), text('sheet-title', 'Title'), text('sheet-description', 'Description'), layout('sheet-header', 'Header'), layout('sheet-footer', 'Footer')],
  'alert-dialog': [surface('alert-dialog-content', 'Dialog', 'popover'), text('alert-dialog-title', 'Title'), text('alert-dialog-description', 'Description'), surface('alert-dialog-cancel', 'Cancel'), surface('alert-dialog-action', 'Action')],
  breadcrumb: [layout('breadcrumb-list', 'Items'), text('breadcrumb-link', 'Link'), text('breadcrumb-page', 'Current page')],
  pagination: [layout('pagination-content', 'Items'), surface('pagination-link', 'Page')],
  toast: [surface('toast', 'Toast', 'popover'), text('toast-title', 'Title'), text('toast-description', 'Description'), surface('toast-action', 'Action'), surface('toast-close', 'Dismiss')],
  accordion: [surface('accordion', 'Container', 'card'), surface('accordion-trigger', 'Item heading', 'card'), surface('accordion-content-inner', 'Item content')],
  alert: [surface('alert', 'Surface', 'card'), text('alert-title', 'Title'), text('alert-description', 'Description')],
  avatar: [surface('avatar', 'Surface', 'card'), text('avatar-fallback', 'Initials')],
  badge: [surface('badge', 'Badge'), mark('badge-dot', 'Status dot')],
  card: [surface('card', 'Surface', 'card'), layout('card-header', 'Header'), text('card-title', 'Title'), text('card-description', 'Description'), surface('card-content', 'Content')],
  checkbox: [mark('checkbox', 'Checkbox'), mark('checkbox-indicator', 'Indicator')],
  dialog: [surface('dialog-content', 'Dialog surface', 'popover'), text('dialog-title', 'Title'), text('dialog-description', 'Description')],
  'dropdown-menu': [surface('dropdown-menu-content', 'Menu surface', 'popover'), surface('dropdown-menu-item', 'Menu item')],
  input: [surface('input', 'Field', 'background')],
  label: [text('label', 'Label')],
  'native-select': [surface('native-select', 'Field', 'background')],
  popover: [surface('popover-content', 'Popover surface', 'popover'), text('popover-title', 'Title'), text('popover-description', 'Description')],
  progress: [mark('progress', 'Track'), mark('progress-indicator', 'Fill')],
  'radio-group': [layout('radio-group', 'Group'), surface('radio-group-option', 'Option', 'background'), mark('radio-group-item', 'Radio'), text('radio-group-option-label', 'Option label')],
  select: [surface('select-trigger', 'Trigger', 'background'), surface('select-content', 'Menu surface', 'popover'), surface('select-item', 'Option', 'popover')],
  separator: [mark('separator', 'Separator')],
  skeleton: [mark('skeleton', 'Skeleton')],
  switch: [mark('switch', 'Track'), mark('switch-thumb', 'Thumb')],
  table: [surface('table-container', 'Container', 'card'), surface('table-head', 'Header cell', 'muted'), surface('table-cell', 'Body cell', 'card')],
  tabs: [layout('tabs', 'Layout'), surface('tabs-list', 'Tab list', 'muted'), surface('tabs-trigger', 'Tab'), surface('tabs-content', 'Panel')],
  textarea: [surface('textarea', 'Field', 'background')],
  tooltip: [surface('tooltip-content', 'Tooltip surface', 'popover'), surface('tooltip-trigger', 'Trigger')],
}

export const componentRecipePartFields = componentRecipeSchema.$defs.partAppearance.properties
