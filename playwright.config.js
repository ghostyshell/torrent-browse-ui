const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 3 : 2,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['line'],
    ['github'],
  ],
  use: {
    // Frontend app URL
    baseURL: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    // Disable other browsers for faster CI execution
    // Uncomment when needed for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: {
    //     ...require('@playwright/test').devices['Desktop Firefox'],
    //     viewport: { width: 1280, height: 720 },
    //   },
    // },
    // {
    //   name: 'mobile-chrome',
    //   use: {
    //     ...require('@playwright/test').devices['Pixel 5'],
    //   },
    // },
  ],
  outputDir: 'test-results/',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  globalSetup: require.resolve('./tests/setup.js'),
  globalTeardown: require.resolve('./tests/teardown.js'),
  webServer: {
    command: 'npx serve -s build -p 3000 --no-clipboard',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    cwd: '.',
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
