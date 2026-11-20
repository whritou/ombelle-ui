'use client'
import { Badge } from '@/components/ui/badge'
import { Card, CardFooter } from '@/components/ui/card'
import { Carousel, CarouselContent, CarouselCounter, CarouselDots, CarouselImage, CarouselItem, CarouselNext, CarouselPrevious, CarouselThumbnails } from '@/components/ui/carousel'
import { presetSlides, fieldTripPhotos } from './shared'

export function Specimen() {
  return (
    <section aria-label="Carousel" data-component="carousel">
      <h2>Carousel</h2>
      <Carousel aria-label="Built-in presets" slidesPerView={2}>
        <CarouselContent>
          {presetSlides.map(kit => (
            <CarouselItem key={kit.name}>
              <Card className="preset-slide">
                {/* A small picture of the kit; the slide is named by its title below. */}
                <div className="preset-slide-shot" aria-hidden="true" data-kit={kit.id}>
                  <span className="preset-slide-row"><span className="preset-slide-button">Get started</span><span className="preset-slide-button" data-outline="">Docs</span></span>
                  <span className="preset-slide-input">you@studio.app</span>
                  <span className="preset-slide-row"><span className="preset-slide-chip">Forms</span><span className="preset-slide-chip">Overlays</span></span>
                </div>
                <CardFooter className="preset-slide-meta"><strong>{kit.name}</strong><Badge variant={kit.stable ? 'secondary' : 'outline'}>{kit.stable ? 'Stable' : 'Experimental'}</Badge></CardFooter>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
        <CarouselDots />
        <CarouselCounter />
      </Carousel>
      <div data-component="carousel~image-thumbnails">
        <Carousel aria-label="Field trip photos" variant="image" ratio="16 / 9">
          <CarouselContent>
            {fieldTripPhotos.map(photo => <CarouselItem key={photo.alt}><CarouselImage src={photo.src} alt={photo.alt} /></CarouselItem>)}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
          <CarouselCounter />
          <CarouselThumbnails />
        </Carousel>
      </div>
    </section>
  )
}
