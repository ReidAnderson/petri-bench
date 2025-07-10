import type { Node, Edge } from 'reactflow';

export function toPNML(nodes: Node[], edges: Edge[]): string {
  const places = nodes
    .filter((node) => node.type === 'input' || node.type === 'output')
    .map(
      (node) => `
      <place id="${node.id}">
        <name>
          <text>${node.data.label}</text>
        </name>
        <initialMarking>
          <text>0</text>
        </initialMarking>
      </place>`,
    )
    .join('');

  const transitions = nodes
    .filter((node) => node.type === 'default')
    .map(
      (node) => `
      <transition id="${node.id}">
        <name>
          <text>${node.data.label}</text>
        </name>
      </transition>`,
    )
    .join('');

  const arcs = edges
    .map(
      (edge) => `
      <arc id="${edge.id}" source="${edge.source}" target="${edge.target}" />`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<pnml>
  <net id="net1" type="http://www.pnml.org/version-2009/grammar/pnmlcoremodel">
    <name>
      <text>Petri Net</text>
    </name>
    <page id="page1">
      ${places}
      ${transitions}
      ${arcs}
    </page>
  </net>
</pnml>
`;
}
