import { expect, type Page } from '@playwright/test';
import type { PetriNet } from '../../src/utils/types';

export type Pathway = 'text' | 'ui' | 'keyboard';

export class PetriNetBuilder {
    private actionCount = 0;

    constructor(public readonly page: Page) { }

    getActionCount() {
        return this.actionCount;
    }

    resetActionCount() {
        this.actionCount = 0;
    }

    async clear() {
        const emptyModel: PetriNet = { places: [], transitions: [], arcs: [] };
        const textarea = this.page.locator('[data-testid="petri-input"].editor');
        await textarea.fill(JSON.stringify(emptyModel, null, 2));
        this.actionCount += 1;
    }

    async addPlace(id: string, pathway: Pathway, label = '', tokens = 0) {
        if (pathway === 'text') {
            await this.updateText((model) => {
                model.places.push({ id, label: label || id, tokens });
                return model;
            });
            this.actionCount += 1;
        } else if (pathway === 'ui') {
            await this.page.getByRole('button', { name: '+ Place' }).click();
            await this.fillPlaceForm(id, label, tokens);
            await this.page.getByRole('button', { name: 'Add' }).first().click();
            this.actionCount += 3;
        } else if (pathway === 'keyboard') {
            await this.page.keyboard.press('Alt+p');
            await this.fillPlaceForm(id, label, tokens);
            await this.page.getByRole('button', { name: 'Add' }).first().click();
            this.actionCount += 3;
        }
    }

    async addTransition(id: string, pathway: Pathway, label = '') {
        if (pathway === 'text') {
            await this.updateText((model) => {
                model.transitions.push({ id, label: label || id });
                return model;
            });
            this.actionCount += 1;
        } else if (pathway === 'ui') {
            await this.page.getByRole('button', { name: '+ Transition' }).click();
            await this.fillTransitionForm(id, label);
            await this.page.getByRole('button', { name: 'Add' }).first().click();
            this.actionCount += 3;
        } else if (pathway === 'keyboard') {
            await this.page.keyboard.press('Alt+t');
            await this.fillTransitionForm(id, label);
            await this.page.getByRole('button', { name: 'Add' }).first().click();
            this.actionCount += 3;
        }
    }

    async connect(sourceId: string, targetId: string, dir: 'PT' | 'TP', pathway: Pathway, weight = 1) {
        if (pathway === 'text') {
            await this.updateText((model) => {
                model.arcs.push({ sourceId, targetId, weight });
                return model;
            });
            this.actionCount += 1;
        } else if (pathway === 'ui') {
            const formVisible = await this.page.locator('input[name="direction"]').nth(0).isVisible();
            if (!formVisible) {
                await this.page.getByRole('button', { name: 'Connect', exact: true }).click();
                this.actionCount += 1;
            }
            await this.fillConnectForm(sourceId, targetId, dir, weight);
            await this.page.getByRole('button', { name: 'Add' }).first().click();
            this.actionCount += 2;
        } else if (pathway === 'keyboard') {
            await this.page.keyboard.press('Alt+c');
            await this.fillConnectForm(sourceId, targetId, dir, weight);
            await this.page.getByRole('button', { name: 'Add' }).first().click();
            this.actionCount += 3;
        }
    }

    private async updateText(updater: (model: PetriNet) => PetriNet) {
        const textarea = this.page.locator('[data-testid="petri-input"].editor');
        const currentText = await textarea.inputValue();
        let model: PetriNet = { places: [], transitions: [], arcs: [] };
        try {
            model = JSON.parse(currentText);
        } catch {
            // ignore
        }
        const updated = updater(model);
        await textarea.fill(JSON.stringify(updated, null, 2));
    }

    private async fillPlaceForm(id: string, label: string, tokens: number) {
        await this.page.locator('//label[text()="ID"]/following-sibling::input').fill(id);
        if (label) {
            await this.page.locator('//label[text()="Label"]/following-sibling::input').fill(label);
        }
        if (tokens > 0) {
            await this.page.locator('//label[text()="Tokens"]/following-sibling::input').fill(tokens.toString());
        }
    }

    private async fillTransitionForm(id: string, label: string) {
        await this.page.locator('//label[text()="ID"]/following-sibling::input').fill(id);
        if (label) {
            await this.page.locator('//label[text()="Label"]/following-sibling::input').fill(label);
        }
    }

    private async fillConnectForm(sourceId: string, targetId: string, dir: 'PT' | 'TP', weight: number) {
        if (dir === 'PT') {
            await this.page.locator('label').filter({ hasText: 'P → T' }).click();
            await this.page.locator('//label[text()="Source Place"]/following-sibling::select').selectOption(sourceId);
            await this.page.locator('//label[text()="Target Transition"]/following-sibling::select').selectOption(targetId);
        } else {
            await this.page.locator('label').filter({ hasText: 'T → P' }).click();
            await this.page.locator('//label[text()="Source Transition"]/following-sibling::select').selectOption(sourceId);
            await this.page.locator('//label[text()="Target Place"]/following-sibling::select').selectOption(targetId);
        }
        if (weight > 1) {
            await this.page.locator('//label[text()="Weight"]/following-sibling::input').fill(weight.toString());
        }
    }

    async expectNodesAndEdges(nodeIds: string[], edgeCount: number) {
        const svg = this.page.locator('.graphviz-container svg');
        await expect(svg).toBeVisible();

        for (const id of nodeIds) {
            const node = this.page.locator('g.node').filter({ has: this.page.locator('title', { hasText: new RegExp(`^${id}$`) }) });
            await expect(node).toBeVisible();
        }

        const edges = this.page.locator('g.edge');
        await expect(edges).toHaveCount(edgeCount);
    }
}
