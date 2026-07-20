import { expect, test } from '@playwright/test'

test('sign up, save project, see it on home, reload persists', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`
  const password = 'password123'
  const title = `Race ${Date.now()}`

  await page.goto('/sign-up')
  await page.getByTestId('signup-email').fill(email)
  await page.getByTestId('signup-password').fill(password)
  await page.getByTestId('signup-submit').click()

  await expect(page.getByTestId('home-page')).toBeVisible()
  await expect(page.getByTestId('user-email')).toHaveText(email)
  await expect(page.getByTestId('home-empty')).toBeVisible()

  await page.getByTestId('empty-create').click()
  await expect(page.getByTestId('project-grid')).toBeVisible()
  await expect(page.getByTestId('project-card').first()).toBeVisible()
  await expect(page.getByTestId('project-title').first()).toHaveText('Untitled rating')

  await page.getByTestId('project-title').first().click()
  await expect(page.getByTestId('edit-stub')).toBeVisible()
  await page.getByTestId('edit-title').fill(title)
  await page.getByTestId('save-project').click()
  await expect(page.getByTestId('save-ok')).toBeVisible()

  await page.getByTestId('back-home').click()
  await expect(page.getByTestId('home-page')).toBeVisible()
  await expect(page.getByTestId('project-title').first()).toHaveText(title)

  await page.reload()
  await expect(page.getByTestId('home-page')).toBeVisible()
  await expect(page.getByTestId('user-email')).toHaveText(email)
  await expect(page.getByTestId('project-title').first()).toHaveText(title)
})
