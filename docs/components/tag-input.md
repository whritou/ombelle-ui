# Tag Input

Tag Input is a field of removable tags. Enter or comma adds the typed text as a tag, and Backspace in the empty field removes the last one. It is available in all five families in light and dark mode, in one template for both editions; the template is a client component.

This component requires CLI **0.7.3** or later: `npx @ombelle-ui/cli@0.7.3 add tag-input`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add tag-input --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add tag-input --cwd APP --yes
```

```tsx
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field'
import { TagInput, TagInputInput, TagInputList } from '@/components/ui/tag-input'

export function Topics() {
  return (
    <Field>
      <FieldLabel>Topics</FieldLabel>
      <TagInput defaultValue={['design-tokens', 'glass']} name="topics" max={8}>
        <TagInputList />
        <FieldControl><TagInputInput placeholder="Add a topic" /></FieldControl>
      </TagInput>
      <FieldDescription>Enter or comma adds a topic. Backspace removes the last one.</FieldDescription>
    </Field>
  )
}
```

## API and accessibility

- **Props:**
  - `value` or `defaultValue` is an array of tags, with `onValueChange`.
  - `separators` lists the keys and characters that add a tag. The default is Enter and comma.
  - `max` caps the number of tags.
  - `allowDuplicates` defaults to false.
  - `disabled` turns off the field and the remove buttons.
  - With `name`, each tag submits as a hidden input with that name.
- **Typing:**
  - Added text is trimmed, and empty parts are dropped.
  - Pasting text that contains separators or new lines adds each part.
  - A duplicate or a tag past `max` is not added and stays in the field.
- **Parts:**
  - `TagInputInput` is the labelled control. Wrap it in `FieldControl`, or give it `aria-label` or `aria-labelledby`.
  - `TagInputList` is a list named "Selected tags". Each tag has a 24px remove button named "Remove" plus the tag. Removing a tag returns focus to the input.
- **Announcements:** a polite live region announces "Added glass", "Removed glass", "glass is already added" and "You can add up to 8 tags". It is visually hidden by the component's own styles.
- **Helper:** `addTags(current, text, { separators, max, allowDuplicates })` is exported for apps that need the same rules elsewhere.

## Recipe

The recipe editor sets `max`, the label, the placeholder and up to eight starting tags. Starting tags past `max` are rejected.

Compilation emits `components/ui/tag-input.tsx`, `components/ui/tag-input.css` and `examples/tag-input.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0. Tag Input draws its own tags, styled like static chips, so installing it does not install Chip.

## Liquid glass

Liquid glass is experimental for Tag Input, as for every glass component, and its findings do not block a release. See [liquid glass](liquid-glass.md).

See [form controls evidence](../evidence/form-controls-073.md) for the board comparison, the specimen audit and the browser tests.
