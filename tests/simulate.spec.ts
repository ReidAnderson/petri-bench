import { describe, expect, it } from 'vitest';
import { applyTransitions, replayTransitionsDetailed } from '../src/utils/simulate';
import { toDot } from '../src/utils/toDot';
import type { PetriNetInput } from '../src/utils/types';

describe('applyTransitions', () => {
    it('fires enabled transitions and updates tokens', () => {
        const model: PetriNetInput = {
            places: [
                { id: 'P0', tokens: 1 },
                { id: 'P1' },
            ],
            transitions: [
                { id: 'T0' },
            ],
            arcs: [
                { from: 'P0', to: 'T0' },
                { from: 'T0', to: 'P1' },
            ],
        };

        const after = applyTransitions(model, ['T0']);
        const p0 = after.places.find(p => p.id === 'P0')!;
        const p1 = after.places.find(p => p.id === 'P1')!;
        expect(p0.tokens).toBe(0);
        expect(p1.tokens).toBe(1);
    });

    it('throws when not enabled in strict mode', () => {
        const model: PetriNetInput = {
            places: [{ id: 'P0', tokens: 0 }],
            transitions: [{ id: 'T0' }],
            arcs: [{ from: 'P0', to: 'T0' }],
        };
        expect(() => applyTransitions(model, ['T0'], { strict: true })).toThrow();
    });

    it('skips invalid firings in non-strict and surfaces warnings; label is rendered', () => {
        const model: PetriNetInput = {
            places: [{ id: 'P0', tokens: 1 }, { id: 'P1' }],
            transitions: [{ id: 'T0' }, { id: 'T1' }],
            arcs: [{ from: 'P0', to: 'T0' }, { from: 'T0', to: 'P1' }],
        };
        const seq = ['BAD', 'T0', 'T1'];
        const res = replayTransitionsDetailed(model, seq, { strict: false });
        // After skipping BAD and T1 not enabled, only T0 fires
        const p0 = res.model.places.find(p => p.id === 'P0')!;
        const p1 = res.model.places.find(p => p.id === 'P1')!;
        expect(p0.tokens).toBe(0);
        expect(p1.tokens).toBe(1);
        expect(res.warnings.length).toBeGreaterThanOrEqual(1);

        const dot = toDot(res.model, { rankdir: 'LR', label: `Applied: ${seq.join(' → ')}` });
        expect(dot).toContain('label="Applied: BAD → T0 → T1"');
    });
});
