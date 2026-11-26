import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test/e2e',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: { trace: 'off' },
  webServer: {
    command: 'node test/e2e/mockServer.mjs',
    url: 'http://127.0.0.1:4599/test-article.html',
    reuseExistingServer: !process.env.CI,
  },
});
