import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  workers: 4,
  expect: { timeout: 10000 },
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev -- --host 0.0.0.0 --port 4173 --strictPort',
    env: { VITE_GOOGLE_SPREADSHEET_ID: 'test-spreadsheet', VITE_GOOGLE_API_KEY: 'test-public-key' },
    url: 'http://localhost:4173',
    reuseExistingServer: false,
  },
});
