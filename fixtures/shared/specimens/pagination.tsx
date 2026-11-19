'use client'
import { Pagination, PaginationCompact, PaginationContent, PaginationItem, PaginationLink, PaginationPageSize, PaginationPrevious, PaginationNext, PaginationEllipsis } from '@/components/ui/pagination'

export function Specimen() {
  return (
    <section aria-label="Pagination" data-component="pagination">
      <h2>Pagination</h2><Pagination><PaginationContent>
        <PaginationItem><PaginationPrevious disabled /></PaginationItem>
        <PaginationItem><PaginationLink href="#page-1" isActive aria-label="Page 1">1</PaginationLink></PaginationItem>
        <PaginationItem><PaginationLink href="#page-2" aria-label="Page 2">2</PaginationLink></PaginationItem>
        <PaginationItem><PaginationEllipsis /></PaginationItem>
        <PaginationItem><PaginationNext href="#page-2" /></PaginationItem>
      </PaginationContent></Pagination>
      <div className="preset-variants">
        <Pagination aria-label="Compact pages"><PaginationCompact page={2} pageCount={12} previousHref="#page-1" nextHref="#page-3" /></Pagination>
        <PaginationPageSize value={25} range="1–25 of 290" />
      </div>
    </section>
  )
}
