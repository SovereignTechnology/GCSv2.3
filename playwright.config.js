// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 2,
  fullyParallel: false,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx serve . -l 3000 -s',
    port: 3000,
    timeout: 10000,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'Desktop',
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'Tablet',
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'Mobile',
      use: { viewport: { width: 480, height: 896 } },
    },
  ],
});
