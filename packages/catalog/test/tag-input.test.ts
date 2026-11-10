import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { addTags, TagInput, TagInputInput, TagInputList } from '../src/templates/tag-input.js'
import { Field, FieldControl, FieldDescription, FieldLabel } from '../src/templates/field.js'
import { expectComponentContract } from './new-component-contract.js'

const separators = ['Enter', ',']

describe('Tag Input', () => {
  it('provides its parts with its own tag slots and lucide-react for the remove icon', () => {
    expectComponentContract('tag-input', { client: true, parts: ['TagInput', 'TagInputList', 'TagInputInput'],
      slots: ['tag-input', 'tag-input-list', 'tag-input-tag', 'tag-input-remove', 'tag-input-input', 'tag-input-status'],
      dependencies: [{ name: 'react', version: '19.3.1' }, { name: 'clsx', version: '2.1.1' }, { name: 'tailwind-merge', version: '3.7.0' }, { name: 'lucide-react', version: '1.55.0' }],
      selectors: ["[data-slot='tag-input']", "[data-slot='tag-input-tag']", "[data-slot='tag-input-remove']", "[data-slot='tag-input-status']"], glass: 'experimental' })
  })

  it('splits pasted text on separators, trims it, and adds each tag once', () => {
    expect(addTags([], ' a, b,,c , a', { separators })).toEqual({ value: ['a', 'b', 'c'], rejected: [{ tag: 'a', reason: 'duplicate' }] })
    expect(addTags([], 'one\ntwo', { separators })).toEqual({ value: ['one', 'two'], rejected: [] })
    expect(addTags(['x'], 'x', { separators, allowDuplicates: true }).value).toEqual(['x', 'x'])
  })

  it('stops at the maximum and reports the tags it left out', () => {
    expect(addTags(['a'], 'b, c', { separators, max: 2 })).toEqual({ value: ['a', 'b'], rejected: [{ tag: 'c', reason: 'max' }] })
    expect(addTags(['a'], '   ', { separators, max: 2 })).toEqual({ value: ['a'], rejected: [] })
  })

  it('renders each tag with a named remove button and a hidden input per tag for forms', () => {
    const html = renderToStaticMarkup(h(TagInput, { defaultValue: ['glass'], name: 'topics' }, h(TagInputList), h(TagInputInput, { 'aria-label': 'Topics' })))
    expect(html).toMatch(/<button[^>]*aria-label="Remove glass"/)
    expect(html).toMatch(/<input[^>]*type="hidden"[^>]*name="topics"[^>]*value="glass"|<input[^>]*name="topics"[^>]*type="hidden"[^>]*value="glass"/)
    expect(html).toMatch(/role="status"/)
    expect(html).toMatch(/<ul[^>]*aria-label="Selected tags"/)
  })

  it('takes the label, hint and required state from a Field', () => {
    const html = renderToStaticMarkup(h(Field, { required: true },
      h(FieldLabel, null, 'Topics'),
      h(TagInput, null, h(TagInputList), h(FieldControl, null, h(TagInputInput))),
      h(FieldDescription, null, 'Enter or comma adds a tag.')))
    const id = /<label[^>]*for="([^"]+)"/.exec(html)![1]
    const input = new RegExp(`<input[^>]*id="${id}"[^>]*>`).exec(html)![0]
    expect(input).toContain('data-slot="tag-input-input"')
    expect(input).toMatch(/aria-describedby="[^"]*-description"/)
    expect(input).toContain('required')
  })
})

describe('Tag Input in a required Field', () => {
  const required = (tags: string[]) => {
    const html = renderToStaticMarkup(h(Field, { required: true }, h(FieldLabel, null, 'Topics'),
      h(TagInput, { defaultValue: tags }, h(TagInputList), h(FieldControl, null, h(TagInputInput)))))
    return /<input[^>]*data-slot="tag-input-input"[^>]*>/.exec(html)![0]
  }
  it('requires typed text only while there are no tags, so a filled field can submit', () => {
    expect(required([])).toMatch(/\srequired=""/)
    expect(required(['glass'])).not.toMatch(/\srequired=""/)
    expect(required(['glass'])).toContain('aria-required="true"')
  })
})
