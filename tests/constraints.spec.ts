import { test, expect } from '@playwright/test';

test.describe('Petri Net Constraints', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should enforce connection constraints - place to place not allowed', async ({ page }) => {
    // Add two places to the canvas
    const placeItem = page.locator('text=Place').first();
    const canvas = page.locator('.react-flow__pane');
    
    // Add first place
    await placeItem.dragTo(canvas, {
      targetPosition: { x: 200, y: 150 }
    });
    
    // Add second place
    await placeItem.dragTo(canvas, {
      targetPosition: { x: 400, y: 150 }
    });
    
    // Wait for nodes to be rendered
    await page.waitForTimeout(500);
    
    // Get initial edge count
    const initialEdges = await page.locator('.react-flow__edge').count();
    
    // Get all place nodes (nodes with "Tokens:" text) and target the newly added ones
    const placeNodes = page.locator('.react-flow__node[data-id]').filter({ hasText: 'Tokens:' });
    
    // Try to connect two places using the test identifiers
    const sourceHandle = placeNodes.nth(1).locator('[data-testid="place-handle-bottom"]');
    const targetHandle = placeNodes.nth(2).locator('[data-testid="place-handle-top"]');
    
    // Ensure handles are visible
    await expect(sourceHandle).toBeVisible();
    await expect(targetHandle).toBeVisible();
    
    // Attempt connection
    await sourceHandle.hover();
    await page.mouse.down();
    await targetHandle.hover();
    await page.mouse.up();
    
    // Edge count should remain the same (connection rejected)
    await expect(page.locator('.react-flow__edge')).toHaveCount(initialEdges);
  });

  test('should enforce connection constraints - transition to transition not allowed', async ({ page }) => {
    // Add two transitions to the canvas
    const transitionItem = page.locator('text=Transition').first();
    const canvas = page.locator('.react-flow__pane');
    
    // Add first transition
    await transitionItem.dragTo(canvas, {
      targetPosition: { x: 200, y: 150 }
    });
    
    // Add second transition
    await transitionItem.dragTo(canvas, {
      targetPosition: { x: 400, y: 150 }
    });
    
    // Wait for nodes to be rendered
    await page.waitForTimeout(500);
    
    // Get initial edge count
    const initialEdges = await page.locator('.react-flow__edge').count();
    
    // Get all transition nodes (nodes with "Fire" button) and target the newly added ones
    const transitionNodes = page.locator('.react-flow__node[data-id]').filter({ hasText: 'Fire' });
    
    // Try to connect two transitions using the test identifiers
    const sourceHandle = transitionNodes.nth(1).locator('[data-testid="transition-handle-bottom"]');
    const targetHandle = transitionNodes.nth(2).locator('[data-testid="transition-handle-top"]');
    
    // Ensure handles are visible
    await expect(sourceHandle).toBeVisible();
    await expect(targetHandle).toBeVisible();
    
    // Attempt connection
    await sourceHandle.hover();
    await page.mouse.down();
    await targetHandle.hover();
    await page.mouse.up();
    
    // Edge count should remain the same (connection rejected)
    await expect(page.locator('.react-flow__edge')).toHaveCount(initialEdges);
  });

  test('should allow valid connections - place to transition', async ({ page }) => {
    // Add a place and transition to the canvas
    const placeItem = page.locator('text=Place').first();
    const transitionItem = page.locator('text=Transition').first();
    const canvas = page.locator('.react-flow__pane');
    
    // Add place
    await placeItem.dragTo(canvas, {
      targetPosition: { x: 200, y: 150 }
    });
    
    // Add transition
    await transitionItem.dragTo(canvas, {
      targetPosition: { x: 400, y: 150 }
    });
    
    // Wait for nodes to be rendered
    await page.waitForTimeout(500);
    
    // Get initial edge count
    const initialEdges = await page.locator('.react-flow__edge').count();
    
    // Get the newly added place and transition nodes
    const placeNodes = page.locator('.react-flow__node[data-id]').filter({ hasText: 'Tokens:' });
    const transitionNodes = page.locator('.react-flow__node[data-id]').filter({ hasText: 'Fire' });
    
    // Connect place to transition using test identifiers
    const placeHandle = placeNodes.nth(1).locator('[data-testid="place-handle-bottom"]');
    const transitionHandle = transitionNodes.nth(1).locator('[data-testid="transition-handle-top"]');
    
    // Ensure handles are visible
    await expect(placeHandle).toBeVisible();
    await expect(transitionHandle).toBeVisible();
    
    // Create connection
    await placeHandle.hover();
    await page.mouse.down();
    await transitionHandle.hover();
    await page.mouse.up();
    
    // Edge count should increase (connection accepted)
    await expect(page.locator('.react-flow__edge')).toHaveCount(initialEdges + 1);
  });

  test('should show directional arrows on edges', async ({ page }) => {
    // Check that existing edges have arrow markers
    const edges = page.locator('.react-flow__edge');
    const firstEdge = edges.first();
    
    // Check for arrow marker (marker-end attribute)
    await expect(firstEdge.locator('path[marker-end]')).toBeVisible();
  });
});