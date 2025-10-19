import { test, expect } from '@playwright/test';

test.describe('Petri Bench app', () => {
  test('loads and displays graph with direction toggle', async ({ page }) => {
    // Use Vite preview default port or environment BASE_URL if present
    const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:4173';
    await page.goto(baseUrl);

    // Left pane: textarea should exist
    const textarea = page.locator('textarea.editor');
    await expect(textarea).toBeVisible();

    // Right header contains Direction select
    const select = page.locator('select#rankdir');
    await expect(select).toBeVisible();
    await select.selectOption('TB');

    // Graph is rendered (an SVG should exist)
    await expect(page.locator('.graphviz-container svg')).toBeVisible();
  });
});
