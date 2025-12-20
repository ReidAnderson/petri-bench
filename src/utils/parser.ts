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

/**
 * Parse a Petri net from a specific format.
 * Supported formats: 'json' | 'pnml' | 'dot' | 'mermaid'
 */
export function parsePetriNetByFormat(text: string, format: 'json' | 'pnml' | 'dot' | 'mermaid'): PetriNetInput {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Empty input.');
    if (format === 'json') {
        return parsePetriNet(text);
    }
    if (format === 'pnml') {
        const model = parsePNML(trimmed);
        validateModel(model);
        return model;
    }
    if (format === 'dot') {
        const model = parseDOT(trimmed);
        validateModel(model);
        return model;
    }
    if (format === 'mermaid') {
        const model = parseMermaid(trimmed);
        validateModel(model);
        return model;
    }
    throw new Error(`Unsupported format: ${format}`);
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

// --- DOT parsing (basic heuristic) ---
function parseDOT(dotText: string): PetriNetInput {
    // Remove comments and compress whitespace
    const src = dotText
        .replace(/\/\/.*$/gm, '')
        .replace(/#.*$/gm, '')
        .replace(/\/\*[^]*?\*\//gm, '')
        .trim();

    const places: Array<{ id: string; label?: string; tokens?: number }> = [];
    const transitions: Array<{ id: string; label?: string }> = [];
    const arcs: Array<{ from: string; to: string; weight?: number }> = [];
    const nodeTypes = new Map<string, 'place' | 'transition'>();
    const nodeLabels = new Map<string, string | undefined>();
    const nodeTokens = new Map<string, number | undefined>();

    // Node statements: "id" [shape=box|circle, label="..."];
    const nodeRegex = /(?:"([^"]+)"|([A-Za-z0-9_]+))\s*\[(.*?)\]\s*;/g;
    let nm: RegExpExecArray | null;
    while ((nm = nodeRegex.exec(src))) {
        const id = nm[1] ?? nm[2];
        const attrsRaw = nm[3];
        const attrs: Record<string, string> = {};
        for (const part of attrsRaw.split(',')) {
            const [k, v] = part.split('=').map(s => s.trim());
            if (!k) continue;
            const val = v?.replace(/^"|"$/g, '') ?? '';
            attrs[k.toLowerCase()] = val;
        }
        const shape = (attrs['shape'] || '').toLowerCase();
        const label = attrs['label'];
        if (shape === 'box' || shape === 'rectangle') {
            nodeTypes.set(id, 'transition');
        } else if (shape === 'circle' || shape === 'ellipse' || shape === 'oval') {
            nodeTypes.set(id, 'place');
        }
        if (label) nodeLabels.set(id, label);
        const tokens = extractTokens(label);
        if (tokens != null) nodeTokens.set(id, tokens);
    }

    // Edge statements: "a" -> "b" [label="N"];
    const edgeRegex = /(?:"([^"]+)"|([A-Za-z0-9_]+))\s*->\s*(?:"([^"]+)"|([A-Za-z0-9_]+))(\s*\[(.*?)\])?\s*;/g;
    let em: RegExpExecArray | null;
    while ((em = edgeRegex.exec(src))) {
        const from = em[1] ?? em[2];
        const to = em[3] ?? em[4];
        const attrsRaw = em[6] ?? '';
        let weight: number | undefined;
        if (attrsRaw) {
            const attrs: Record<string, string> = {};
            for (const part of attrsRaw.split(',')) {
                const [k, v] = part.split('=').map(s => s.trim());
                if (!k) continue;
                const val = v?.replace(/^"|"$/g, '') ?? '';
                attrs[k.toLowerCase()] = val;
            }
            const lw = attrs['label'];
            const w = toIntSafe(lw ?? undefined);
            if (typeof w === 'number' && w > 1) weight = w;
        }
        arcs.push(weight ? { from, to, weight } : { from, to });
        // If types are unknown, infer from existing node declarations later
    }

    // Finalize nodes: default to place if no type known
    const ids = new Set<string>();
    for (const a of arcs) { ids.add(a.from); ids.add(a.to); }
    for (const id of ids) {
        const type = nodeTypes.get(id) ?? 'place';
        const label = nodeLabels.get(id) ?? id;
        if (type === 'place') {
            const tokens = nodeTokens.get(id);
            const p: any = { id };
            if (label && label !== id) p.label = label;
            if (typeof tokens === 'number' && tokens > 0) p.tokens = tokens;
            places.push(p);
        } else {
            const t: any = { id };
            if (label && label !== id) t.label = label;
            transitions.push(t);
        }
    }

    return { places, transitions, arcs };
}

function extractTokens(label?: string): number | undefined {
    if (!label) return undefined;
    // Match patterns like "• x3", "x3", "(x3)"
    const m = label.match(/x\s*(\d+)/i);
    if (m) {
        const n = parseInt(m[1], 10);
        return isFinite(n) ? n : undefined;
    }
    return undefined;
}

// --- Mermaid parsing (flowchart) ---
function parseMermaid(mmText: string): PetriNetInput {
    const lines = mmText
        .replace(/%%.*$/gm, '')
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

    const places: Array<{ id: string; label?: string; tokens?: number }> = [];
    const transitions: Array<{ id: string; label?: string }> = [];
    const arcs: Array<{ from: string; to: string; weight?: number }> = [];
    const nodeTypes = new Map<string, 'place' | 'transition'>();
    const nodeLabels = new Map<string, string | undefined>();
    const nodeTokens = new Map<string, number | undefined>();

    const addNodeFromToken = (token: string) => {
        // token forms:
        // id((Label)) => place
        // id[Label] or id["Label"] => transition
        const idMatch = token.match(/^([A-Za-z0-9_]+)(.*)$/);
        if (!idMatch) return;
        const id = idMatch[1];
        const rest = idMatch[2] ?? '';
        if (/(\(\(|\)\))/.test(rest)) {
            nodeTypes.set(id, 'place');
            const lm = rest.match(/\(\((.*?)\)\)/);
            const raw = lm ? lm[1] : undefined;
            const label = cleanLabel(raw);
            if (label) nodeLabels.set(id, label);
            const tokens = extractTokens(label);
            if (tokens != null) nodeTokens.set(id, tokens);
        } else if (/\[.*\]/.test(rest)) {
            nodeTypes.set(id, 'transition');
            const lm = rest.match(/\[(.*?)\]/);
            const raw = lm ? lm[1] : undefined;
            const label = cleanLabel(raw);
            if (label) nodeLabels.set(id, label);
        } else {
            // No explicit shape; leave type unresolved
        }
    };

    for (const l of lines) {
        if (/^flowchart\s+/i.test(l)) continue; // orientation line
        // Edge with optional label: A((p)) --|3|--> B[t]
        const edge = l.match(/^([A-Za-z0-9_]+)\s*-+(?:\|([^|]+)\|)?-+>\s*([^\s;]+)/);
        if (edge) {
            const left = edge[1];
            const label = edge[2];
            const right = edge[3];
            addNodeFromToken(left);
            addNodeFromToken(right);
            const fromId = (left.match(/^([A-Za-z0-9_]+)/) || [])[1];
            const toId = (right.match(/^([A-Za-z0-9_]+)/) || [])[1];
            let weight: number | undefined;
            const w = toIntSafe(label ?? undefined);
            if (typeof w === 'number' && w > 1) weight = w;
            arcs.push(weight ? { from: fromId, to: toId, weight } : { from: fromId, to: toId });
            continue;
        }
        // Standalone node declaration
        const nodeDecl = l.match(/^([A-Za-z0-9_]+)(\(\(.*\)\)|\[.*\])$/);
        if (nodeDecl) {
            addNodeFromToken(l);
            continue;
        }
    }

    // Finalize nodes inferred from arcs
    const ids = new Set<string>();
    for (const a of arcs) { ids.add(a.from); ids.add(a.to); }
    for (const k of nodeTypes.keys()) ids.add(k);
    for (const k of nodeLabels.keys()) ids.add(k);
    for (const id of ids) {
        const type = nodeTypes.get(id) ?? 'place';
        const label = nodeLabels.get(id) ?? id;
        if (type === 'place') {
            const tokens = nodeTokens.get(id);
            const p: any = { id };
            if (label && label !== id) p.label = label;
            if (typeof tokens === 'number' && tokens > 0) p.tokens = tokens;
            places.push(p);
        } else {
            const t: any = { id };
            if (label && label !== id) t.label = label;
            transitions.push(t);
        }
    }

    return { places, transitions, arcs };
}

function cleanLabel(label?: string): string | undefined {
    if (!label) return undefined;
    let s = label.trim();
    // Strip matching quotes
    s = s.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    return s;
}
