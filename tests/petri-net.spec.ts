import { test, expect } from '@playwright/test';

test.describe('Petri Net Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load application with initial nodes and edges', async ({ page }) => {
    // Check that the application loads with the title
    await expect(page.locator('text=Petri Net Sim')).toBeVisible(); // Updated title
    
    // Check that initial nodes are present
    await expect(page.locator('[data-id="1"]')).toBeVisible(); // Place P1
    await expect(page.locator('[data-id="2"]')).toBeVisible(); // Transition T1
    await expect(page.locator('[data-id="3"]')).toBeVisible(); // Place P2
    
    // Check that initial edges are present
    await expect(page.locator('.react-flow__edge')).toHaveCount(2);
  });

  test('should drag and drop new place node', async ({ page }) => {
    // Get initial node count by counting existing place nodes
    const initialPlaces = await page.locator('.react-flow__node[data-id]').filter({ hasText: 'Tokens:' }).count();
    
    // Drag place from sidebar to canvas
    const placeItem = page.locator('text=Place').first();
    const canvas = page.locator('.react-flow__pane');
    
    await placeItem.dragTo(canvas, {
      targetPosition: { x: 300, y: 300 }
    });
    
    // Wait for the node to be rendered
    await page.waitForTimeout(500);
    
    // Check that a new place was added by counting nodes with "Tokens:" text
    await expect(page.locator('.react-flow__node[data-id]').filter({ hasText: 'Tokens:' })).toHaveCount(initialPlaces + 1);
  });

  test('should drag and drop new transition node', async ({ page }) => {
    // Get initial node count by counting existing transition nodes
    const initialTransitions = await page.locator('.react-flow__node[data-id]').filter({ hasText: 'Fire' }).count();
    
    // Drag transition from sidebar to canvas
    const transitionItem = page.locator('text=Transition').first();
    const canvas = page.locator('.react-flow__pane');
    
    await transitionItem.dragTo(canvas, {
      targetPosition: { x: 400, y: 400 }
    });
    
    // Wait for the node to be rendered
    await page.waitForTimeout(500);
    
    // Check that a new transition was added by counting nodes with "Fire" button
    await expect(page.locator('.react-flow__node[data-id]').filter({ hasText: 'Fire' })).toHaveCount(initialTransitions + 1);
  });

  test('should add tokens to a place', async ({ page }) => {
    // Find the first place by looking for a node with "Tokens:" text
    const place = page.locator('.react-flow__node[data-id]').filter({ hasText: 'Tokens:' }).first();
    await expect(place.locator('text=Tokens: 1')).toBeVisible();
    
    // Click the Add button
    await place.locator('button:has-text("Add")').click();
    
    // Check that tokens increased
    await expect(place.locator('text=Tokens: 2')).toBeVisible();
  });

  test('should fire a transition', async ({ page }) => {
    // Check initial state - P1 has 1 token, P2 has 0 tokens
    const place1 = page.locator('[data-id="1"]');
    const place2 = page.locator('[data-id="3"]');
    const transition = page.locator('[data-id="2"]');
    
    await expect(place1.locator('text=Tokens: 1')).toBeVisible();
    await expect(place2.locator('text=Tokens: 0')).toBeVisible();
    
    // Fire the transition
    await transition.locator('button:has-text("Fire")').click();
    
    // Check that tokens moved from P1 to P2
    await expect(place1.locator('text=Tokens: 0')).toBeVisible();
    await expect(place2.locator('text=Tokens: 1')).toBeVisible();
  });

  test('should start and end enhanced simulation', async ({ page }) => {
    // Check that Start Simulation button is visible
    await expect(page.locator('button:has-text("Start Simulation")')).toBeVisible();
    
    // Start enhanced simulation
    await page.locator('button:has-text("Start Simulation")').click();
    
    // Check that we're now in simulation mode - End Simulation button should appear
    await expect(page.locator('button:has-text("End Simulation")')).toBeVisible();
    
    // Check that simulation control buttons are visible
    await expect(page.locator('button:has-text("Step Forward")')).toBeVisible();
    await expect(page.locator('button:has-text("Fast Forward")')).toBeVisible();
    
    // End simulation
    await page.locator('button:has-text("End Simulation")').click();
    
    // Check that Start Simulation button reappears
    await expect(page.locator('button:has-text("Start Simulation")')).toBeVisible();
  });

  test('should run multiple iterations', async ({ page }) => {
    // Check that iteration input is visible and set value
    const iterationInput = page.locator('input[type="number"]').first();
    await expect(iterationInput).toBeVisible();
    
    // Set iteration count to 3
    await iterationInput.fill('3');
    
    // Check that the Run button shows correct text
    await expect(page.locator('button:has-text("Run 3 Iterations")')).toBeVisible();
    
    // Click the Run Multiple Iterations button
    await page.locator('button:has-text("Run 3 Iterations")').click();
    
    // Wait for the simulation to complete and check for alert
    // Note: This will show an alert with clipboard copy confirmation
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Multiple iterations complete');
      await dialog.accept();
    });
    
    // Wait a bit for the simulation to complete
    await page.waitForTimeout(2000);
  });

  test('should export PNML file', async ({ page }) => {
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.locator('button:has-text("Export PNML")').click();
    
    // Wait for download and verify
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('petrinet.pnml');
  });

  test('should step through simulation manually', async ({ page }) => {
    // Start enhanced simulation
    await page.locator('button:has-text("Start Simulation")').click();
    
    // Check initial state before stepping
    const place1 = page.locator('[data-id="1"]');
    const place2 = page.locator('[data-id="3"]');
    
    await expect(place1.locator('text=Tokens: 1')).toBeVisible();
    await expect(place2.locator('text=Tokens: 0')).toBeVisible();
    
    // Click Step Forward button
    await page.locator('button:has-text("Step Forward")').click();
    
    // Wait for the step to complete
    await page.waitForTimeout(500);
    
    // Check that tokens moved (since there's only one fireable transition)
    await expect(place1.locator('text=Tokens: 0')).toBeVisible();
    await expect(place2.locator('text=Tokens: 1')).toBeVisible();
    
    // End simulation
    await page.locator('button:has-text("End Simulation")').click();
  });
});