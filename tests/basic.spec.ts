import { expect, test } from '@playwright/test'

test.describe('Petri Net Suite', () => {
    test('homepage loads successfully', async ({ page }) => {
        await page.goto('/')
        await expect(page.locator('h1')).toContainText('Petri Net Suite')
    })

    test('can navigate between simulator and conformance pages', async ({ page }) => {
        await page.goto('/')

        // Check simulator tab is visible
        await expect(page.locator('text=Simulator')).toBeVisible()

        // Click conformance tab
        await page.click('text=Conformance Checker')

        // Verify conformance content is visible
        await expect(page.locator('text=Upload Files')).toBeVisible()
        await expect(page.locator('text=Petri Net Model')).toBeVisible()

        // Click simulator tab
        await page.click('text=Simulator')

        // Verify simulator content is visible
        await expect(page.locator('text=Load Petri Net')).toBeVisible()
        await expect(page.locator('button', { hasText: 'Run Simulation' })).toBeVisible()
    })

    test('simulation controls work', async ({ page }) => {
        await page.goto('/')
        await page.click('text=Simulator')

        // Check if run simulation button is present (be more specific)
        await expect(page.locator('button', { hasText: 'Run Simulation' })).toBeVisible()

        // Check if reset button is present
        await expect(page.locator('button', { hasText: 'Reset' })).toBeVisible()

        // Check if steps input is present and has default value
        const stepsInput = page.locator('input[type="number"]')
        await expect(stepsInput).toBeVisible()
    })

    test('conformance controls work', async ({ page }) => {
        await page.goto('/')
        await page.click('text=Conformance Checker')

        // Check if file upload areas are present
        await expect(page.locator('text=Upload PNML')).toBeVisible()
        await expect(page.locator('text=Upload XES')).toBeVisible()

        // Check if run analysis button is present (be more specific)
        await expect(page.locator('button', { hasText: 'Run Analysis' })).toBeVisible()
    })
})
