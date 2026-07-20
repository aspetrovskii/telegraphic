import { expect, test } from '@playwright/test'

test('scaffold health page loads and shows shared status', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Telegraphic' })).toBeVisible()
  await expect(page.getByTestId('shared-status')).toHaveText('ok')
  await expect(page.getByTestId('api-status')).toHaveText('ok')
})

test('api health endpoint responds', async ({ request }) => {
  const res = await request.get('http://127.0.0.1:8787/api/health')
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body.ok).toBe(true)
  expect(body.service).toBe('telegraphic-api')
})
