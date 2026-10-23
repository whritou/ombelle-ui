import { expect, type Page } from '@playwright/test'

export async function componentPresetHostStyles(page: Page) {
  return page.getByTestId('specimen').evaluate((el) =>
    Array.from(el.querySelectorAll('[data-slot]')).map((n) => {
      const s = getComputedStyle(n)
      return [
        s.color,
        s.backgroundColor,
        s.border,
        s.borderRadius,
        s.height,
        s.boxShadow,
        s.fontSize,
      ]
    }),
  )
}

export async function componentPresetIsolationBaseline(
  page: Page,
  hostFamily: string,
  mode: string,
) {
  // This separate module graph imports ordinary components and host CSS only.
  // No filtering by selectors: even accidentally unscoped preset rules stay out.
  const baseline = await page.context().newPage()
  const presetRequests: string[] = []
  baseline.on('request', (request) => {
    if (/\/(?:scoped-)?presets\//.test(new URL(request.url()).pathname))
      presetRequests.push(request.url())
  })
  try {
    await baseline.setViewportSize(
      page.viewportSize() ?? { width: 1100, height: 800 },
    )
    await baseline.emulateMedia({
      reducedMotion: 'reduce',
      forcedColors: 'none',
    })
    await baseline.goto(
      `http://127.0.0.1:4173/src/generated/${hostFamily}/isolation-baseline.html?mode=${mode}`,
    )
    await expect(baseline.locator('main')).toHaveAttribute('data-ready', 'true')
    await baseline.evaluate(() => document.fonts.ready)
    expect(
      presetRequests,
      'Isolation baseline imported component preset source or CSS',
    ).toEqual([])
    return await componentPresetHostStyles(baseline)
  } finally {
    await baseline.close()
  }
}

export async function assertComponentPresetHostIsolation(
  page: Page,
  baseline: Awaited<ReturnType<typeof componentPresetHostStyles>>,
) {
  expect(
    await componentPresetHostStyles(page),
    'Component preset changed ordinary host styles',
  ).toEqual(baseline)
}
