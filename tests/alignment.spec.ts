import { describe, expect, it } from 'vitest';
import { samplePetriNet } from '../src/sample';
import { computeAlignmentFitness, findOptimalAlignment } from '../src/utils/alignment';
import type { PetriNet } from '../src/utils/types';

const simpleNet: PetriNet = samplePetriNet;

describe('findOptimalAlignment', () => {
    it('perfect sync on matching trace', () => {
        const trace = ['Enqueue', 'Begin', 'Finish'];
        const { alignment, cost } = findOptimalAlignment(trace, simpleNet);
        expect(cost).toBe(0);
        expect(alignment.map(m => m.moveType)).toEqual(['sync', 'sync', 'sync']);
        const fitness = computeAlignmentFitness(alignment, cost);
        expect(fitness).toBe(1);
    });

    it('handles log/model deviations', () => {
        const trace = ['Begin', 'Finish']; // missing first step
        const { alignment, cost } = findOptimalAlignment(trace, simpleNet);
        // At least one model move likely needed to move token to P1 (fire Enqueue)
        expect(cost).toBeGreaterThanOrEqual(1);
        const fitness = computeAlignmentFitness(alignment, cost);
        expect(fitness).toBeLessThan(1);
        expect(fitness).toBeGreaterThanOrEqual(0);
    });

    it('accepts id-based matching', () => {
        const trace = ['T0', 'T1', 'T2'];
        const { alignment, cost } = findOptimalAlignment(trace, simpleNet);
        expect(cost).toBe(0);
        expect(alignment.length).toBe(3);
    });

    it('returns model only moves for empty trace', () => {
        const trace: string[] = [];
        const { alignment, cost } = findOptimalAlignment(trace, simpleNet);
        expect(cost).toBe(3);
        expect(alignment.length).toBe(3);
        expect(alignment.map(m => m.moveType)).toEqual(['model', 'model', 'model']);
    });

    it('completes trace with model moves', () => {
        const trace: string[] = ['T0'];
        const { alignment, cost } = findOptimalAlignment(trace, simpleNet);
        expect(cost).toBe(2);
        expect(alignment.length).toBe(3);
        expect(alignment.map(m => m.moveType)).toEqual(['sync', 'model', 'model']);
    });
});
