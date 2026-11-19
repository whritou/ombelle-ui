'use client'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

export function Specimen() {
  return (
    <section aria-label="Breadcrumb" data-component="breadcrumb">
      <h2>Breadcrumb</h2>
      <div className="preset-stack">
        <Breadcrumb aria-label="Gallery path"><BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="#home">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="#projects">Projects</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Website refresh</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList></Breadcrumb>
        <div data-component="breadcrumb~collapse" style={{ maxInlineSize: '16rem' }}>
          <Breadcrumb aria-label="Long gallery path" collapse="auto"><BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#home">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="#workspace">Acme workspace</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="#projects">Projects</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Website refresh</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList></Breadcrumb>
        </div>
      </div>
    </section>
  )
}
