import { PriorityQueue } from './priorityQueue';
import type { AlignmentMove, AlignmentState, Arc, Marking, PetriNetInput } from './types';

type InArc = { place: string; weight: number };
type OutArc = { place: string; weight: number };

type Node = AlignmentState & {
    key: string;
    parent?: Node;
    move?: AlignmentMove;
};

/**
 * Compute the optimal alignment (minimum-cost) between a trace and a Petri net model.
 * Cost model (defaults):
 *  - sync move: 0
 *  - log move: 1 (consume an event without firing a transition)
 *  - model move: 1 (fire an enabled transition without consuming an event)
 *  - invisible model move (transition with no label): 0 (treated as silent/tau)
 * Matching of a trace event to a transition happens when the event equals the transition id or its label.
 * Goal condition: end of trace reached (traceIndex === trace.length). Final marking is not enforced.
 */
export function findOptimalAlignment(trace: string[], model: PetriNetInput): { alignment: AlignmentMove[], cost: number } {
    // Build arc index structures and initial marking
    const placeSet = new Set(model.places.map(p => p.id));
    const transitionSet = new Set(model.transitions.map(t => t.id));
    const inArcs = groupInputArcs(model.arcs, placeSet, transitionSet);
    const outArcs = groupOutputArcs(model.arcs, placeSet, transitionSet);
    const sinkPlaces = computeSinkPlaces(model.arcs, placeSet, transitionSet);

    const initial: Marking = {};
    for (const p of model.places) initial[p.id] = toInt(p.tokens);

    // Open set: Dijkstra (heuristic = 0). Keyed by cumulative cost.
    const open = new PriorityQueue<Node>((a, b) => a.cost - b.cost);
    const start: Node = { marking: initial, traceIndex: 0, cost: 0, key: keyOf(initial, 0) };
    open.push(start);

    // Best-known cost to reach a (marking, traceIndex) state
    const bestCost = new Map<string, number>();
    bestCost.set(start.key, 0);

    // Simple limit to avoid runaway in degenerate models
    const maxExpansions = 10000;
    let expansions = 0;

    while (!open.isEmpty()) {
        const cur = open.pop()!;
        // Goal: consumed all events AND in an accepting marking (all tokens reside only in sink places)
        if (cur.traceIndex === trace.length && isAccepting(cur.marking, sinkPlaces)) {
            return reconstruct(cur);
        }

        if ((bestCost.get(cur.key) ?? Number.POSITIVE_INFINITY) < cur.cost) {
            // Dominated by a better path seen before
            continue;
        }

        if (++expansions > maxExpansions) {
            // Fallback: return best-so-far (no alignment reconstruction if none finished)
            return reconstruct(cur);
        }

        const nextEvent = trace[cur.traceIndex];

        // 1) Synchronous moves: for each enabled transition matching nextEvent
        for (const t of model.transitions) {
            if (!matchesEvent(t.id, t.label, nextEvent)) continue;
            if (!isEnabled(cur.marking, t.id, inArcs)) continue;
            const newMark = fire(cur.marking, t.id, inArcs, outArcs);
            const nxt: Node = {
                marking: newMark,
                traceIndex: cur.traceIndex + 1,
                cost: cur.cost + 0,
                key: keyOf(newMark, cur.traceIndex + 1),
                parent: cur,
                move: { moveType: 'sync', activity: activityFor(t) }
            };
            relax(nxt, bestCost, open);
        }

        // 2) Model moves: fire any enabled transition (without consuming the log)
        for (const t of model.transitions) {
            if (!isEnabled(cur.marking, t.id, inArcs)) continue;
            const newMark = fire(cur.marking, t.id, inArcs, outArcs);
            const isInvisible = !t.label || t.label.length === 0;
            const moveCost = isInvisible ? 0 : 1;
            const nxt: Node = {
                marking: newMark,
                traceIndex: cur.traceIndex,
                cost: cur.cost + moveCost,
                key: keyOf(newMark, cur.traceIndex),
                parent: cur,
                move: { moveType: 'model', activity: activityFor(t) }
            };
            relax(nxt, bestCost, open);
        }

        // 3) Log move: consume the next event without firing a transition
        if (cur.traceIndex < trace.length) {
            const nxt: Node = {
                marking: cur.marking, // unchanged
                traceIndex: cur.traceIndex + 1,
                cost: cur.cost + 1,
                key: keyOf(cur.marking, cur.traceIndex + 1),
                parent: cur,
                move: { moveType: 'log', activity: nextEvent }
            };
            relax(nxt, bestCost, open);
        }
    }

    // If open exhausted (should be rare), return empty alignment
    return { alignment: [], cost: Number.POSITIVE_INFINITY };
}

