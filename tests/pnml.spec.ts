import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

test.describe('PNML Import/Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should import PNML file correctly', async ({ page }) => {
    // Create a sample PNML file content
    const samplePNML = `<?xml version="1.0" encoding="UTF-8"?>
<pnml>
  <net id="net1" type="http://www.pnml.org/version-2009/grammar/pnmlcoremodel">
    <name>
      <text>Test Petri Net</text>
    </name>
    <page id="page1">
      <place id="p1">
        <name>
          <text>Input Place</text>
        </name>
        <initialMarking>
          <text>2</text>
        </initialMarking>
      </place>
      <transition id="t1">
        <name>
          <text>Process</text>
        </name>
      </transition>
      <place id="p2">
        <name>
          <text>Output Place</text>
        </name>
        <initialMarking>
          <text>0</text>
        </initialMarking>
      </place>
      <arc id="a1" source="p1" target="t1" />
      <arc id="a2" source="t1" target="p2" />
    </page>
  </net>
</pnml>`;

    // Create a temporary file for testing
    const buffer = Buffer.from(samplePNML, 'utf-8');
    
    // Set up file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-petri-net.pnml',
      mimeType: 'application/xml',
      buffer: buffer
    });

    // Wait for import to complete
    await page.waitForTimeout(1000);

    // Check that nodes were imported correctly
    await expect(page.locator('[data-id="p1"]')).toBeVisible();
    await expect(page.locator('[data-id="t1"]')).toBeVisible();
    await expect(page.locator('[data-id="p2"]')).toBeVisible();

    // Check that the imported place has correct token count
    const inputPlace = page.locator('[data-id="p1"]');
    await expect(inputPlace.locator('text=Tokens: 2')).toBeVisible();

    // Check that edges were imported with arrows
    await expect(page.locator('.react-flow__edge')).toHaveCount(2);
    await expect(page.locator('.react-flow__edge path[marker-end]')).toHaveCount(2);
  });

  test('should export and re-import maintaining data integrity', async ({ page }) => {
    // Modify the initial state by adding tokens
    const place1 = page.locator('[data-id="1"]');
    await place1.locator('button:has-text("Add")').click();
    await place1.locator('button:has-text("Add")').click();
    
    // Verify we have 3 tokens in P1
    await expect(place1.locator('text=Tokens: 3')).toBeVisible();

    // Export the current state
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Export PNML")').click();
    const download = await downloadPromise;
    
    // Save the downloaded file
    const path = await download.path();
    const exportedContent = readFileSync(path!, 'utf-8');
    
    // Verify the exported content contains our data
    expect(exportedContent).toContain('<text>3</text>'); // 3 tokens in P1
    expect(exportedContent).toContain('P1');
    expect(exportedContent).toContain('T1');
    expect(exportedContent).toContain('P2');

    // Now import the same file back
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path!);
    
    // Wait for import to complete
    await page.waitForTimeout(1000);
    
    // Verify the state was restored correctly
    const reimportedPlace1 = page.locator('[data-id="1"]');
    await expect(reimportedPlace1.locator('text=Tokens: 3')).toBeVisible();
  });
});