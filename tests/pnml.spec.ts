// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { parsePetriNet } from '../src/utils/parser';

describe('PNML parsing', () => {
    it('parses simple PNML with labels, tokens, and weights', () => {
        const pnml = `
        <pnml>
          <net id="n1">
            <page id="g1">
              <place id="P1">
                <name><text>P1 Label</text></name>
                <initialMarking><text>{3}</text></initialMarking>
              </place>
              <place id="P2">
                <name><text>P2</text></name>
              </place>
              <transition id="T1">
                <name><text>Fire</text></name>
              </transition>
              <arc id="a1" source="P1" target="T1">
                <inscription><text>2</text></inscription>
              </arc>
              <arc id="a2" source="T1" target="P2" />
            </page>
          </net>
        </pnml>`;

        const model = parsePetriNet(pnml);
        expect(model.places.length).toBe(2);
        expect(model.transitions.length).toBe(1);
        expect(model.arcs.length).toBe(2);

        const p1 = model.places.find(p => p.id === 'P1')!;
        expect(p1.label).toBe('P1 Label');
        expect(p1.tokens).toBe(3);

        const t1 = model.transitions[0];
        expect(t1.id).toBe('T1');
        expect(t1.label).toBe('Fire');

        const a1 = model.arcs.find(a => a.from === 'P1' && a.to === 'T1') as any;
        expect(a1).toBeTruthy();
        expect(a1.weight).toBe(2); // explicit weight

        const a2 = model.arcs.find(a => a.from === 'T1' && a.to === 'P2') as any;
        expect(a2).toBeTruthy();
        expect(a2.weight).toBeUndefined(); // default (1) is omitted in model
    });
});
