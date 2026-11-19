'use client'
import { TagInput, TagInputInput, TagInputList } from '@/components/ui/tag-input'

export function Specimen() {
  return (
    <section aria-label="Tag Input" data-component="tag-input">
      <h2>Tag Input</h2>
      <label id="gallery-topics">Topics</label>
      <TagInput defaultValue={['design-tokens', 'glass']}><TagInputList /><TagInputInput aria-labelledby="gallery-topics" placeholder="Add a topic" /></TagInput>
    </section>
  )
}
