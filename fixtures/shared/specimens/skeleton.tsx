'use client'
import { Skeleton } from '@/components/ui/skeleton'

export function Specimen() {
  return (
    <section aria-label="Loading" data-component="skeleton">
      <h2>Loading</h2>
      <div className="preset-stack" role="group" aria-busy="true" aria-label="Loading project">
        <div className="preset-row preset-skeleton-card">
          <Skeleton shape="circle" />
          <div className="preset-stack preset-grow">
            <Skeleton style={{ inlineSize: '60%' }} />
            <Skeleton style={{ inlineSize: '85%' }} />
          </div>
        </div>
        <Skeleton shape="block" />
        <Skeleton style={{ inlineSize: '70%' }} />
      </div>
    </section>
  )
}
