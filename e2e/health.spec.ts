import { expect, test } from '@playwright/test'

test('sign-in page is the unauthenticated entry', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByTestId('signin-email')).toBeVisible()
})

test('api health endpoint responds', async ({ request }) => {
  const res = await request.get('http://127.0.0.1:8787/api/health')
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body.ok).toBe(true)
  expect(body.service).toBe('telegraphic-api')
})
