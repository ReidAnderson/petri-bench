import type { PetriNet } from './types';

/**
 * Convert a PetriNet model to minimal PNML string.
 */
export function toPNML(model: PetriNet): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<pnml>');
    lines.push('  <net id="net1">');
    for (const p of model.places) {
        lines.push(`    <place id="${esc(p.id)}">`);
        if (p.label) {
            lines.push('      <name><text>' + esc(p.label) + '</text></name>');
        }
        if (typeof p.tokens === 'number' && p.tokens > 0) {
            lines.push('      <initialMarking><text>{' + p.tokens + '}</text></initialMarking>');
        }
        lines.push('    </place>');
    }
    for (const t of model.transitions) {
        lines.push(`    <transition id="${esc(t.id)}">`);
        if (t.label) {
            lines.push('      <name><text>' + esc(t.label) + '</text></name>');
        }
        lines.push('    </transition>');
    }
    for (const a of model.arcs) {
        lines.push(`    <arc id="${esc(a.from)}_to_${esc(a.to)}" source="${esc(a.from)}" target="${esc(a.to)}">`);
        const w = a.weight && a.weight !== 1 ? a.weight : 1;
        lines.push('      <inscription><text>{' + w + '}</text></inscription>');
        lines.push('    </arc>');
    }
    lines.push('  </net>');
    lines.push('</pnml>');
    return lines.join('\n');
}
