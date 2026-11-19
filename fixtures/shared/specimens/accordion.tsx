'use client'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'

export function Specimen() {
  return (
    <section aria-label="Questions" data-component="accordion">
      <h2>Questions</h2>
      <Accordion type="single" collapsible defaultValue="preset">
        <AccordionItem value="preset">
          <AccordionTrigger>What does a preset change?</AccordionTrigger>
          <AccordionContent>
            Colors, radius, borders, shadows and type. Installed source
            stays yours to edit.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="edit">
          <AccordionTrigger>Can I edit installed components?</AccordionTrigger>
          <AccordionContent>
            Yes. The CLI only replaces a file you have not changed.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="families">
          <AccordionTrigger>Which families are stable?</AccordionTrigger>
          <AccordionContent>
            Flat, minimalist, neo brutalism, ombelle, papier, organic and retro futurism. Liquid glass is
            experimental.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}
