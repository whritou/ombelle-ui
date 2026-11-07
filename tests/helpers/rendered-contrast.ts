import type { Locator } from '@playwright/test'
import { resolveColor, type Srgba } from './color-compare.js'
import { contrastRatio } from './contrast.js'

/** Resolve CSS colour spaces and composite transparent backgrounds through the DOM. */
export async function renderedTextContrast(locator: Locator) {
  const sample = await locator.evaluate((element) => {
    const backgrounds: string[] = []
    for (let node: Element | null = element; node; node = node.parentElement)
      backgrounds.push(getComputedStyle(node).backgroundColor)
    const probe = document.createElement('span')
    probe.style.color = 'Canvas'
    document.body.append(probe)
    const canvas = getComputedStyle(probe).color
    probe.remove()
    return { color: getComputedStyle(element).color, backgrounds, canvas }
  })
  const over = (foreground: Srgba, background: Srgba['rgb']): Srgba['rgb'] =>
    foreground.rgb.map((channel, index) =>
      channel * foreground.alpha + background[index] * (1 - foreground.alpha),
    ) as Srgba['rgb']
  const background = sample.backgrounds.reduceRight(
    (behind, value) => over(resolveColor(value), behind),
    resolveColor(sample.canvas).rgb,
  )
  const foreground = over(resolveColor(sample.color), background)
  return { ...sample, foreground, background, ratio: contrastRatio(foreground, background) }
}
