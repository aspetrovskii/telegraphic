import { expect, test } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixtureJson = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'packages',
  'shared',
  'fixtures',
  'valid-tiny',
  'result.json',
)

/**
 * Phase 4 — Total & Data panels acceptance:
 * add fixture export; tweak every Total control (live); rename/hide/delete.
 */
test.describe('editor Total & Data panels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/fixture')
    await expect(page.getByTestId('editor-shell')).toBeVisible()
  })

  test('Total controls are live-bound to the rating canvas', async ({ page }) => {
    await page.getByTestId('panel-toggle-total').click()
    await expect(page.getByTestId('panel-total')).toBeVisible()
    await expect(page.getByTestId('total-panel')).toBeVisible()

    const canvas = page.getByTestId('editor-engine-canvas')
    const rect = page.getByTestId('rating-rectangle')

    // Top N
    await page.getByTestId('topn-input').fill('2')
    await expect(page.getByTestId('topn-input')).toHaveValue('2')

    // Scale
    await page.getByTestId('scale-slider').fill('250')
    await expect(page.getByTestId('scale-slider')).toHaveValue('250')

    // Screen size preset → custom dims change rating rectangle
    await page.getByTestId('screen-size-preset').selectOption('1080x1080')
    await expect(rect).toHaveCSS('width', '1080px')
    await expect(rect).toHaveCSS('height', '1080px')
    await page.getByTestId('screen-size-preset').selectOption('custom')
    await page.getByTestId('screen-width').fill('640')
    await page.getByTestId('screen-height').fill('360')
    await expect(rect).toHaveCSS('width', '640px')
    await expect(rect).toHaveCSS('height', '360px')
    await expect(canvas).toHaveAttribute('width', '640')
    await expect(canvas).toHaveAttribute('height', '360')

    // Speed mode + value
    await page.getByTestId('speed-mode-daysPerSecond').click()
    await expect(page.getByTestId('speed-mode-daysPerSecond')).toHaveClass(/is-active/)
    await page.getByTestId('speed-value').fill('10')
    await page.getByTestId('speed-mode-totalLength').click()
    await page.getByTestId('speed-value').fill('8')

    // Delays + smoothing
    await page.getByTestId('start-delay').fill('1')
    await page.getByTestId('finish-delay').fill('2')
    await page.getByTestId('smoothing-interval').fill('2')

    // Dates interval (fixture spans 2020)
    await page.getByTestId('dates-start').fill('2020-03-01')
    await page.getByTestId('dates-end').fill('2020-09-01')
    await expect(page.getByTestId('dates-start')).toHaveValue('2020-03-01')

    // Duration reflects speed + delays: 1 + 8 + 2 = 11s
    await expect(page.getByTestId('player-time')).toContainText('0:11')
  })

  test('Data panel: import fixture, rename, hide, delete', async ({ page }) => {
    await page.getByTestId('panel-toggle-data').click()
    await expect(page.getByTestId('data-panel')).toBeVisible()

    const beforeCount = await page.getByTestId('record-list').locator('li').count()

    await page.getByTestId('add-record').click()
    await expect(page.getByTestId('import-modal')).toBeVisible()
    await page.getByTestId('import-file-input').setInputFiles(fixtureJson)

    await expect(page.getByTestId('import-modal')).toHaveCount(0, { timeout: 15_000 })
    await expect(page.getByTestId('record-list').locator('li')).toHaveCount(beforeCount + 1)

    const aliceRow = page.locator('[data-testid^="record-row-"]').filter({ hasText: 'Alice' })
    await expect(aliceRow).toBeVisible()
    const aliceId = await aliceRow.getAttribute('data-record-id')
    expect(aliceId).toBeTruthy()

    // Rename
    await page.getByTestId(`record-menu-${aliceId}`).click()
    await page.getByTestId(`record-rename-action-${aliceId}`).click()
    await page.getByTestId(`record-rename-${aliceId}`).fill('Alice Renamed')
    await page.getByTestId(`record-rename-${aliceId}`).press('Enter')
    await expect(page.getByTestId(`record-title-${aliceId}`)).toHaveText('Alice Renamed')

    // Hide
    await page.getByTestId(`record-visibility-${aliceId}`).click()
    await expect(page.getByTestId(`record-row-${aliceId}`)).toHaveClass(/is-hidden/)

    // Search
    await page.getByTestId('record-search').fill('Alice Renamed')
    await expect(page.getByTestId('record-list').locator('li')).toHaveCount(1)

    // Delete
    await page.getByTestId(`record-menu-${aliceId}`).click()
    await page.getByTestId(`record-delete-${aliceId}`).click()
    await expect(page.getByTestId(`record-row-${aliceId}`)).toHaveCount(0)
  })
})