/** Compute a simple alignment-based fitness in [0,1]. 1 means perfect fit (only sync moves). */
export function computeAlignmentFitness(alignment: AlignmentMove[], cost: number): number {
    if (alignment.length === 0) return cost === 0 ? 1 : 0;
    const denom = alignment.length; // sync moves count but cost=0
    const fitness = 1 - cost / denom;
    return Math.max(0, Math.min(1, fitness));
}

// --- Helpers ---

function reconstruct(node: Node): { alignment: AlignmentMove[]; cost: number } {
    const moves: AlignmentMove[] = [];
    let cur: Node | undefined = node;
    while (cur && cur.move) {
        moves.push(cur.move);
        cur = cur.parent;
    }
    moves.reverse();
    return { alignment: moves, cost: node.cost };
}

function keyOf(marking: Marking, idx: number): string {
    // Deterministic key over sorted place ids
    const parts: string[] = [String(idx)];
    const entries = Object.entries(marking).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [p, v] of entries) parts.push(p, String(v));
    return parts.join('|');
}

function relax(n: Node, best: Map<string, number>, open: PriorityQueue<Node>) {
    const prev = best.get(n.key);
    if (prev !== undefined && prev <= n.cost) return;
    best.set(n.key, n.cost);
    open.push(n);
}

function toInt(n: unknown): number { return typeof n === 'number' && isFinite(n) ? Math.trunc(n) : 0; }

function matchesEvent(tid: string, label: string | undefined, event: string): boolean {
    if (event === tid) return true;
    if (label && event === label) return true;
    return false;
}

function activityFor(t: { id: string; label?: string }): string {
    return t.label ?? t.id;
}

function groupInputArcs(arcs: Arc[], placeSet: Set<string>, transitionSet: Set<string>): Map<string, InArc[]> {
    const m = new Map<string, InArc[]>();
    for (const a of arcs) {
        if (placeSet.has(a.from) && transitionSet.has(a.to)) {
            const w = a.weight && a.weight !== 0 ? Math.trunc(a.weight) : 1;
            const arr = m.get(a.to) ?? [];
            arr.push({ place: a.from, weight: w });
            m.set(a.to, arr);
        }
    }
    return m;
}

function groupOutputArcs(arcs: Arc[], placeSet: Set<string>, transitionSet: Set<string>): Map<string, OutArc[]> {
    const m = new Map<string, OutArc[]>();
    for (const a of arcs) {
        if (transitionSet.has(a.from) && placeSet.has(a.to)) {
            const w = a.weight && a.weight !== 0 ? Math.trunc(a.weight) : 1;
            const arr = m.get(a.from) ?? [];
            arr.push({ place: a.to, weight: w });
            m.set(a.from, arr);
        }
    }
    return m;
}

function computeSinkPlaces(arcs: Arc[], placeSet: Set<string>, transitionSet: Set<string>): Set<string> {
    const hasOut = new Set<string>();
    for (const a of arcs) {
        if (placeSet.has(a.from) && transitionSet.has(a.to)) {
            hasOut.add(a.from);
        }
    }
    const sinks = new Set<string>();
    for (const p of placeSet) {
        if (!hasOut.has(p)) sinks.add(p);
    }
    return sinks;
}

function isAccepting(marking: Marking, sinkPlaces: Set<string>): boolean {
    // Accept if all tokens in non-sink places are zero
    for (const [place, tokens] of Object.entries(marking)) {
        if (!sinkPlaces.has(place) && (tokens ?? 0) !== 0) return false;
    }
    return true;
}

function isEnabled(marking: Marking, tid: string, inArcs: Map<string, InArc[]>): boolean {
    const ins = inArcs.get(tid) ?? [];
    for (const a of ins) {
        if ((marking[a.place] ?? 0) < a.weight) return false;
    }
    return true;
}

function fire(marking: Marking, tid: string, inArcs: Map<string, InArc[]>, outArcs: Map<string, OutArc[]>): Marking {
    const next: Marking = { ...marking };
    const ins = inArcs.get(tid) ?? [];
    const outs = outArcs.get(tid) ?? [];
    for (const a of ins) next[a.place] = (next[a.place] ?? 0) - a.weight;
    for (const a of outs) next[a.place] = (next[a.place] ?? 0) + a.weight;
    return next;
}
