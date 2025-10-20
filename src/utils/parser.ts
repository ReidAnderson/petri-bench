import type { PetriNetInput } from './types';

/**
 * Parse a Petri net from either JSON (preferred) or PNML (XML) text.
 * - Auto-detects PNML if text starts with '<' or contains '<pnml'.
 */
export function parsePetriNet(text: string): PetriNetInput {
    const trimmed = text.trim();
    // Heuristic: XML / PNML if starts with '<' or includes '<pnml'
    if (trimmed.startsWith('<') || /<\s*pnml[\s>]/i.test(trimmed)) {
        const model = parsePNML(trimmed);
        validateModel(model);
        return model;
    }

    // JSON path (backward compatible)
    let obj: unknown;
    try {
        obj = JSON.parse(text);
    } catch (e) {
        throw new Error('Input is not valid JSON or PNML.');
    }
    if (typeof obj !== 'object' || obj === null) throw new Error('Root must be an object.');
    const root = obj as Record<string, unknown>;

    // Basic shape checks
    asArray(root.places, 'places');
    asArray(root.transitions, 'transitions');
    asArray(root.arcs, 'arcs');

    const model: PetriNetInput = obj as PetriNetInput;
    validateModel(model);
    return model;
}

// --- JSON helpers ---
function asArray(value: unknown, name: string): unknown[] {
    if (!Array.isArray(value)) throw new Error(`${name} must be an array.`);
    return value;
}

function asString(value: unknown, name: string): string {
    if (typeof value !== 'string') throw new Error(`${name} must be a string.`);
    return value;
}

// --- Shared validation ---
function validateModel(model: PetriNetInput) {
    const placeIds = new Set<string>();
    const transitionIds = new Set<string>();

    for (const p of model.places) {
        const id = asString((p as any).id, 'place.id');
        if (placeIds.has(id)) throw new Error(`Duplicate place id: ${id}`);
        placeIds.add(id);
    }
    for (const t of model.transitions) {
        const id = asString((t as any).id, 'transition.id');
        if (transitionIds.has(id)) throw new Error(`Duplicate transition id: ${id}`);
        transitionIds.add(id);
    }
    for (const a of model.arcs) {
        const from = asString((a as any).from, 'arc.from');
        const to = asString((a as any).to, 'arc.to');
        if (!(placeIds.has(from) || transitionIds.has(from))) throw new Error(`Arc.from not found: ${from}`);
        if (!(placeIds.has(to) || transitionIds.has(to))) throw new Error(`Arc.to not found: ${to}`);
    }
}

// --- PNML parsing ---
function parsePNML(xmlText: string): PetriNetInput {
    // Use DOMParser in browser; if unavailable, throw an explicit error
    const DOMP: any = (globalThis as any).DOMParser ? (globalThis as any).DOMParser : null;
    if (!DOMP) {
        throw new Error('PNML parsing requires a DOMParser environment (browser).');
    }
    const parser: any = new DOMP();
    const doc: any = parser.parseFromString(xmlText, 'text/xml');
    // Detect parsererror
    const perr = doc.getElementsByTagName && doc.getElementsByTagName('parsererror');
    if (perr && perr.length > 0) {
        throw new Error('Invalid PNML XML.');
    }

    // Find <net>
    const net: any = firstTag(doc, 'net');
    if (!net) throw new Error('PNML missing <net> element.');

    // Collect places
    const places: Array<{ id: string; label?: string; tokens?: number }> = [];
    const placeEls: any[] = Array.from(net.getElementsByTagName('place') ?? []);
    for (const el of placeEls) {
        const id = attr(el, 'id');
        if (!id) throw new Error('PNML place missing id');
        const label = nestedText(el, ['name', 'text']);
        const imark = nestedText(el, ['initialMarking', 'text']);
        const tokens = toIntSafe(imark);
        const p: any = { id };
        if (label) p.label = label;
        if (typeof tokens === 'number' && tokens > 0) p.tokens = tokens;
        places.push(p);
    }

    // Collect transitions
    const transitions: Array<{ id: string; label?: string }> = [];
    const transEls: any[] = Array.from(net.getElementsByTagName('transition') ?? []);
    for (const el of transEls) {
        const id = attr(el, 'id');
        if (!id) throw new Error('PNML transition missing id');
        const label = nestedText(el, ['name', 'text']);
        const t: any = { id };
        if (label) t.label = label;
        transitions.push(t);
    }

    // Collect arcs
    const arcs: Array<{ from: string; to: string; weight?: number }> = [];
    const arcEls: any[] = Array.from(net.getElementsByTagName('arc') ?? []);
    for (const el of arcEls) {
        const from = attr(el, 'source');
        const to = attr(el, 'target');
        if (!from || !to) throw new Error('PNML arc missing source/target');
        const wText = nestedText(el, ['inscription', 'text']);
        const w = toIntSafe(wText) ?? 1;
        const a: any = { from, to };
        if (w > 1) a.weight = w;
        arcs.push(a);
    }

    return { places, transitions, arcs };
}

// --- PNML helpers ---
function firstTag(root: any, tag: string): any | null {
    const els = root.getElementsByTagName ? root.getElementsByTagName(tag) : [];
    return els && els.length ? els[0] : null;
}

function attr(el: any, name: string): string | null {
    return el && el.getAttribute ? el.getAttribute(name) : null;
}

function nestedText(el: any, chain: string[]): string | undefined {
    let cur: any = el;
    for (const t of chain) {
        if (!cur || !cur.getElementsByTagName) return undefined;
        const next = cur.getElementsByTagName(t);
        cur = next && next.length ? next[0] : null;
    }
    const raw = cur && typeof cur.textContent === 'string' ? cur.textContent : undefined;
    const trimmed = typeof raw === 'string' ? raw.trim() : undefined;
    return trimmed || undefined;
}

function toIntSafe(s?: string): number | undefined {
    if (!s) return undefined;
    // Extract first integer, allowing forms like "{3}" or "3"
    const m = String(s).match(/-?\d+/);
    if (!m) return undefined;
    const n = parseInt(m[0], 10);
    return isFinite(n) ? n : undefined;
}
