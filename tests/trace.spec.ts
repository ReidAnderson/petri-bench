import { describe, expect, it } from 'vitest';
import { resolveTransitionRefs } from '../src/utils/trace';
import type { PetriNetInput } from '../src/utils/types';

describe('resolveTransitionRefs', () => {
    const model: PetriNetInput = {
        places: [],
        transitions: [
            { id: 'T0', label: 'A' },
            { id: 'T1', label: 'B' },
            { id: 'T2', label: 'A' }, // duplicate label to test ambiguity
        ],
        arcs: [],
    };

    it('resolves exact IDs', () => {
        const r = resolveTransitionRefs(model, ['T0', 'T1']);
        expect(r.ids).toEqual(['T0', 'T1']);
        expect(r.unknown).toEqual([]);
        expect(r.warnings).toEqual([]);
    });

    it('resolves labels when unique', () => {
        const uniqModel: PetriNetInput = {
            ...model, transitions: [
                { id: 'T0', label: 'A' },
                { id: 'T1', label: 'B' },
            ]
        };
        const r = resolveTransitionRefs(uniqModel, ['A', 'B']);
        expect(r.ids).toEqual(['T0', 'T1']);
        expect(r.unknown).toEqual([]);
        expect(r.warnings).toEqual([]);
    });

    it('flags ambiguous labels and skips them', () => {
        const r = resolveTransitionRefs(model, ['A']);
        expect(r.ids).toEqual([]);
        expect(r.unknown).toEqual([]);
        expect(r.warnings.length).toBe(1);
        expect(r.warnings[0]).toMatch(/Ambiguous label 'A'/);
    });

    it('marks unknown refs', () => {
        const r = resolveTransitionRefs(model, ['NOPE']);
        expect(r.ids).toEqual([]);
        expect(r.unknown).toEqual(['NOPE']);
    });
});
