import { expect, test } from '@playwright/test'

/**
 * Phase 2 — visual snapshots of the shared engine at fixed times,
 * plus a pixel-level determinism check (two renders → identical data URL).
 */

test.describe('engine fixture visuals', () => {
  test('frame at t=0', async ({ page }) => {
    await page.goto('/engine-fixture?t=0')
    const canvas = page.getByTestId('engine-canvas')
    await expect(canvas).toBeVisible()
    await expect(canvas).toHaveScreenshot('engine-t0.png', {
      maxDiffPixelRatio: 0.02,
    })
  })

  test('frame at mid', async ({ page }) => {
    await page.goto('/engine-fixture?t=mid')
    const canvas = page.getByTestId('engine-canvas')
    await expect(canvas).toBeVisible()
    await expect(canvas).toHaveScreenshot('engine-t-mid.png', {
      maxDiffPixelRatio: 0.02,
    })
  })

  test('frame at end', async ({ page }) => {
    await page.goto('/engine-fixture?t=end')
    const canvas = page.getByTestId('engine-canvas')
    await expect(canvas).toBeVisible()
    await expect(canvas).toHaveScreenshot('engine-t-end.png', {
      maxDiffPixelRatio: 0.02,
    })
  })

  test('two renders produce identical pixels (determinism)', async ({ page }) => {
    await page.goto('/engine-fixture?t=mid')
    await expect(page.getByTestId('engine-canvas')).toBeVisible()

    const [a, b] = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="engine-canvas"]')
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('canvas missing')
      }
      const first = canvas.toDataURL('image/png')
      // Re-draw by reloading is expensive; instead call getImageData twice from the same buffer
      // and also force a second paint via a custom event path: clone pixels now, then
      // re-invoke by dispatching a no-op resize that the page ignores — instead compare
      // two consecutive toDataURL reads (same bitmap) AND a freshly rendered clone.
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('2d context missing')
      const copy = document.createElement('canvas')
      copy.width = canvas.width
      copy.height = canvas.height
      const copyCtx = copy.getContext('2d')
      if (!copyCtx) throw new Error('copy context missing')
      copyCtx.drawImage(canvas, 0, 0)
      const second = copy.toDataURL('image/png')
      return [first, second] as const
    })

    expect(a).toBe(b)
    expect(a.startsWith('data:image/png')).toBe(true)

    // Stronger check: navigate twice and compare data URLs across full render passes.
    const firstPass = a
    await page.goto('/engine-fixture?t=mid')
    await expect(page.getByTestId('engine-canvas')).toBeVisible()
    const secondPass = await page.locator('[data-testid="engine-canvas"]').evaluate((el) => {
      if (!(el instanceof HTMLCanvasElement)) throw new Error('canvas missing')
      return el.toDataURL('image/png')
    })
    expect(secondPass).toBe(firstPass)
  })
})
