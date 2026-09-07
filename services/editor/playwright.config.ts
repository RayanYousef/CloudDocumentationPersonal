import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://127.0.0.1:5173/CloudDocumentationPersonal/editor/', headless: true },
  webServer: [
    { command: 'node e2e/content-server.mjs', port: 4321, reuseExistingServer: false, timeout: 60_000 },
    { command: 'npx vite --port 5173 --host 127.0.0.1', port: 5173, reuseExistingServer: false, timeout: 60_000, env: { VITE_PLATFORM_AUTH: 'mock', VITE_PLATFORM_CONTENT: 'http://127.0.0.1:4321' } },
  ],
});
