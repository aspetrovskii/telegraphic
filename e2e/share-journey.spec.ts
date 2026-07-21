import { expect, test, type Browser, type Page } from '@playwright/test'
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

type LastExport = {
  format: 'mp4' | 'webm'
  byteLength: number
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

async function suppressDownloadClick(page: Page) {
  await page.evaluate(() => {
    const orig = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function patched(this: HTMLAnchorElement) {
      if (this.download) return
      return orig.call(this)
    }
  })
}

/**
 * Phase 8 acceptance: import → customize → save → share (incognito) → download → duplicate.
 */
test('full share journey', async ({ page, browser }: { page: Page; browser: Browser }) => {
  const email = `share-e2e-${Date.now()}@example.com`
  const password = 'password123'
  const title = `Shared race ${Date.now()}`

  await page.goto('/sign-up')
  await page.getByTestId('signup-email').fill(email)
  await page.getByTestId('signup-password').fill(password)
  await page.getByTestId('signup-submit').click()
  await expect(page.getByTestId('home-page')).toBeVisible()

  await page.getByTestId('empty-create').click()
  await expect(page.getByTestId('project-card').first()).toBeVisible()
  await page.getByTestId('project-title').first().click()
  await expect(page.getByTestId('editor-shell')).toBeVisible()

  // Customize title + shorten export for CI.
  await page.getByTestId('editor-title').fill(title)
  await page.getByTestId('panel-toggle-total').click()
  await page.getByTestId('speed-mode-totalLength').click()
  await page.getByTestId('speed-value').fill('2')
  await page.getByTestId('start-delay').fill('0')
  await page.getByTestId('finish-delay').fill('0')

  // Import fixture chat.
  await page.getByTestId('panel-toggle-data').click()
  await page.getByTestId('add-record').click()
  await page.getByTestId('import-file-input').setInputFiles(fixtureJson)
  await expect(page.getByTestId('record-list').locator('li')).toHaveCount(1, { timeout: 15_000 })

  // Wait for autosave.
  await expect(page.getByTestId('editor-save-status')).toHaveText(/Saved|Saving/, {
    timeout: 15_000,
  })
  await expect(page.getByTestId('editor-save-status')).toHaveText('Saved', { timeout: 15_000 })

  // Share link.
  await page.getByTestId('panel-toggle-share').click()
  await expect(page.getByTestId('share-panel')).toBeVisible()
  await expect(page.getByTestId('share-empty')).toBeVisible()
  await page.getByTestId('share-make-link').click()
  await expect(page.getByTestId('share-link-row').first()).toBeVisible()
  const urlPath = await page.getByTestId('share-link-row').first().locator('code').innerText()
  expect(urlPath).toMatch(/^\/p\/[A-Za-z0-9_-]{16,}$/)

  // Incognito: open public page + download.
  const incognito = await browser.newContext()
  const guest = await incognito.newPage()
  await guest.goto(urlPath)
  await expect(guest.getByTestId('public-page')).toBeVisible()
  await expect(guest.getByTestId('public-title')).toHaveText(title)
  await expect(guest.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(guest.getByTestId('public-engine-canvas')).toBeVisible()
  await expect(guest.getByTestId('public-signin-hint')).toBeVisible()

  await suppressDownloadClick(guest)
  await guest.getByTestId('public-download').click()
  const exported = await waitForExport(guest, 120_000)
  expect(exported.byteLength).toBeGreaterThan(500)
  await incognito.close()

  // Owner: open public page and duplicate.
  await page.goto(urlPath)
  await expect(page.getByTestId('public-page')).toBeVisible()
  await page.getByTestId('public-duplicate').click()
  await expect(page.getByTestId('editor-shell')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('editor-title')).toHaveValue(`${title} (copy)`)

  await page.getByTestId('editor-back').click()
  await expect(page.getByTestId('home-page')).toBeVisible()
  await expect(page.getByTestId('project-title')).toHaveCount(2)
})

test('revoked share link shows error state', async ({ page }) => {
  const email = `revoke-e2e-${Date.now()}@example.com`
  const password = 'password123'

  await page.goto('/sign-up')
  await page.getByTestId('signup-email').fill(email)
  await page.getByTestId('signup-password').fill(password)
  await page.getByTestId('signup-submit').click()
  await page.getByTestId('empty-create').click()
  await page.getByTestId('project-title').first().click()
  await expect(page.getByTestId('editor-save-status')).toHaveText('Saved', { timeout: 10_000 })

  await page.getByTestId('panel-toggle-share').click()
  await page.getByTestId('share-make-link').click()
  const urlPath = await page.getByTestId('share-link-row').first().locator('code').innerText()
  await page.getByTestId('share-revoke').click()
  await expect(page.getByTestId('share-empty')).toBeVisible()

  await page.goto(urlPath)
  await expect(page.getByTestId('public-error')).toBeVisible()
})
