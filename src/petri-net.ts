import type { Node as FlowNode, Edge as FlowEdge } from 'reactflow';

// Define internal types for better clarity, though they mirror ReactFlow for now
export interface Place {
  id: string;
  type: 'place';
  data: {
    label: string;
    tokens: number;
  };
}

export interface Transition {
  id: string;
  type: 'transition';
  data: {
    label: string;
  };
}

export type PetriNode = Place | Transition;
export type PetriEdge = FlowEdge; // Using FlowEdge directly as it fits well

export class PetriNet {
  private nodesMap: Map<string, PetriNode>;
  private edgesMap: Map<string, PetriEdge>;

  constructor(initialNodes: FlowNode[] = [], initialEdges: FlowEdge[] = []) {
    this.nodesMap = new Map();
    this.edgesMap = new Map();

    initialNodes.forEach(node => {
      if (node.type === 'place' || node.type === 'transition') {
        // Ensure data structure matches PetriNode, especially for places
        const petriNodeData = { ...node.data };
        if (node.type === 'place' && typeof petriNodeData.tokens !== 'number') {
            petriNodeData.tokens = 0; // Default if not provided
        }
        this.nodesMap.set(node.id, {
          id: node.id,
          type: node.type as 'place' | 'transition',
          data: petriNodeData,
        } as PetriNode);
      }
    });
    initialEdges.forEach(edge => this.edgesMap.set(edge.id, edge));
  }

  // --- Structure Modification Methods ---
  addNode(node: PetriNode): void {
    if (this.nodesMap.has(node.id)) {
      throw new Error(`Node with id ${node.id} already exists.`);
    }
    this.nodesMap.set(node.id, node);
  }

  removeNode(nodeId: string): void {
    if (!this.nodesMap.has(nodeId)) {
      return; // Or throw error
    }
    this.nodesMap.delete(nodeId);
    // Also remove connected edges
    this.edgesMap.forEach(edge => {
      if (edge.source === nodeId || edge.target === nodeId) {
        this.edgesMap.delete(edge.id);
      }
    });
  }

  addEdge(edge: PetriEdge): void {
    if (this.edgesMap.has(edge.id)) {
      throw new Error(`Edge with id ${edge.id} already exists.`);
    }
    const sourceNode = this.nodesMap.get(edge.source);
    const targetNode = this.nodesMap.get(edge.target);
    if (!sourceNode || !targetNode) {
      throw new Error('Source or target node not found for edge.');
    }
    if (!this.isValidConnection(sourceNode, targetNode)) {
        throw new Error('Invalid connection between node types.');
    }
    this.edgesMap.set(edge.id, edge);
  }

  removeEdge(edgeId: string): void {
    this.edgesMap.delete(edgeId);
  }

  // --- Logic Methods ---
  isValidConnection(sourceNode: PetriNode | FlowNode, targetNode: PetriNode | FlowNode): boolean {
    if (!sourceNode || !targetNode) {
      return false;
    }
    // Places can only connect to transitions, and transitions can only connect to places
    return sourceNode.type !== targetNode.type;
  }

  setTokens(placeId: string, tokens: number): boolean {
    const node = this.nodesMap.get(placeId);
    if (node && node.type === 'place') {
      (node as Place).data.tokens = Math.max(0, tokens); // Tokens cannot be negative
      return true;
    }
    return false;
  }

  isTransitionFireable(transitionId: string): boolean {
    const transition = this.nodesMap.get(transitionId);
    if (!transition || transition.type !== 'transition') {
      return false;
    }

    const incomingEdges = Array.from(this.edgesMap.values()).filter(
      (edge) => edge.target === transitionId
    );

    if (incomingEdges.length === 0) {
        // Some definitions require at least one input for a transition to be enabled.
        // Adjust if your definition allows source-less transitions to fire.
        return false;
    }

    return incomingEdges.every((edge) => {
      const sourcePlace = this.nodesMap.get(edge.source) as Place | undefined;
      return sourcePlace && sourcePlace.type === 'place' && sourcePlace.data.tokens > 0;
    });
  }

  getFireableTransitions(): Transition[] {
    const fireable: Transition[] = [];
    this.nodesMap.forEach(node => {
      if (node.type === 'transition' && this.isTransitionFireable(node.id)) {
        fireable.push(node as Transition);
      }
    });
    return fireable;
  }

  fireTransition(transitionId: string): { updatedNodesData: Array<{id: string, tokens: number}> } | null {
    if (!this.isTransitionFireable(transitionId)) {
      return null;
    }

    const updatedNodesData: Array<{id: string, tokens: number}> = [];

    // Consume tokens from input places
    Array.from(this.edgesMap.values())
      .filter((edge) => edge.target === transitionId)
      .forEach((edge) => {
        const place = this.nodesMap.get(edge.source) as Place;
        place.data.tokens -= 1;
        updatedNodesData.push({id: place.id, tokens: place.data.tokens});
      });

    // Produce tokens in output places
    Array.from(this.edgesMap.values())
      .filter((edge) => edge.source === transitionId)
      .forEach((edge) => {
        const place = this.nodesMap.get(edge.target) as Place;
        place.data.tokens += 1;
        updatedNodesData.push({id: place.id, tokens: place.data.tokens});
      });

    return { updatedNodesData };
  }

  // --- Getter Methods (to be used by ReactFlow) ---
  getNodes(): FlowNode[] {
    return Array.from(this.nodesMap.values()).map(node => {
      // This mapping assumes PetriNode structure is compatible with FlowNode
      // For ReactFlow, we need position, which PetriNet class doesn't manage.
      // This means App.tsx will need to merge PetriNet data with position data.
      // For now, this method might be less useful directly for ReactFlow rendering
      // without positional data. Let's return the internal nodes, and App.tsx can adapt.
      return {
        id: node.id,
        type: node.type,
        data: { ...node.data },
        // Position is managed by ReactFlow, not stored in PetriNet model
        position: { x: 0, y: 0 }, // Placeholder, App.tsx needs to handle this
      };
    });
  }

  getEdges(): FlowEdge[] {
    return Array.from(this.edgesMap.values());
  }

  // Utility to get a single node's data, useful for updates
  getNodeData(nodeId: string): PetriNode['data'] | undefined {
    return this.nodesMap.get(nodeId)?.data;
  }
}
