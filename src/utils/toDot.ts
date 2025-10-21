import type { PetriNetInput } from './types';

export type RankDir = 'LR' | 'TB' | 'RL' | 'BT';
export type ToDotOptions = { rankdir?: RankDir; label?: string };

export function toDot(model: PetriNetInput, options?: ToDotOptions): string {
    const lines: string[] = [];
    lines.push('digraph PetriNet {');
    const rankdir = options?.rankdir ?? 'LR';
    lines.push(`  rankdir=${rankdir};`);
    lines.push('  bgcolor="white";');
    if (options?.label) {
        lines.push(`  labelloc=t;`);
        lines.push(`  label="${escapeLabel(options.label)}";`);
    }
    lines.push('  node [fontsize=12];');
    lines.push('  edge [fontsize=10, arrowsize=0.8];');

    // Places as circles
    lines.push('  // Places');
    lines.push('  node [shape=circle, style=filled, fillcolor="#f2f7ff", color="#3b82f6"];');
    for (const p of model.places) {
        const label = p.label ?? p.id;
        const tokens = typeof p.tokens === 'number' && p.tokens > 0 ? `\n• x${p.tokens}` : '';
        lines.push(`  "${p.id}" [label="${escapeLabel(label)}${tokens}"];`);
    }

    // Transitions as boxes
    lines.push('  // Transitions');
    lines.push('  node [shape=box, style=filled, fillcolor="#fff7ed", color="#f97316", height=0.3, width=0.6];');
    for (const t of model.transitions) {
        const label = t.label ?? t.id;
        lines.push(`  "${t.id}" [label="${escapeLabel(label)}"];`);
    }

    // Arcs
    lines.push('  // Arcs');
    for (const a of model.arcs) {
        const w = (a as any).weight && (a as any).weight !== 1 ? ` [label="${(a as any).weight}"]` : '';
        lines.push(`  "${a.from}" -> "${a.to}"${w};`);
    }

    lines.push('}');
    return lines.join('\n');
}

function escapeLabel(s: string): string {
    return s.replace(/"/g, '\\"');
}
