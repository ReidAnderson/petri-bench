import type { PetriNet } from './utils/types';

export const samplePetriNet: PetriNet = {
    places: [
        { id: 'P0', label: 'Start', tokens: 1 },
        { id: 'P1', label: 'Queued', tokens: 0 },
        { id: 'P2', label: 'Processing', tokens: 0 },
        { id: 'P3', label: 'Done', tokens: 0 }
    ],
    transitions: [
        { id: 'T0', label: 'Enqueue' },
        { id: 'T1', label: 'Begin' },
        { id: 'T2', label: 'Finish' }
    ],
    arcs: [
        { sourceId: 'P0', targetId: 'T0' },
        { sourceId: 'T0', targetId: 'P1' },
        { sourceId: 'P1', targetId: 'T1' },
        { sourceId: 'T1', targetId: 'P2' },
        { sourceId: 'P2', targetId: 'T2' },
        { sourceId: 'T2', targetId: 'P3' }
    ]
};
