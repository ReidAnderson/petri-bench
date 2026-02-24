import { expect, test } from '@playwright/test';
import { PetriNetBuilder, type Pathway } from './PetriNetBuilder';

test.describe('E2E PetriNetBuilder Framework', () => {

    // Test for each pathway
    const pathways: Pathway[] = ['text', 'ui', 'keyboard'];

    for (const pathway of pathways) {
        test(`Builds a petri net via ${pathway} pathway`, async ({ page }) => {
            await page.goto('/');
            const builder = new PetriNetBuilder(page);

            // Clear the existing sample network
            await builder.clear();
            builder.resetActionCount();

            // Build a simple place-transition-place net
            await builder.addPlace('P1', pathway, 'Start', 1);
            await builder.addTransition('T1', pathway, 'Work');
            await builder.addPlace('P2', pathway, 'End');

            await builder.connect('P1', 'T1', 'PT', pathway);
            await builder.connect('T1', 'P2', 'TP', pathway);

            // Validate graph
            await builder.expectNodesAndEdges(['P1', 'T1', 'P2'], 2);

            // Output the action count for metrics
            const actions = builder.getActionCount();
            console.log(`[Metrics] ${pathway} pathway took ${actions} actions`);

            // Assert actions are sensible 
            if (pathway === 'text') {
                expect(actions).toBe(5); // 5 text updates
            } else if (pathway === 'ui') {
                expect(actions).toBe(14); // Optimized pathway saves a click!
            } else {
                expect(actions).toBe(15);
            }
        });
    }
});
