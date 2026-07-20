import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const screenshotsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'docs',
  'screenshots',
  'phase-5',
)

/**
 * Phase 5 — Design panel acceptance:
 * Background + Card controls live-bound to theme → engine canvas.
 */
test.describe('editor Design panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/fixture')
    await expect(page.getByTestId('editor-shell')).toBeVisible()
    await page.getByTestId('panel-toggle-design').click()
    await expect(page.getByTestId('design-panel')).toBeVisible()
  })

  test('Background controls update theme and canvas', async ({ page }) => {
    await expect(page.getByTestId('design-background')).toBeVisible()

    await page.getByTestId('frontiers-stripes').click()
    await expect(page.getByTestId('frontiers-stripes')).toHaveClass(/is-active/)

    await page.getByTestId('filling-color').fill('#f3f4f6')
    await expect(page.getByTestId('filling-color')).toHaveValue('#f3f4f6')

    await page.getByTestId('timer-format').selectOption('YYYY')
    await expect(page.getByTestId('timer-format')).toHaveValue('YYYY')

    await page.getByTestId('timer-pos-top-left').click()
    await expect(page.getByTestId('timer-pos-top-left')).toHaveClass(/is-active/)

    await page.getByTestId('timer-backdrop').selectOption('pill')
    await page.getByTestId('timer-animation').selectOption('odometer')
    await expect(page.getByTestId('timer-animation')).toHaveValue('odometer')

    await page.getByTestId('timer-show').click()
    await expect(page.getByTestId('timer-show')).toHaveAttribute('aria-checked', 'false')

    await mkdir(screenshotsDir, { recursive: true })
    await page.screenshot({
      path: join(screenshotsDir, 'design-background.png'),
      fullPage: true,
    })
  })

  test('Card controls and per-card overrides', async ({ page }) => {
    await page.getByTestId('design-tile-card').click()
    await expect(page.getByTestId('design-card')).toBeVisible()

    await page.getByTestId('bar-height').fill('44')
    await expect(page.getByTestId('bar-height')).toHaveValue('44')
    await page.getByTestId('bar-gap').fill('14')
    await page.getByTestId('bar-radius').fill('10')
    await page.getByTestId('value-format').selectOption('raw')
    await page.getByTestId('fill-horizontal-gradient').click()
    await expect(page.getByTestId('fill-horizontal-gradient')).toHaveClass(/is-active/)
    await page.getByTestId('bar-shadow').selectOption('soft')
    await page.getByTestId('rank-show').click()
    await expect(page.getByTestId('rank-show')).toHaveAttribute('aria-checked', 'false')

    const recordSelect = page.getByTestId('selected-record')
    const options = await recordSelect.locator('option').allTextContents()
    expect(options.length).toBeGreaterThan(0)
    await page.getByTestId('record-bar-color').fill('#10b981')
    await page.getByTestId('record-name-color').fill('#111827')

    await mkdir(screenshotsDir, { recursive: true })
    await page.screenshot({
      path: join(screenshotsDir, 'design-card.png'),
      fullPage: true,
    })
  })
})
