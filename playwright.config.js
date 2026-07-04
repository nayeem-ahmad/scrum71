// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:7890',
    headless: !!process.env.CI,
    slowMo: process.env.CI ? 0 : 300,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/story-mobile-responsive.spec.js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-iphone',
      testMatch: '**/story-mobile-responsive.spec.js',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'mobile-pixel',
      testMatch: '**/story-mobile-responsive.spec.js',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 7890',
    url: 'http://localhost:7890',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
