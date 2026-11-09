# Input Group

Input Group composes a native input or textarea with adjacent text, icons and
buttons inside one field surface. It uses the same source for Radix and Base UI
editions, with no primitive dependency or imports from other components. All five
style families are available; liquid glass is experimental.

This component requires the planned CLI 0.7.2 release. Published CLI 0.7.1 does
not install it. To try the private local implementation, build the packages,
initialize a consumer project, then run:

```powershell
pnpm build:packages
pnpm exec node packages/cli/dist/main.js add input-group --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add input-group --cwd APP --yes
```

## Compose a field

```tsx
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group'

export function WebsiteField() {
  return (
    <>
      <label htmlFor="website">Website</label>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText id="website-prefix">https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id="website"
          name="website"
          aria-describedby="website-prefix website-help"
          placeholder="example.com"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton aria-label="Check website availability">
            Check
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <p id="website-help">Enter the domain without its protocol.</p>
    </>
  )
}

export function MessageField() {
  return (
    <>
      <label htmlFor="message">Message</label>
      <InputGroup>
        <InputGroupAddon align="block-start">
          <InputGroupText>To: Support</InputGroupText>
        </InputGroupAddon>
        <InputGroupTextarea id="message" name="message" rows={4} required />
        <InputGroupAddon align="block-end">
          <InputGroupButton type="submit">Send message</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </>
  )
}
```

The examples show composition; applications supply button actions, submission
and validation. Use one editable control as a direct child of each group. Keep
addons as direct children too. Addons are positioned by logical alignment; keep
their DOM order consistent with their visual and keyboard order. For example,
place a trailing action after the control and a block-start addon before it.
Logical inline placement follows the document's writing direction, including
RTL.

| Export | Native element | Additional behavior |
| --- | --- | --- |
| `InputGroup` | `div` | Defaults to `role="group"` |
| `InputGroupInput` | `input` | Defaults to `type="text"` |
| `InputGroupTextarea` | `textarea` | Vertical resizing and content sizing where supported |
| `InputGroupAddon` | `div` | `align="inline-start"` by default; also `inline-end`, `block-start`, `block-end` |
| `InputGroupText` | `span` | Text or decorative icon layout |
| `InputGroupButton` | `button` | Defaults to `type="button"`; accepts explicit `submit` or `reset` |

Each export accepts the corresponding `React.ComponentProps` including
`className`, `style`, ARIA attributes and React 19 refs. Native controls retain
their controlled and uncontrolled values, event handlers, `name`, `required`,
`readOnly`, `disabled` and native validation attributes. Slot markers are owned
by the component. `InputGroupAddon` exposes alignment through `data-align`.

## Accessibility and states

Name the editable control with a native `label` and matching `htmlFor`/`id`,
or an appropriate ARIA name. An addon does not automatically become a label.
Connect helpful prefix or suffix text with `aria-describedby` when it contributes
to the field's meaning. Mark decorative icons `aria-hidden="true"`, and give
icon-only buttons accessible names. A group can have its own `aria-label` or
`aria-labelledby` when naming the whole collection is useful.

Set `aria-invalid="true"` on the editable control and associate the error with
`aria-describedby`. The group observes that direct child with `:has()` and
styles the shared surface. Native validity is preserved; the component does
not choose when errors should appear. `:focus-within` shows the shared focus
indicator, and buttons retain a separate visible keyboard focus outline.

Set `disabled` on the actual control or button. A disabled editable control
changes the shared surface through `:has()`. It does not disable sibling
buttons; disable those explicitly when required. A native disabled `fieldset`
can disable the complete composition.

Flat uses a filled surface and bottom border, minimalist a quiet outline,
neo-brutalism a heavy border and offset shadow, and Ombelle a recessed surface
with a raised focus shadow. Focus, invalid and disabled treatments follow each
family's native form controls. Reduced motion removes transitions. Forced
colors use `Field`/`FieldText`, system-color borders and `Highlight` focus; invalid
fields have double borders so their state has a non-color cue.

Liquid glass starts with an opaque background. Supported backdrop filters add
the same inner field glass treatment as Textarea; reduced transparency restores
the opaque background. Forced colors remove the filter and shadow. This
experimental family retains the same native semantics and logical layout.

## Files and ownership

Compilation emits `components/ui/input-group.tsx`, colocated
`components/ui/input-group.css`, and the component example, with shared utility
and theme artifacts as needed. Configured aliases and destination paths still
apply. Keep the `./input-group.css` import when moving the component. Generated
source imports React, the shared utility and its own stylesheet only; it has no
Ombelle runtime dependency.

The installed TSX and CSS remain consumer-owned source guarded by the installer
ownership hashes. Dry-run writes nothing, an identical repeat is a no-op, and
modified files remain conflicts even with `--yes`. Component recipes change this
component's selected style without changing saved global project defaults.
