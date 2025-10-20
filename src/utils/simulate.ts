import type { Arc, PetriNetInput, Place } from './types';

export type ReplayOptions = {
    /** If true, stop and throw on the first error (default). If false, skip invalid/not-enabled steps. */
    strict?: boolean;
};

export type ReplayResult = {
    model: PetriNetInput;
    warnings: string[];
};

/**
 * Apply a sequence of transition IDs to the Petri net, returning a new net with updated place tokens.
 * Throws if a transition id is unknown or not enabled at a step (when strict=true).
 */
export function applyTransitions(model: PetriNetInput, sequence: string[], options?: ReplayOptions): PetriNetInput {
    const res = replayTransitionsDetailed(model, sequence, options);
    if (res.warnings.length && options?.strict === false) {
        // eslint-disable-next-line no-console
        console.warn('Replay warnings:', res.warnings.join('; '));
    }
    return res.model;
}

/** Detailed replay with warnings collected. */
export function replayTransitionsDetailed(model: PetriNetInput, sequence: string[], options?: ReplayOptions): ReplayResult {
    const strict = options?.strict !== false ? true : false;

    // Build lookup maps
    const placeSet = new Set(model.places.map((p) => p.id));
    const transitionSet = new Set(model.transitions.map((t) => t.id));

    const inArcs = groupInputArcs(model.arcs, placeSet, transitionSet);
    const outArcs = groupOutputArcs(model.arcs, placeSet, transitionSet);

    // Current token multiset
    const tokens = new Map<string, number>();
    for (const p of model.places) tokens.set(p.id, toInt(p.tokens));

    const warnings: string[] = [];

    for (let step = 0; step < sequence.length; step++) {
        const tid = sequence[step];
        if (!transitionSet.has(tid)) {
            const msg = `Step ${step + 1}: transition not found: ${tid}`;
            if (strict) throw new Error(msg);
            warnings.push(msg);
            continue;
        }

        const ins = inArcs.get(tid) ?? [];
        const outs = outArcs.get(tid) ?? [];

        // Enabled check
        let enabled = true;
        for (const a of ins) {
            const have = tokens.get(a.place) ?? 0;
            if (have < a.weight) { enabled = false; break; }
        }
        if (!enabled) {
            const msg = `Step ${step + 1}: transition ${tid} not enabled`;
            if (strict) throw new Error(msg);
            warnings.push(msg);
            continue;
        }

        // Fire: consume inputs
        for (const a of ins) tokens.set(a.place, (tokens.get(a.place) ?? 0) - a.weight);
        // Produce outputs
        for (const a of outs) tokens.set(a.place, (tokens.get(a.place) ?? 0) + a.weight);
    }

    // Build new places array with updated tokens
    const places: Place[] = model.places.map((p) => ({ ...p, tokens: tokens.get(p.id) ?? 0 }));
    const updated: PetriNetInput = { places, transitions: model.transitions.slice(), arcs: model.arcs.slice() };
    return { model: updated, warnings };
}

function toInt(n: unknown): number { return typeof n === 'number' && isFinite(n) ? Math.trunc(n) : 0; }

function weightOf(arc: Arc): number { return (arc as any).weight && (arc as any).weight !== 0 ? Math.trunc((arc as any).weight as number) : 1; }

function groupInputArcs(arcs: Arc[], placeSet: Set<string>, transitionSet: Set<string>): Map<string, Array<{ place: string; weight: number }>> {
    const m = new Map<string, Array<{ place: string; weight: number }>>();
    for (const a of arcs) {
        // Input arcs are those from place -> transition
        if (placeSet.has(a.from) && transitionSet.has(a.to)) {
            const w = weightOf(a);
            add(m, a.to, { place: a.from, weight: w });
        }
    }
    return m;
}

function groupOutputArcs(arcs: Arc[], placeSet: Set<string>, transitionSet: Set<string>): Map<string, Array<{ place: string; weight: number }>> {
    const m = new Map<string, Array<{ place: string; weight: number }>>();
    for (const a of arcs) {
        // Output arcs are those from transition -> place
        if (transitionSet.has(a.from) && placeSet.has(a.to)) {
            const w = weightOf(a);
            add(m, a.from, { place: a.to, weight: w });
        }
    }
    return m;
}

function add<K, V>(m: Map<any, V[]>, k: K, v: V) {
    const arr = m.get(k as any) ?? [];
    arr.push(v);
    m.set(k as any, arr);
}
