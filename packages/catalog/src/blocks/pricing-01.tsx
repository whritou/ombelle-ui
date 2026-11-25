// Placeholder: replaced by the real pricing-01 block.
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Toast } from '@/components/ui/toast'
import { ToggleGroup } from '@/components/ui/toggle-group'

const parts = [Badge, Button, Card, Separator, Toast, ToggleGroup]

export function Block() {
  void parts
  return (
    <section data-block="pricing-01">
      <h2>Ombelle pricing</h2>
    </section>
  )
}
