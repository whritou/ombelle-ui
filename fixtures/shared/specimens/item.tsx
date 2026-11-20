'use client'
import { Button } from '@/components/ui/button'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'

export function Specimen() {
  return (
    <section aria-label="Item" data-component="item">
      <h2>Item</h2>
      <ItemGroup aria-label="Projects">
        <Item variant="outline"><ItemMedia variant="icon" aria-hidden="true">P</ItemMedia><ItemContent><ItemTitle>Website refresh</ItemTitle><ItemDescription>On track, due Friday.</ItemDescription></ItemContent></Item>
        <Item variant="outline" asChild>
          <a href="#billing"><ItemContent><ItemTitle>Billing migration</ItemTitle><ItemDescription>Shipped 10 minutes ago.</ItemDescription></ItemContent></a>
          <ItemActions><Button variant="outline" size="sm">Archive</Button></ItemActions>
        </Item>
      </ItemGroup>
    </section>
  )
}
