import { defineConfig, devices } from '@playwright/test'

const webPort = 4173
const apiPort = 8787

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: `pnpm --filter @telegraphic/api exec tsx src/index.ts`,
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        PORT: String(apiPort),
        DATABASE_URL: 'file::memory:',
        NODE_ENV: 'test',
      },
    },
    {
      command: `pnpm --filter @telegraphic/web build && pnpm --filter @telegraphic/web exec vite preview --host 127.0.0.1 --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
