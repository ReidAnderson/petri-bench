import { describe, expect, it } from 'vitest';
import { parsePetriNetByFormat } from '../src/utils/parser';

describe('Mermaid parsing', () => {
    it('parses flowchart with places, transitions, weights and edges', () => {
        const mm = `flowchart TB\nP0(("Start"))\nP1(("Queued"))\nP2(("Processing (x1)"))\nP3(("Done"))\nT0["Enqueue"]\nT1["Begin"]\nT2["Finish"]\nP0 ----> T0\nT0 ----> P1\nP1 ----> T1\nT1 ----> P2\nP2 ----> T2\nT2 ----> P3`;

        const model = parsePetriNetByFormat(mm, 'mermaid');

        expect(model.places.length).toBe(4);
        expect(model.transitions.length).toBe(3);
        expect(model.arcs.length).toBe(6);

        const p2 = model.places.find(p => p.id === 'P2')!;
        expect(p2.label).toBe('Processing (x1)');
        expect(p2.tokens).toBe(1);

        // spot-check a transition
        const t0 = model.transitions.find(t => t.id === 'T0')!;
        expect(t0.label).toBe('Enqueue');

        // check an arc
        const a = model.arcs.find(a => a.sourceId === 'P0' && a.targetId === 'T0');
        expect(a).toBeTruthy();
    });
});
