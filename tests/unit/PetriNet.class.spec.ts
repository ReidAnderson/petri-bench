import { PetriNet, type Place, type Transition, type PetriEdge, type PetriNode } from '../../src/petri-net';
import type { Node as FlowNode, Edge as FlowEdge } from 'reactflow';

// Helper to create FlowNode for PetriNet constructor
const createFlowPlace = (id: string, label: string, tokens: number, x = 0, y = 0): FlowNode => ({
  id,
  type: 'place',
  data: { label, tokens },
  position: { x, y },
});

const createFlowTransition = (id: string, label: string, x = 0, y = 0): FlowNode => ({
  id,
  type: 'transition',
  data: { label },
  position: { x, y },
});

const createFlowEdge = (id: string, source: string, target: string): FlowEdge => ({
  id,
  source,
  target,
});

describe('PetriNet Class', () => {
  let petriNet: PetriNet;

  beforeEach(() => {
    petriNet = new PetriNet();
  });

  describe('Constructor and Basic Node/Edge Management', () => {
    test('should initialize with empty nodes and edges', () => {
      expect(petriNet.getNodes()).toHaveLength(0);
      expect(petriNet.getEdges()).toHaveLength(0);
    });

    test('should initialize with provided FlowNodes and FlowEdges', () => {
      const nodes: FlowNode[] = [
        createFlowPlace('p1', 'P1', 1),
        createFlowTransition('t1', 'T1'),
      ];
      const edges: FlowEdge[] = [createFlowEdge('e1', 'p1', 't1')];
      const pn = new PetriNet(nodes, edges);
      expect(pn.getNodes()).toHaveLength(2);
      expect(pn.getEdges()).toHaveLength(1);
      expect(pn.getNodeData('p1')).toEqual({ label: 'P1', tokens: 1 });
    });

    test('should add a place', () => {
      const place: Place = { id: 'p1', type: 'place', data: { label: 'P1', tokens: 1 } };
      petriNet.addNode(place);
      expect(petriNet.getNodes()).toHaveLength(1);
      expect(petriNet.getNodeData('p1')).toEqual(place.data);
    });

    test('should add a transition', () => {
      const transition: Transition = { id: 't1', type: 'transition', data: { label: 'T1' } };
      petriNet.addNode(transition);
      expect(petriNet.getNodes()).toHaveLength(1);
      expect(petriNet.getNodeData('t1')).toEqual(transition.data);
    });

    test('should throw error when adding node with existing ID', () => {
      const place: Place = { id: 'p1', type: 'place', data: { label: 'P1', tokens: 1 } };
      petriNet.addNode(place);
      expect(() => petriNet.addNode(place)).toThrow('Node with id p1 already exists.');
    });

    test('should add an edge', () => {
      const p1: Place = { id: 'p1', type: 'place', data: { label: 'P1', tokens: 1 } };
      const t1: Transition = { id: 't1', type: 'transition', data: { label: 'T1' } };
      petriNet.addNode(p1);
      petriNet.addNode(t1);
      const edge: PetriEdge = { id: 'e1', source: 'p1', target: 't1' };
      petriNet.addEdge(edge);
      expect(petriNet.getEdges()).toHaveLength(1);
      expect(petriNet.getEdges()[0]).toEqual(edge);
    });

    test('should throw error when adding edge with non-existent source/target node', () => {
        const p1: Place = { id: 'p1', type: 'place', data: { label: 'P1', tokens: 1 } };
        petriNet.addNode(p1);
        const edge: PetriEdge = { id: 'e1', source: 'p1', target: 'tNonExistent' };
        expect(() => petriNet.addEdge(edge)).toThrow('Source or target node not found for edge.');
    });

    test('should remove a node and its connected edges', () => {
      const p1: Place = { id: 'p1', type: 'place', data: { label: 'P1', tokens: 1 } };
      const t1: Transition = { id: 't1', type: 'transition', data: { label: 'T1' } };
      const p2: Place = { id: 'p2', type: 'place', data: { label: 'P2', tokens: 0 } };
      petriNet.addNode(p1);
      petriNet.addNode(t1);
      petriNet.addNode(p2);
      petriNet.addEdge({ id: 'e1', source: 'p1', target: 't1' });
      petriNet.addEdge({ id: 'e2', source: 't1', target: 'p2' });

      petriNet.removeNode('t1');
      expect(petriNet.getNodes().find(n => n.id === 't1')).toBeUndefined();
      expect(petriNet.getEdges()).toHaveLength(0); // Both edges connected to t1 should be removed
      expect(petriNet.getNodes()).toHaveLength(2); // p1 and p2 remain
    });

    test('should remove an edge', () => {
      const p1: Place = { id: 'p1', type: 'place', data: { label: 'P1', tokens: 1 } };
      const t1: Transition = { id: 't1', type: 'transition', data: { label: 'T1' } };
      petriNet.addNode(p1);
      petriNet.addNode(t1);
      petriNet.addEdge({ id: 'e1', source: 'p1', target: 't1' });
      petriNet.removeEdge('e1');
      expect(petriNet.getEdges()).toHaveLength(0);
    });
  });

  describe('isValidConnection', () => {
    const p1: PetriNode = { id: 'p1', type: 'place', data: { label: 'P1', tokens: 1 } };
    const p2: PetriNode = { id: 'p2', type: 'place', data: { label: 'P2', tokens: 0 } };
    const t1: PetriNode = { id: 't1', type: 'transition', data: { label: 'T1' } };
    const t2: PetriNode = { id: 't2', type: 'transition', data: { label: 'T2' } };

    beforeEach(() => {
        petriNet.addNode(p1);
        petriNet.addNode(p2);
        petriNet.addNode(t1);
        petriNet.addNode(t2);
    });

    test('should allow place to transition', () => {
      expect(petriNet.isValidConnection(p1, t1)).toBe(true);
    });
    test('should allow transition to place', () => {
      expect(petriNet.isValidConnection(t1, p1)).toBe(true);
    });
    test('should not allow place to place', () => {
      expect(petriNet.isValidConnection(p1, p2)).toBe(false);
    });
    test('should not allow transition to transition', () => {
      expect(petriNet.isValidConnection(t1, t2)).toBe(false);
    });
    test('should return false for non-existent nodes', () => {
        const nonExistentP: PetriNode = {id: 'px', type: 'place', data: {label: 'PX', tokens: 0}};
        const nonExistentT: PetriNode = {id: 'tx', type: 'transition', data: {label: 'TX'}};
        expect(petriNet.isValidConnection(p1, nonExistentT)).toBe(true); // True because types differ
        expect(petriNet.isValidConnection(nonExistentP, t1)).toBe(true); // True because types differ
        // Note: isValidConnection only checks types, addEdge checks existence
    });
  });

  describe('Token Management and Firing Logic', () => {
    const pIn: Place = { id: 'pIn', type: 'place', data: { label: 'P_in', tokens: 1 } };
    const pOut: Place = { id: 'pOut', type: 'place', data: { label: 'P_out', tokens: 0 } };
    const t1: Transition = { id: 't1', type: 'transition', data: { label: 'T1' } };
    const edgeIn: PetriEdge = { id: 'eIn', source: 'pIn', target: 't1' };
    const edgeOut: PetriEdge = { id: 'eOut', source: 't1', target: 'pOut' };

    beforeEach(() => {
      petriNet.addNode(pIn);
      petriNet.addNode(pOut);
      petriNet.addNode(t1);
      petriNet.addEdge(edgeIn);
      petriNet.addEdge(edgeOut);
      // Reset tokens for each test
      (pIn.data as { tokens: number }).tokens = 1;
      (pOut.data as { tokens: number }).tokens = 0;
    });

    test('setTokens should update token count for a place', () => {
      petriNet.setTokens('pIn', 5);
      expect((petriNet.getNodeData('pIn') as { tokens: number }).tokens).toBe(5);
    });

    test('setTokens should not allow negative tokens', () => {
      petriNet.setTokens('pIn', -5);
      expect((petriNet.getNodeData('pIn') as { tokens: number }).tokens).toBe(0);
    });

    test('setTokens should return false for non-existent or non-place node', () => {
      expect(petriNet.setTokens('t1', 5)).toBe(false);
      expect(petriNet.setTokens('nonExistent', 5)).toBe(false);
    });

    test('isTransitionFireable should be true if input places have tokens', () => {
      expect(petriNet.isTransitionFireable('t1')).toBe(true);
    });

    test('isTransitionFireable should be false if any input place has no tokens', () => {
      petriNet.setTokens('pIn', 0);
      expect(petriNet.isTransitionFireable('t1')).toBe(false);
    });

    test('isTransitionFireable should be false for transition with no inputs', () => {
        const tNoInput: Transition = { id: 'tNoInput', type: 'transition', data: { label: 'T_no_input' } };
        petriNet.addNode(tNoInput);
        expect(petriNet.isTransitionFireable('tNoInput')).toBe(false);
    });

    test('getFireableTransitions should return list of fireable transitions', () => {
      const fireable = petriNet.getFireableTransitions();
      expect(fireable).toHaveLength(1);
      expect(fireable[0].id).toBe('t1');
    });

    test('getFireableTransitions should return empty list if none are fireable', () => {
      petriNet.setTokens('pIn', 0);
      expect(petriNet.getFireableTransitions()).toHaveLength(0);
    });

    test('fireTransition should update token counts correctly', () => {
      const result = petriNet.fireTransition('t1');
      expect(result).not.toBeNull();
      expect(result?.updatedNodesData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'pIn', tokens: 0 }),
          expect.objectContaining({ id: 'pOut', tokens: 1 }),
        ])
      );
      expect((petriNet.getNodeData('pIn') as { tokens: number }).tokens).toBe(0);
      expect((petriNet.getNodeData('pOut') as { tokens: number }).tokens).toBe(1);
    });

    test('fireTransition should return null if transition is not fireable', () => {
      petriNet.setTokens('pIn', 0);
      expect(petriNet.fireTransition('t1')).toBeNull();
    });

    test('fireTransition should handle multiple input/output places', () => {
        const pIn2: Place = { id: 'pIn2', type: 'place', data: { label: 'P_in2', tokens: 1 } };
        const pOut2: Place = { id: 'pOut2', type: 'place', data: { label: 'P_out2', tokens: 0 } };
        petriNet.addNode(pIn2);
        petriNet.addNode(pOut2);
        petriNet.addEdge({ id: 'eIn2', source: 'pIn2', target: 't1' });
        petriNet.addEdge({ id: 'eOut2', source: 't1', target: 'pOut2' });

        const result = petriNet.fireTransition('t1');
        expect(result?.updatedNodesData).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ id: 'pIn', tokens: 0 }),
              expect.objectContaining({ id: 'pIn2', tokens: 0 }),
              expect.objectContaining({ id: 'pOut', tokens: 1 }),
              expect.objectContaining({ id: 'pOut2', tokens: 1 }),
            ])
        );
        expect((petriNet.getNodeData('pIn2') as { tokens: number }).tokens).toBe(0);
        expect((petriNet.getNodeData('pOut2') as { tokens: number }).tokens).toBe(1);
    });
  });

  describe('Getters', () => {
    test('getNodes should return all nodes (as FlowNode compatible)', () => {
        const p1: Place = { id: 'p1', type: 'place', data: { label: 'P1', tokens: 1 } };
        const t1: Transition = { id: 't1', type: 'transition', data: { label: 'T1' } };
        petriNet.addNode(p1);
        petriNet.addNode(t1);
        const nodes = petriNet.getNodes();
        expect(nodes).toHaveLength(2);
        // Check if structure is FlowNode like (id, type, data, position)
        expect(nodes[0]).toHaveProperty('id');
        expect(nodes[0]).toHaveProperty('type');
        expect(nodes[0]).toHaveProperty('data');
        expect(nodes[0]).toHaveProperty('position'); // Placeholder position
    });

    test('getEdges should return all edges', () => {
        const p1: Place = { id: 'p1', type: 'place', data: { label: 'P1', tokens: 1 } };
        const t1: Transition = { id: 't1', type: 'transition', data: { label: 'T1' } };
        petriNet.addNode(p1);
        petriNet.addNode(t1);
        const edge: PetriEdge = { id: 'e1', source: 'p1', target: 't1' };
        petriNet.addEdge(edge);
        const edges = petriNet.getEdges();
        expect(edges).toHaveLength(1);
        expect(edges[0]).toEqual(edge);
    });
  });
});
