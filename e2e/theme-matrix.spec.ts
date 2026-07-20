import { expect, test } from '@playwright/test'

/**
 * Phase 5 acceptance — visual snapshot matrix:
 * each theme control changes exactly its target (engine canvas).
 * Timer formats and change animations verified frame-by-frame at mid race.
 */

function themeUrl(theme: unknown, t: string | number = 'mid'): string {
  return `/engine-fixture?t=${t}&theme=${encodeURIComponent(JSON.stringify(theme))}`
}

async function snap(page: import('@playwright/test').Page, name: string) {
  const canvas = page.getByTestId('engine-canvas')
  await expect(canvas).toBeVisible()
  await expect(canvas).toHaveScreenshot(name, { maxDiffPixelRatio: 0.02 })
}

test.describe('theme visual matrix', () => {
  test('baseline mid frame', async ({ page }) => {
    await page.goto('/engine-fixture?t=mid')
    await snap(page, 'theme-baseline-mid.png')
  })

  test('value frontiers stripes vs off', async ({ page }) => {
    await page.goto(themeUrl({ background: { valueFrontiers: 'stripes' } }))
    await snap(page, 'theme-frontiers-stripes.png')
    await page.goto(themeUrl({ background: { valueFrontiers: 'off' } }))
    await snap(page, 'theme-frontiers-off.png')
  })

  test('filling color', async ({ page }) => {
    await page.goto(themeUrl({ background: { filling: { color: '#e8f4fc', mode: 'solid' } } }))
    await snap(page, 'theme-filling-blue.png')
  })

  test('timer position and format variants', async ({ page }) => {
    await page.goto(
      themeUrl({
        background: {
          timer: { position: 'top-left', format: 'YYYY', fontSize: 40, backdrop: 'pill' },
        },
      }),
    )
    await snap(page, 'theme-timer-yyyy-top-left.png')

    await page.goto(
      themeUrl({
        background: { timer: { format: 'DD/MM/YY', position: 'bottom-right', fontSize: 36 } },
      }),
    )
    await snap(page, 'theme-timer-ddmmyy.png')

    await page.goto(
      themeUrl({
        background: { timer: { format: 'Q# YYYY', position: 'bottom-left', fontSize: 36 } },
      }),
    )
    await snap(page, 'theme-timer-quarter.png')

    await page.goto(
      themeUrl({
        background: { timer: { show: false } },
      }),
    )
    await snap(page, 'theme-timer-hidden.png')
  })

  test('timer change animations frame-by-frame at mid', async ({ page }) => {
    for (const anim of ['none', 'fade', 'slide-up', 'odometer'] as const) {
      await page.goto(
        themeUrl({
          background: {
            timer: {
              format: 'MMM YYYY',
              changeAnimation: anim,
              fontSize: 40,
              backdrop: 'rectangle',
            },
          },
        }),
      )
      await snap(page, `theme-timer-anim-${anim}-mid.png`)
    }
  })

  test('card geometry and labels', async ({ page }) => {
    await page.goto(
      themeUrl({
        card: {
          barHeight: 48,
          barGap: 16,
          barCornerRadius: 14,
          barFillStyle: 'horizontal-gradient',
          shadow: 'soft',
          rankShow: false,
          valueLabel: { format: 'raw', position: 'inside-end' },
          avatar: { shape: 'square', size: 36 },
        },
      }),
    )
    await snap(page, 'theme-card-geometry.png')
  })

  test('compact vs raw value format', async ({ page }) => {
    await page.goto(themeUrl({ card: { valueLabel: { format: 'compact', decimals: 1 } } }))
    await snap(page, 'theme-value-compact.png')
    await page.goto(themeUrl({ card: { valueLabel: { format: 'raw', thousandsSeparator: true } } }))
    await snap(page, 'theme-value-raw.png')
  })
})
