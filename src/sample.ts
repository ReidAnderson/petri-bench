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
        { from: 'P0', to: 'T0' },
        { from: 'T0', to: 'P1' },
        { from: 'P1', to: 'T1' },
        { from: 'T1', to: 'P2' },
        { from: 'P2', to: 'T2' },
        { from: 'T2', to: 'P3' }
    ]
};
