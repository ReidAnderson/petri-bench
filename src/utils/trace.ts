import type { PetriNetInput } from './types';

export type ResolveResult = {
    ids: string[];
    unknown: string[];
    warnings: string[];
};

/**
 * Resolve a list of transition references (IDs or labels) to transition IDs.
 * - Exact ID match wins.
 * - Exact label match resolves if unique; ambiguous labels produce a warning and are skipped.
 */
export function resolveTransitionRefs(model: PetriNetInput, refs: string[]): ResolveResult {
    const idSet = new Set(model.transitions.map(t => t.id));
    const byLabel = new Map<string, string[]>();
    for (const t of model.transitions) {
        if (!t.label) continue;
        const arr = byLabel.get(t.label) ?? [];
        arr.push(t.id);
        byLabel.set(t.label, arr);
    }

    const ids: string[] = [];
    const unknown: string[] = [];
    const warnings: string[] = [];

    for (const r of refs) {
        if (idSet.has(r)) { ids.push(r); continue; }
        const matches = byLabel.get(r) ?? [];
        if (matches.length === 1) { ids.push(matches[0]); continue; }
        if (matches.length > 1) {
            warnings.push(`Ambiguous label '${r}' matches transitions: ${matches.join(', ')}`);
            continue; // skip ambiguous
        }
        unknown.push(r);
    }

    return { ids, unknown, warnings };
}
