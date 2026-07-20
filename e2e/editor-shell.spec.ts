import { expect, test } from '@playwright/test'

/**
 * Phase 3 — editor shell acceptance:
 * pan/zoom, 30fps playback on fixture, panel toggles.
 */

test.describe('editor shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/fixture')
    await expect(page.getByTestId('editor-shell')).toBeVisible()
    await expect(page.getByTestId('editor-engine-canvas')).toBeVisible()
  })

  test('panel buttons toggle empty panels', async ({ page }) => {
    await expect(page.getByTestId('panel-total')).toHaveCount(0)

    await page.getByTestId('panel-toggle-total').click()
    await expect(page.getByTestId('panel-total')).toBeVisible()
    await expect(page.getByTestId('panel-total')).toContainText('Total')

    // Exclusive left panel
    await page.getByTestId('panel-toggle-data').click()
    await expect(page.getByTestId('panel-total')).toHaveCount(0)
    await expect(page.getByTestId('panel-data')).toBeVisible()

    await page.getByTestId('panel-toggle-share').click()
    await expect(page.getByTestId('panel-share')).toBeVisible()

    // Toggle same button closes
    await page.getByTestId('panel-toggle-share').click()
    await expect(page.getByTestId('panel-share')).toHaveCount(0)

    await page.getByTestId('panel-toggle-design').click()
    await expect(page.getByTestId('panel-design')).toBeVisible()
    await page.getByTestId('panel-toggle-design').click()
    await expect(page.getByTestId('panel-design')).toHaveCount(0)
  })

  test('pan and zoom work', async ({ page }) => {
    const world = page.getByTestId('canvas-world')
    const before = await world.evaluate((el) => el.style.transform)

    // Zoom in via control
    await page.getByRole('button', { name: 'Zoom in' }).click()
    await page.getByRole('button', { name: 'Zoom in' }).click()
    const afterZoom = await world.evaluate((el) => el.style.transform)
    expect(afterZoom).not.toBe(before)
    await expect(page.getByTestId('zoom-percent')).not.toHaveText('100%')

    // Pan with middle-button drag
    const viewport = page.getByTestId('canvas-viewport')
    const box = await viewport.boundingBox()
    if (!box) throw new Error('viewport missing')
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    await page.mouse.move(cx, cy)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(cx + 120, cy + 80)
    await page.mouse.up({ button: 'middle' })
    const afterPan = await world.evaluate((el) => el.style.transform)
    expect(afterPan).not.toBe(afterZoom)

    // Fit resets toward a sensible framing
    await page.getByTestId('zoom-fit').click()
    const afterFit = await world.evaluate((el) => el.style.transform)
    expect(afterFit).toMatch(/translate\(/)
    expect(afterFit).toMatch(/scale\(/)
  })

  test('playback advances at ~30fps on fixture project', async ({ page }) => {
    await page.getByTestId('player-play').click()
    await expect(page.getByTestId('player-play')).toHaveAttribute('aria-label', 'Pause')

    // Wait ~500ms of wall time → expect ~15 frames at 30fps (± tolerance)
    await page.waitForTimeout(500)
    const frames = await page.evaluate(() => {
      const fn = (
        window as unknown as { __telegraphicPlaybackFrames?: () => number }
      ).__telegraphicPlaybackFrames
      return fn ? fn() : 0
    })
    expect(frames).toBeGreaterThanOrEqual(10)
    expect(frames).toBeLessThanOrEqual(20)

    // Scrub updates engine time
    await page.getByTestId('player-play').click()
    const scrub = page.getByTestId('player-scrub')
    await scrub.fill('2')
    await expect(page.getByTestId('player-time')).toContainText('0:02')
  })
})
