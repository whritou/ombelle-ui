'use client'
/**
 * pricing-01: three plans with a monthly or yearly toggle, a highlighted plan and feature lists.
 * The plan cards stack on phones and sit side by side from 768px (see pricing-01.css).
 *
 * Example only: the prices below are example figures, and the plan buttons never contact a
 * server. They call showExampleNotice(), which shows a Toast. Replace the figures in
 * exampleData and that function with your own plans and checkout. The layout lives in
 * pricing-01.css; the look comes from your preset's components.
 */
import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import './pricing-01.css'

const exampleData = {
  title: 'Pricing for Ombelle',
  description: 'Pick the plan that fits your team. Switch to yearly billing to save.',
  exampleNote: 'Example prices: these figures are placeholders, not an offer.',
  recommended: 'Recommended',
  yearlyNote: 'Yearly billing shows the monthly equivalent, billed once a year.',
  plans: [
    {
      id: 'starter',
      name: 'Starter',
      description: 'For individuals trying Ombelle out.',
      price: { monthly: 0, yearly: 0 },
      features: ['1 workspace', 'Up to 3 projects', 'Community support'],
      highlighted: false,
    },
    {
      id: 'team',
      name: 'Team',
      description: 'For small teams shipping together.',
      price: { monthly: 12, yearly: 10 },
      features: ['Unlimited projects', 'Up to 10 members', 'Priority email support', 'Shared presets'],
      highlighted: true,
    },
    {
      id: 'business',
      name: 'Business',
      description: 'For larger teams that need more control.',
      price: { monthly: 29, yearly: 24 },
      features: ['Everything in Team', 'Unlimited members', 'Audit log', 'Single sign-on'],
      highlighted: false,
    },
  ],
}

type Billing = 'monthly' | 'yearly'

export function Pricing01() {
  const [billing, setBilling] = React.useState<Billing>('monthly')
  const [notice, setNotice] = React.useState<{ id: number; title: string; message: string } | null>(null)
  const titleId = React.useId()

  // Replace with your plan selection. It is the only example-only code in this block.
  function showExampleNotice(title: string, message: string) {
    setNotice((current) => ({ id: (current?.id ?? 0) + 1, title, message }))
  }

  return (
    <ToastProvider>
      <section data-block="pricing-01" aria-labelledby={titleId}>
        <div data-block-part="intro">
          <h2 id={titleId}>{exampleData.title}</h2>
          <p>{exampleData.description}</p>
          <ToggleGroup
            type="single"
            aria-label="Billing period"
            value={billing}
            onValueChange={(value) => value && setBilling(value as Billing)}
          >
            <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
            <ToggleGroupItem value="yearly">Yearly</ToggleGroupItem>
          </ToggleGroup>
          <p data-block-part="note">
            {exampleData.exampleNote} {billing === 'yearly' ? exampleData.yearlyNote : null}
          </p>
        </div>
        <ul data-block-part="plans">
          {exampleData.plans.map((plan) => (
            <li key={plan.id} data-block-part="plan" data-highlighted={plan.highlighted ? '' : undefined}>
              <Card data-block-part="card">
                <CardHeader>
                  <CardTitle>
                    {plan.name}
                    {plan.highlighted ? <Badge>{exampleData.recommended}</Badge> : null}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p data-block-part="price">
                    <strong>${plan.price[billing]}</strong>
                    <span>{plan.price.monthly === 0 ? 'free' : 'per member, per month'}</span>
                  </p>
                  <Separator />
                  <ul data-block-part="features">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    variant={plan.highlighted ? 'default' : 'outline'}
                    data-block-part="choose"
                    onClick={() =>
                      showExampleNotice(
                        `${plan.name} was not chosen`,
                        `Example only: "Choose ${plan.name}" did nothing`,
                      )
                    }
                  >
                    Choose {plan.name}
                  </Button>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
        {notice ? (
          <Toast key={notice.id} defaultOpen onOpenChange={(open) => !open && setNotice(null)}>
            <ToastTitle>{notice.title}</ToastTitle>
            <ToastDescription>{notice.message}</ToastDescription>
            <ToastClose />
          </Toast>
        ) : null}
        {/* Rendered even when empty, so the live region exists before the first toast. */}
        <ToastViewport />
      </section>
    </ToastProvider>
  )
}
