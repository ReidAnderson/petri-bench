import type { RankDir } from './toDot';
import type { PetriNetInput } from './types';

export type ToMermaidOptions = { direction?: RankDir };

/**
 * Convert a PetriNetInput model to Mermaid flowchart syntax.
 */
export function toMermaid(model: PetriNetInput, opts?: ToMermaidOptions): string {
    const dir = mapDir(opts?.direction ?? 'LR');
    const lines: string[] = [];
    lines.push(`flowchart ${dir}`);
    // Nodes
    for (const p of model.places) {
        const label = p.label ?? p.id;
        const tokenSuffix = typeof p.tokens === 'number' && p.tokens > 0 ? ` (x${p.tokens})` : '';
        lines.push(`${p.id}(("${escape(label + tokenSuffix)}"))`);
    }
    for (const t of model.transitions) {
        const label = t.label ?? t.id;
        lines.push(`${t.id}["${escape(label)}"]`);
    }
    // Arcs
    for (const a of model.arcs) {
        const w = a.weight && a.weight !== 1 ? `|${a.weight}|` : '';
        lines.push(`${a.from} --${w}--> ${a.to}`);
    }
    return lines.join('\n');
}

function mapDir(d: RankDir): string {
    // Mermaid supports LR, RL, TB, BT
    return d;
}

function escape(s: string): string {
    return s.replace(/"/g, '\\"');
}
