import { defineConfig } from '@playwright/test';

const basePath = process.env.GITHUB_PAGES ? '/petri-bench/' : '/';
const host = 'http://localhost:4173';

export default defineConfig({
    testDir: 'tests/e2e',
    webServer: {
        command: 'npm run preview',
        url: host,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
    use: {
        baseURL: `${host}${basePath}`,
        viewport: { width: 1280, height: 800 },
        headless: true,
    },
});
