import { expect, test, type Page } from '@playwright/test'

type LastExport = {
  format: 'mp4' | 'webm'
  usingFallback: boolean
  width: number
  height: number
  fps: number
  durationSec: number
  frameCount: number
  byteLength: number
  mimeType: string
  filename: string
}

async function waitForExport(page: Page, timeoutMs: number): Promise<LastExport> {
  await page.waitForFunction(
    () => {
      const probe = (window as unknown as { __telegraphicLastExport?: LastExport })
        .__telegraphicLastExport
      return Boolean(probe && probe.byteLength > 0)
    },
    undefined,
    { timeout: timeoutMs },
  )
  return page.evaluate(() => {
    const probe = (window as unknown as { __telegraphicLastExport?: LastExport })
      .__telegraphicLastExport
    if (!probe) throw new Error('missing __telegraphicLastExport')
    return probe
  })
}

async function clearLastExport(page: Page): Promise<void> {
  await page.evaluate(() => {
    delete (window as unknown as { __telegraphicLastExport?: LastExport }).__telegraphicLastExport
  })
}

test.describe('player polish & MP4 export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/edit/fixture')
    await expect(page.getByTestId('editor-shell')).toBeVisible()
    await expect(page.getByTestId('player-download')).toBeVisible()
    await clearLastExport(page)
  })

  test('player exposes download + fullscreen controls', async ({ page }) => {
    await expect(page.getByTestId('player-download')).toHaveText('Download a video')
    await expect(page.getByTestId('player-fullscreen')).toBeVisible()
  })

  test('exported video duration/fps/size match settings', async ({ page }) => {
    // Short clip for CI speed; still asserts the planning contract.
    await page.getByTestId('panel-toggle-total').click()
    await page.getByTestId('speed-mode-totalLength').click()
    await page.getByTestId('speed-value').fill('2')
    await page.getByTestId('start-delay').fill('1')
    await page.getByTestId('finish-delay').fill('1')
    await page.getByTestId('screen-size-preset').selectOption('1080x1080')

    // Prevent real download navigation noise in headless.
    await page.evaluate(() => {
      const orig = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function patched(this: HTMLAnchorElement) {
        if (this.download) return
        return orig.call(this)
      }
    })

    await page.getByTestId('player-download').click()
    await expect(page.getByTestId('export-progress')).toBeVisible()

    const result = await waitForExport(page, 120_000)
    expect(result.fps).toBe(30)
    expect(result.width).toBe(1080)
    expect(result.height).toBe(1080)
    expect(result.durationSec).toBe(4) // 1 + 2 + 1
    expect(result.frameCount).toBe(120)
    expect(result.byteLength).toBeGreaterThan(1000)
    expect(result.format).toBe('mp4')
    expect(result.mimeType).toContain('mp4')
    expect(result.usingFallback).toBe(false)
  })

  test('export of a 30s 1080p fixture completes in Chrome', async ({ page }) => {
    test.setTimeout(300_000)

    await page.getByTestId('panel-toggle-total').click()
    await page.getByTestId('speed-mode-totalLength').click()
    await page.getByTestId('speed-value').fill('30')
    await page.getByTestId('start-delay').fill('0')
    await page.getByTestId('finish-delay').fill('0')
    await page.getByTestId('screen-size-preset').selectOption('1920x1080')

    await page.evaluate(() => {
      const orig = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function patched(this: HTMLAnchorElement) {
        if (this.download) return
        return orig.call(this)
      }
    })

    await page.getByTestId('player-download').click()
    const result = await waitForExport(page, 280_000)
    expect(result.width).toBe(1920)
    expect(result.height).toBe(1080)
    expect(result.fps).toBe(30)
    expect(result.durationSec).toBe(30)
    expect(result.frameCount).toBe(900)
    expect(result.byteLength).toBeGreaterThan(50_000)
    expect(result.format).toBe('mp4')
  })

  test('fallback path produces a playable WebM file', async ({ page }) => {
    test.setTimeout(120_000)

    await page.getByTestId('panel-toggle-total').click()
    await page.getByTestId('speed-mode-totalLength').click()
    await page.getByTestId('speed-value').fill('1')
    await page.getByTestId('start-delay').fill('0')
    await page.getByTestId('finish-delay').fill('0')
    // Keep resolution modest so MediaRecorder finishes quickly.
    await page.getByTestId('screen-size-preset').selectOption('1080x1080')

    await page.evaluate(() => {
      const orig = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function patched(this: HTMLAnchorElement) {
        if (this.download) return
        return orig.call(this)
      }
    })

    await page.getByTestId('player-download-fallback').click()
    await expect(page.getByTestId('export-fallback-notice')).toBeVisible()

    const result = await waitForExport(page, 90_000)
    expect(result.format).toBe('webm')
    expect(result.usingFallback).toBe(true)
    expect(result.mimeType).toContain('webm')
    expect(result.byteLength).toBeGreaterThan(500)
    expect(result.fps).toBe(30)
    expect(result.durationSec).toBe(1)
  })
})
