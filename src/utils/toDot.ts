import type { PetriNet } from './types';

export type RankDir = 'LR' | 'TB' | 'RL' | 'BT';
export type ToDotOptions = { rankdir?: RankDir; label?: string };

export function toDot(model: PetriNet, options?: ToDotOptions): string {
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
        const displayLabel = formatNodeDisplay(p.id, p.label);
        const tokens = typeof p.tokens === 'number' && p.tokens > 0 ? `\n• x${p.tokens}` : '';
        const finalLabel = `${displayLabel}${tokens}`;
        lines.push(`  "${p.id}" [label="${escapeLabel(finalLabel)}"];`);
    }

    // Transitions as boxes
    lines.push('  // Transitions');
    lines.push('  node [shape=box, style=filled, fillcolor="#fff7ed", color="#f97316", height=0.3, width=0.6];');
    for (const t of model.transitions) {
        const displayLabel = formatNodeDisplay(t.id, t.label);
        lines.push(`  "${t.id}" [label="${escapeLabel(displayLabel)}"];`);
    }

    // Arcs
    lines.push('  // Arcs');
    for (const a of model.arcs) {
        const w = a.weight && a.weight !== 1 ? ` [label="${a.weight}"]` : '';
        lines.push(`  "${a.sourceId}" -> "${a.targetId}"${w};`);
    }

    lines.push('}');
    return lines.join('\n');
}

function escapeLabel(s: string): string {
    return s.replace(/"/g, '\\"');
}

function formatNodeDisplay(id: string, rawLabel?: string | null): string {
    const truncatedId = id.length > 4 ? `${id.slice(0, 4)}...` : id;
    const label = rawLabel?.trim();
    return label ? `${truncatedId}: ${label}` : truncatedId;
}
