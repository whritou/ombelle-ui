# pricing-01

Three plans with a monthly or yearly toggle, a highlighted plan, feature lists and a comparison note. The cards stack on phones and sit side by side from 768px. It is installed with `ombelle add pricing-01` and follows the project preset in every style family, both editions, light and dark. Liquid glass carries its usual accessibility caveat; see [Liquid glass](../components/liquid-glass.md).

## Install

```bash
ombelle add pricing-01 --dry-run
ombelle add pricing-01 --yes
```

```tsx
import { Pricing01 } from '@/components/blocks/pricing-01'

export default function PricingPage() {
  return (
    <main>
      <h1 className="sr-only">Pricing</h1>
      <Pricing01 />
    </main>
  )
}
```

The block files are `<components parent>/blocks/pricing-01.tsx` and `.css` (by default `src/components/blocks/`). They are managed files recorded in the lock; see [Blocks](../05-cli-specification.md#blocks). Use CLI 1.1 or later in a project with blocks.

## What it installs

The block and these components: Badge, Button, Card, Separator, Toast and Toggle Group. Components you already edited are kept (`BLOCK_COMPONENT_EDITED`).

## Example only

The prices are example figures, and the plan buttons never start a checkout. Each calls `showExampleNotice()`, which shows a Toast such as `Example only: "Choose <plan>" did nothing`.

To wire it up, replace the plans and prices in `exampleData`, and replace `showExampleNotice()` with your own checkout or sign-up call.

## Layout and keyboard

- One `h2` and a labelled section; your page owns the `h1`.
- Works at 320px without horizontal scroll.
- The billing toggle is a Toggle Group named "Billing period": arrow keys move between Monthly and Yearly, Space or Enter selects.
- The highlighted plan carries a badge, so it is not marked by colour alone.
