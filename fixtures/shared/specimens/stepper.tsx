'use client'
import { Stepper, StepperItem, StepperIndicator, StepperTitle, StepperDescription, StepperSeparator } from '@/components/ui/stepper'

export function Specimen() {
  return (
    <section aria-label="Stepper" data-component="stepper">
      <h2>Stepper</h2>
      <Stepper aria-label="Setup">
        <StepperItem status="complete"><StepperIndicator>1</StepperIndicator><StepperTitle>Preset</StepperTitle><StepperDescription>Ombelle</StepperDescription><StepperSeparator /></StepperItem>
        <StepperItem status="current"><StepperIndicator>2</StepperIndicator><StepperTitle>Components</StepperTitle><StepperDescription>Choose 4</StepperDescription><StepperSeparator /></StepperItem>
        <StepperItem status="upcoming"><StepperIndicator>3</StepperIndicator><StepperTitle>Install CLI</StepperTitle></StepperItem>
      </Stepper>
    </section>
  )
}
