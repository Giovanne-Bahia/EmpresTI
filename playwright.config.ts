import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: process.env.EMPRESTI_TEST_BASE_URL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  reporter: 'list',
})
