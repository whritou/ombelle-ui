# Carousel

Carousel shows slides that snap as they scroll, with previous and next buttons, one dot per slide and a counter. It is built on CSS scroll snap, so touch, trackpad and keyboard scrolling work without a script; the buttons and dots only scroll a slide into view. It never autoplays, so it needs no pause control. It is available in all five families in light and dark mode; one client template serves the Radix and Base UI editions, with no dependency beyond React and lucide-react.

This component requires CLI **0.7.6** or later: `npx @ombelle-ui/cli@0.7.6 add carousel`. For a built local checkout:

```powershell
pnpm exec node packages/cli/dist/main.js add carousel --cwd APP --dry-run --json
pnpm exec node packages/cli/dist/main.js add carousel --cwd APP --yes
```

```tsx
import { Carousel, CarouselContent, CarouselCounter, CarouselDots, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'

const kits = ['Ombelle', 'Flat', 'Minimalist', 'Neo brutalism', 'Liquid glass']

export function Kits() {
  return (
    <Carousel aria-label="UI kits">
      <CarouselContent>
        {kits.map((kit) => <CarouselItem key={kit}><KitCard name={kit} /></CarouselItem>)}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
      <CarouselDots />
      <CarouselCounter />
    </Carousel>
  )
}
```

## API and accessibility

- `Carousel` is a `role="region"` with `aria-roledescription="carousel"`; name it with `aria-label` or `aria-labelledby`. `slidesPerView` (1, 2 or 3) sets how many slides show at once.
- `CarouselContent` is the scrolling, snapping viewport and a Tab stop, so arrow keys scroll it. Its direct `CarouselItem` children are the slides; each is a `role="group"` with `aria-roledescription="slide"` named "2 of 5".
- `CarouselPrevious` and `CarouselNext` are named "Previous slide" and "Next slide", point at the viewport with `aria-controls`, and are disabled at the ends (both, with one slide). Below 640px they are hidden: touch users swipe, and the dots stay.
- `CarouselDots` is a group named "Choose slide" with one button per slide, named "Slide 3"; the current one has `aria-current="true"`. Each dot's target is 24 × 24 px.
- `CarouselCounter` shows "2 / 5" and is hidden from screen readers, which already hear each slide's position.
- The current slide follows the scroll position, however the viewport was scrolled. Adding or removing slides updates the dots and names. Under reduced motion, buttons and dots jump instead of scrolling smoothly.

## Recipe

The recipe editor sets `dots`, `counter`, `slidesPerView` and the label and up to eight slides. Compilation emits `components/ui/carousel.tsx`, `components/ui/carousel.css` and `examples/carousel.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0.

## Base UI edition

The Base UI edition uses the same template. shadcn builds Carousel on Embla; this one has no dependency, so it does not drag with a mouse, loop or autoplay.

## Liquid glass

Liquid glass support is experimental: the buttons use a translucent surface.
