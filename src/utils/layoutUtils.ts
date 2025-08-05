import { Arc, PetriNet, Place, Transition } from '@/types';
import { forceCenter, forceLink, forceManyBody, forceSimulation, SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';

export interface LayoutNode extends SimulationNodeDatum {
    id: string;
    type: 'place' | 'transition';
    data: Place | Transition;
    x?: number;
    y?: number;
}

export interface LayoutLink extends SimulationLinkDatum<LayoutNode> {
    id: string;
    weight: number;
    data: Arc;
    source: string | LayoutNode;
    target: string | LayoutNode;
}

export interface LayoutResult {
    nodes: LayoutNode[];
    links: LayoutLink[];
    bounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        width: number;
        height: number;
    };
}

export function computeLayout(petriNet: PetriNet, width: number = 800, height: number = 600): LayoutResult {
    if (!petriNet || (petriNet.places.length === 0 && petriNet.transitions.length === 0)) {
        return {
            nodes: [],
            links: [],
            bounds: { minX: 0, maxX: width, minY: 0, maxY: height, width, height }
        };
    }

    // Create nodes from places and transitions
    const nodes: LayoutNode[] = [
        ...petriNet.places.map(place => ({
            id: place.id,
            type: 'place' as const,
            data: place,
            x: place.x || undefined,
            y: place.y || undefined,
        })),
        ...petriNet.transitions.map(transition => ({
            id: transition.id,
            type: 'transition' as const,
            data: transition,
            x: transition.x || undefined,
            y: transition.y || undefined,
        }))
    ];

    // Create links from arcs
    const links: LayoutLink[] = petriNet.arcs.map(arc => ({
        id: arc.id,
        source: arc.source,
        target: arc.target,
        weight: arc.weight,
        data: arc
    }));

    // Only run simulation if positions aren't already defined
    const needsLayout = nodes.some(node => node.x === undefined || node.y === undefined);

    if (needsLayout) {
        // Run force simulation for automatic layout
        const simulation = forceSimulation(nodes)
            .force('link', forceLink(links).id(d => (d as LayoutNode).id).distance(100))
            .force('charge', forceManyBody().strength(-300))
            .force('center', forceCenter(width / 2, height / 2))
            .stop();

        // Run simulation synchronously
        for (let i = 0; i < 300; ++i) simulation.tick();
    }

    // Calculate bounds
    const nodePositions = nodes.map(node => ({ x: node.x || 0, y: node.y || 0 }));
    const minX = Math.min(...nodePositions.map(p => p.x)) - 50;
    const maxX = Math.max(...nodePositions.map(p => p.x)) + 50;
    const minY = Math.min(...nodePositions.map(p => p.y)) - 50;
    const maxY = Math.max(...nodePositions.map(p => p.y)) + 50;

    return {
        nodes,
        links,
        bounds: {
            minX,
            maxX,
            minY,
            maxY,
            width: maxX - minX,
            height: maxY - minY
        }
    };
}

export function getTokenPositions(place: Place, radius: number = 20): Array<{ x: number; y: number }> {
    const tokens = place.tokens;
    const positions: Array<{ x: number; y: number }> = [];

    if (tokens === 0) return positions;

    if (tokens === 1) {
        positions.push({ x: 0, y: 0 });
    } else if (tokens <= 4) {
        // Arrange in a square pattern
        const offset = radius * 0.3;
        const positions2x2 = [
            { x: -offset, y: -offset },
            { x: offset, y: -offset },
            { x: -offset, y: offset },
            { x: offset, y: offset }
        ];
        for (let i = 0; i < tokens; i++) {
            positions.push(positions2x2[i]);
        }
    } else if (tokens <= 6) {
        // Arrange in a circle
        for (let i = 0; i < tokens; i++) {
            const angle = (i * 2 * Math.PI) / tokens;
            const r = radius * 0.4;
            positions.push({
                x: r * Math.cos(angle),
                y: r * Math.sin(angle)
            });
        }
    } else {
        // For many tokens, show a number instead
        return [];
    }

    return positions;
}
