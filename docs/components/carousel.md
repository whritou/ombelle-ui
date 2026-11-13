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

## Image carousel

`variant="image"` shows one framed image per view at `ratio` (a CSS aspect ratio, `16 / 9` by default), with the next image peeking at the edge. Draw each image with `CarouselImage` inside a `CarouselItem`, and add `CarouselThumbnails` for a row of buttons that jump to an image.

```tsx
import { Carousel, CarouselContent, CarouselCounter, CarouselImage, CarouselItem, CarouselNext, CarouselPrevious, CarouselThumbnails } from '@/components/ui/carousel'

export function FieldTrip({ photos }: { photos: { src: string; alt: string }[] }) {
  return (
    <Carousel aria-label="Field trip photos" variant="image" ratio="16 / 9">
      <CarouselContent>
        {photos.map((photo) => <CarouselItem key={photo.src}><CarouselImage src={photo.src} alt={photo.alt} /></CarouselItem>)}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
      <CarouselCounter />
      <CarouselThumbnails />
    </Carousel>
  )
}
```

- `CarouselImage` requires `alt`: TypeScript reports an image without it. Describe what the image shows; the thumbnails are named by the same text. Pass `alt=""` only for an image that adds nothing, and then its thumbnail is named "Slide 3".
- Images from the third slide on (index 2 and later, past the next one) load lazily: they get `loading="lazy"` unless you pass `loading`. The first two load with the page.
- `CarouselThumbnails` is a group named "Choose an image" with one button per slide, showing that slide's first `CarouselImage` and named by its alt text; the current one has `aria-current="true"` and full opacity, the others are dimmed. The thumbnail images themselves have empty alt text and load lazily, so each name is read once. Each thumbnail is 84px wide at the carousel's ratio; below 640px the row scrolls sideways instead of wrapping.
- Below 640px Previous and Next are hidden, as in every carousel; swiping, the viewport's arrow keys and the thumbnails remain.
- The thumbnails read the images while the carousel renders, from its children. They see a `CarouselImage` only when it is written in the JSX passed to `Carousel`, inside a `CarouselItem` that is a direct child of `CarouselContent`. Slides or images rendered inside a wrapper component of your own (`<Slide photo={…} />` that returns a `CarouselItem`, or an image component that returns a `CarouselImage`) are not seen: the slide is not counted for the thumbnails, or its thumbnail is an empty button named "Slide 3". Write the `CarouselItem` and `CarouselImage` elements directly in the list instead.

## Recipe

The recipe editor sets `dots`, `counter`, `slidesPerView`, `variant` (`default` or `image`), `thumbnails` (with `variant: 'image'` only) and the label and up to eight slides. An image recipe's specimen draws each slide as a small SVG data URI in its own hue, with the slide text as its alt text, because a recipe carries no image files. Recipes that set `variant` or `thumbnails` need CLI 0.7.6, as Carousel itself does; a recipe without them is unchanged. Compilation emits `components/ui/carousel.tsx`, `components/ui/carousel.css` and `examples/carousel.tsx`. Runtime dependencies are React 19.3.1, clsx 2.1.1, tailwind-merge 3.7.0 and lucide-react 1.55.0.

## Base UI edition

The Base UI edition uses the same template. shadcn builds Carousel on Embla; this one has no dependency, so it does not drag with a mouse, loop or autoplay.

## Liquid glass

Liquid glass support is experimental: the buttons use a translucent surface. The image frames and thumbnails keep the family border and radius.
