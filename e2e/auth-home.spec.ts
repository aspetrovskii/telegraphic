import { expect, test } from '@playwright/test'

test('sign up, open editor, rename on home, reload persists', async ({ page }) => {
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

  // Phase 3 replaces the edit stub with the editor shell
  await page.getByTestId('project-title').first().click()
  await expect(page.getByTestId('editor-shell')).toBeVisible()
  await expect(page.getByTestId('editor-engine-canvas')).toBeVisible()
  await page.getByTestId('editor-back').click()
  await expect(page.getByTestId('home-page')).toBeVisible()

  // Rename from home (Phase 7) — editor title save is later phases
  await page.getByTestId('project-menu').first().click()
  await page.getByRole('button', { name: 'Rename' }).click()
  await page.getByTestId('rename-input').fill(title)
  await page.getByTestId('rename-input').press('Enter')
  await expect(page.getByTestId('project-title').first()).toHaveText(title)

  await page.reload()
  await expect(page.getByTestId('home-page')).toBeVisible()
  await expect(page.getByTestId('user-email')).toHaveText(email)
  await expect(page.getByTestId('project-title').first()).toHaveText(title)
})
