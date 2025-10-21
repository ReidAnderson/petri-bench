import { expect, test } from '@playwright/test';

test.describe('Petri Bench app', () => {
    test('loads and displays graph with direction toggle', async ({ page }) => {
        // Use Vite preview default port or environment BASE_URL if present
        await page.goto('/');

        // Left pane: specifically select the Petri net textarea using data-testid
        const textarea = page.locator('[data-testid="petri-input"].editor');
        await expect(textarea).toBeVisible();

        // Right header contains Direction select
        const select = page.locator('select#rankdir');
        await expect(select).toBeVisible();
        await select.selectOption('TB');

        // Graph is rendered (an SVG should exist)
        await expect(page.locator('.graphviz-container svg')).toBeVisible();
    });
});
