import { describe, expect, it } from 'vitest';
import { parsePetriNet } from '../src/utils/parser';
import { toDot } from '../src/utils/toDot';

describe('Petri net parsing and DOT generation', () => {
    it('parses valid JSON and renders DOT with rankdir', () => {
        const json = JSON.stringify({
            places: [{ id: 'P1', tokens: 1 }],
            transitions: [{ id: 'T1' }],
            arcs: [{ from: 'P1', to: 'T1' }]
        });
        const model = parsePetriNet(json);
        const dot = toDot(model, { rankdir: 'TB' });
        expect(dot).toContain('digraph PetriNet');
        expect(dot).toContain('rankdir=TB');
        expect(dot).toContain('"P1" -> "T1"');
    });

    it('throws on invalid JSON', () => {
        expect(() => parsePetriNet('{bad json')).toThrow();
    });
});
