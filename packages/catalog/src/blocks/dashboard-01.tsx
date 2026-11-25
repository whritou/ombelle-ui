// Placeholder: replaced by the real dashboard-01 block.
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { Meter } from '@/components/ui/meter'
import { Progress } from '@/components/ui/progress'
import { Table } from '@/components/ui/table'
import { Tabs } from '@/components/ui/tabs'
import { Toast } from '@/components/ui/toast'

const parts = [Avatar, Badge, Button, Card, DropdownMenu, Meter, Progress, Table, Tabs, Toast]

export function Block() {
  void parts
  return (
    <section data-block="dashboard-01">
      <h2>Ombelle overview</h2>
    </section>
  )
}
