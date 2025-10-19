import type { PetriNetInput } from './types';

export function parsePetriNet(text: string): PetriNetInput {
    let obj: unknown;
    try {
        obj = JSON.parse(text);
    } catch (e) {
        throw new Error('Input is not valid JSON.');
    }
    if (typeof obj !== 'object' || obj === null) throw new Error('Root must be an object.');
    const root = obj as Record<string, unknown>;

    const places = asArray(root.places, 'places');
    const transitions = asArray(root.transitions, 'transitions');
    const arcs = asArray(root.arcs, 'arcs');

    const placeIds = new Set<string>();
    const transitionIds = new Set<string>();

    for (const p of places) {
        const id = asString((p as any).id, 'place.id');
        if (placeIds.has(id)) throw new Error(`Duplicate place id: ${id}`);
        placeIds.add(id);
    }
    for (const t of transitions) {
        const id = asString((t as any).id, 'transition.id');
        if (transitionIds.has(id)) throw new Error(`Duplicate transition id: ${id}`);
        transitionIds.add(id);
    }
    for (const a of arcs) {
        const from = asString((a as any).from, 'arc.from');
        const to = asString((a as any).to, 'arc.to');
        if (!(placeIds.has(from) || transitionIds.has(from))) throw new Error(`Arc.from not found: ${from}`);
        if (!(placeIds.has(to) || transitionIds.has(to))) throw new Error(`Arc.to not found: ${to}`);
    }

    return obj as PetriNetInput;
}

function asArray(value: unknown, name: string): unknown[] {
    if (!Array.isArray(value)) throw new Error(`${name} must be an array.`);
    return value;
}

function asString(value: unknown, name: string): string {
    if (typeof value !== 'string') throw new Error(`${name} must be a string.`);
    return value;
}
