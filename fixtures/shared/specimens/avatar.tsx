'use client'
import { Avatar, AvatarFallback, AvatarOverflow, AvatarStatus, AvatarGroup } from '@/components/ui/avatar'

export function Specimen() {
  return (
    <section aria-label="People" data-component="avatar">
      <h2>People</h2>
      <div className="preset-row">
        <Avatar size="lg" variant="primary" role="img" aria-label="Ada Lovelace, online">
          <AvatarFallback>AL</AvatarFallback>
          <AvatarStatus />
        </Avatar>
        <Avatar role="img" aria-label="Grace Hopper">
          <AvatarFallback>GH</AvatarFallback>
        </Avatar>
        <Avatar size="sm" variant="secondary" role="img" aria-label="Margaret Knight">
          <AvatarFallback>MK</AvatarFallback>
        </Avatar>
      </div>
      <div className="preset-row">
        <AvatarGroup aria-label="Reviewers">
          <Avatar variant="primary" role="img" aria-label="Ada Lovelace">
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <Avatar role="img" aria-label="Grace Hopper">
            <AvatarFallback>GH</AvatarFallback>
          </Avatar>
          <Avatar variant="secondary" role="img" aria-label="Margaret Knight">
            <AvatarFallback>MK</AvatarFallback>
          </Avatar>
          <AvatarOverflow count={3} label="3 more reviewers" />
        </AvatarGroup>
        <Avatar shape="square" role="img" aria-label="Acme workspace">
          <AvatarFallback>AC</AvatarFallback>
        </Avatar>
        <span>6 people review this preset</span>
      </div>
    </section>
  )
}
