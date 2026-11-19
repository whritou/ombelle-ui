'use client'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableCaption, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useGate } from './shared'

export function Specimen() {
  const gate = useGate()
  return (
    <section aria-label="Projects table" data-component="table">
      <h2>Projects table</h2>
      <Table>
        <TableCaption>4 of 12 projects · 1 selected</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead numeric>Components</TableHead>
            <TableHead numeric>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            ['Website refresh', 'Ada L.', 'AL', 'primary', 'On track', '12', '2 h ago', false],
            ['Mobile onboarding', 'Grace H.', 'GH', 'default', 'Needs attention', '8', 'Yesterday', false],
            ['Billing migration', 'Margaret K.', 'MK', 'secondary', 'On track', '5', 'Oct 28', true],
            ['Design system docs', 'Ada L.', 'AL', 'primary', 'Draft', '21', 'Oct 21', false],
          ].map(([project, owner, initials, tone, status, count, updated, selected]) => (
            <TableRow key={project as string} selected={selected as boolean}>
              <TableCell>{project}</TableCell>
              <TableCell>
                <span className="preset-row preset-tight">
                  {gate(
                    'avatar',
                    'Avatar',
                    <Avatar size="sm" variant={tone as 'default' | 'primary' | 'secondary'} aria-hidden="true">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>,
                  )}
                  {owner}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    status === 'Needs attention'
                      ? 'destructive'
                      : status === 'Draft'
                        ? 'outline'
                        : 'secondary'
                  }
                >
                  {status}
                </Badge>
              </TableCell>
              <TableCell numeric>{count}</TableCell>
              <TableCell numeric>{updated}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="preset-variant"><Table density="compact" striped><TableCaption>Compact project list</TableCaption><TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Website</TableCell><TableCell>Active</TableCell></TableRow><TableRow><TableCell>Mobile</TableCell><TableCell>Review</TableCell></TableRow><TableRow selected><TableCell>Billing</TableCell><TableCell>Selected</TableCell></TableRow></TableBody></Table></div>
    </section>
  )
}
