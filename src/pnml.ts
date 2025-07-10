import type { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';

export function toPNML(nodes: Node[], edges: Edge[]): string {
  const places = nodes
    .filter((node) => node.type === 'place')
    .map(
      (node) => `
      <place id="${node.id}">
        <name>
          <text>${node.data.label}</text>
        </name>
        <initialMarking>
          <text>${node.data.tokens || 0}</text>
        </initialMarking>
      </place>`,
    )
    .join('');

  const transitions = nodes
    .filter((node) => node.type === 'transition')
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

export function fromPNML(pnmlContent: string): { nodes: Node[]; edges: Edge[] } {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(pnmlContent, 'text/xml');

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Parse places
  const places = xmlDoc.querySelectorAll('place');
  places.forEach((place, index) => {
    const id = place.getAttribute('id') || `place_${index}`;
    const nameElement = place.querySelector('name text') || place.querySelector('text');
    const markingElement = place.querySelector('initialMarking text');

    const label = nameElement?.textContent || `P${index + 1}`;
    const tokens = parseInt(markingElement?.textContent || '0', 10);

    nodes.push({
      id,
      type: 'place',
      data: { label, tokens },
      position: { x: 100 + (index % 3) * 200, y: 100 + Math.floor(index / 3) * 150 },
    });
  });

  // Parse transitions
  const transitions = xmlDoc.querySelectorAll('transition');
  transitions.forEach((transition, index) => {
    const id = transition.getAttribute('id') || `transition_${index}`;
    const nameElement = transition.querySelector('name text') || transition.querySelector('text');

    const label = nameElement?.textContent || `T${index + 1}`;

    nodes.push({
      id,
      type: 'transition',
      data: { label },
      position: { x: 200 + (index % 3) * 200, y: 200 + Math.floor(index / 3) * 150 },
    });
  });

  // Parse arcs
  const arcs = xmlDoc.querySelectorAll('arc');
  arcs.forEach((arc, index) => {
    const id = arc.getAttribute('id') || `arc_${index}`;
    const source = arc.getAttribute('source');
    const target = arc.getAttribute('target');

    if (source && target) {
      edges.push({
        id,
        source,
        target,
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    }
  });

  return { nodes, edges };
}
