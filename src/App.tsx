import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Controls,
  MiniMap,
  Background,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Edge,
  type ReactFlowInstance,
  type Node as FlowNode,
  reconnectEdge, // Renamed to avoid conflict with PetriNode
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';

import Sidebar from './Sidebar';
import { toPNML, fromPNML } from './pnml';
import PlaceNode from './PlaceNode';
import TransitionNode from './TransitionNode';
import { PetriNet, type PetriNode } from './petri-net'; // Added
import './App.css';

const nodeTypes = {
  place: PlaceNode,
  transition: TransitionNode,
};

// Initial state for ReactFlow nodes
const initialFlowNodes: FlowNode[] = [
  {
    id: '1',
    type: 'place',
    data: { label: 'P1', tokens: 1 },
    position: { x: 100, y: 200 },
  },
  {
    id: '2',
    type: 'transition',
    data: { label: 'T1' },
    position: { x: 300, y: 200 },
  },
  {
    id: '3',
    type: 'place',
    data: { label: 'P2', tokens: 0 },
    position: { x: 500, y: 200 },
  },
];

// Initial state for ReactFlow edges
const initialFlowEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2-3', source: '2', target: '3', markerEnd: { type: MarkerType.ArrowClosed } },
];

let idCounter = 4; // Renamed for clarity
const getId = () => `${idCounter++}`;

function PetriNetEditor() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  // Holds the PetriNet logic instance
  const petriNetRef = useRef<PetriNet>(new PetriNet(initialFlowNodes, initialFlowEdges));

  const [nodes, setNodes] = useState<FlowNode[]>(initialFlowNodes);
  const [edges, setEdges] = useState<Edge[]>(initialFlowEdges);

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const simulationInterval = useRef<number | null>(null);

  // Synchronize PetriNet instance when nodes/edges are externally changed (e.g. import)
  useEffect(() => {
    petriNetRef.current = new PetriNet(nodes, edges);
  }, [nodes, edges]);

  const isValidConnection = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      // Use PetriNet's validation logic
      // Need to cast ReactFlow node types to something PetriNet understands if they differ
      // Assuming types 'place' and 'transition' are consistent
      const sourcePetriNode = petriNetRef.current.getNodeData(connection.source!)
        ? { id: connection.source!, type: sourceNode.type, data: sourceNode.data } as PetriNode
        : undefined;
      const targetPetriNode = petriNetRef.current.getNodeData(connection.target!)
        ? { id: connection.target!, type: targetNode.type, data: targetNode.data } as PetriNode
        : undefined;

      if (!sourcePetriNode || !targetPetriNode) return false; // Should not happen if nodes exist

      return petriNetRef.current.isValidConnection(sourcePetriNode, targetPetriNode);
    },
    [nodes] // Dependency on nodes to find source/target types
  );

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const newEdge = { ...params, id: getId(), markerEnd: { type: MarkerType.ArrowClosed } } as Edge;
      try {
        petriNetRef.current.addEdge(newEdge);
        setEdges((eds) => addEdge(newEdge, eds));
      } catch (error) {
        console.error("Failed to add edge:", error);
        // Optionally show an error to the user
      }
    },
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow') as 'place' | 'transition';

      if (typeof type === 'undefined' || !type || (type !== 'place' && type !== 'transition')) return;

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newId = getId();
      const newNodeLabel = `${type === 'place' ? 'P' : 'T'}${idCounter}`; // Use current idCounter for label

      const newNodeData = {
        label: newNodeLabel,
        ...(type === 'place' && { tokens: 0 }),
      };

      const newFlowNode: FlowNode = {
        id: newId,
        type,
        position,
        data: newNodeData,
      };

      // Add to PetriNet instance first
      petriNetRef.current.addNode({
        id: newId,
        type: type,
        data: newNodeData,
      } as PetriNode);

      setNodes((nds) => nds.concat(newFlowNode));
    },
    [reactFlowInstance, setNodes] // Removed dependency on idCounter from here
  );

  const handleFire = useCallback(
    (transitionId: string) => {
      const result = petriNetRef.current.fireTransition(transitionId);
      if (result && result.updatedNodesData) {
        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            const update = result.updatedNodesData.find(u => u.id === node.id);
            if (update && node.type === 'place') {
              return { ...node, data: { ...node.data, tokens: update.tokens } };
            }
            return node;
          })
        );
      } else {
        console.log(`Transition ${transitionId} cannot fire or does not exist.`);
      }
    },
    [setNodes]
  );

  const runSimulationStep = useCallback(() => {
    const fireableTransitions = petriNetRef.current.getFireableTransitions();
    if (fireableTransitions.length > 0) {
      const randomIndex = Math.floor(Math.random() * fireableTransitions.length);
      const transitionToFire = fireableTransitions[randomIndex];
      handleFire(transitionToFire.id);
    } else {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
      setIsRunning(false);
      console.log("Simulation stopped: No fireable transitions.");
    }
  }, [handleFire]); // Removed direct dependencies on nodes/edges, relies on petriNetRef

  const handleRun = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    // Initial step, then interval
    runSimulationStep();
    simulationInterval.current = window.setInterval(runSimulationStep, 1000);
  }, [runSimulationStep, isRunning]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, []);

  const setTokensCallback = useCallback(
    (nodeId: string, tokens: number) => {
      const success = petriNetRef.current.setTokens(nodeId, tokens);
      if (success) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, tokens } } : node
          )
        );
      }
    },
    [setNodes]
  );

  // Prepare nodes for ReactFlow, injecting callbacks
  const nodesWithReactFlowData = useMemo(() => {
    return nodes.map((node) => {
      if (node.type === 'transition') {
        return {
          ...node,
          data: {
            ...node.data,
            onFire: () => handleFire(node.id),
            // Consider adding isFireable state for styling:
            // isFireable: petriNetRef.current.isTransitionFireable(node.id)
          },
        };
      }
      if (node.type === 'place') {
        return {
          ...node,
          data: {
            ...node.data,
            setTokens: (tokens: number) => setTokensCallback(node.id, tokens),
          },
        };
      }
      return node;
    });
  }, [nodes, handleFire, setTokensCallback]); // isFireable would add petriNetRef.current to deps, potentially causing re-renders

  const handleExport = useCallback(() => {
    // Use nodes and edges from ReactFlow state as they have positions
    const pnml = toPNML(nodes, edges);
    const blob = new Blob([pnml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'petrinet.pnml';
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const handleImport = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const pnmlContent = event.target?.result as string;
        const { nodes: importedNodes, edges: importedEdges } = fromPNML(pnmlContent);
        
        const maxIdFromNodes = importedNodes.length > 0
            ? Math.max(...importedNodes.map(node => parseInt(node.id.replace(/\D/g,''), 10) || 0))
            : 0;
        const maxIdFromEdges = importedEdges.length > 0
            ? Math.max(...importedEdges.map(edge => parseInt(edge.id.replace(/\D/g,''), 10) || 0))
            : 0;
        idCounter = Math.max(maxIdFromNodes, maxIdFromEdges, idCounter) + 1;
        
        // Update ReactFlow state
        setNodes(importedNodes);
        setEdges(importedEdges);
        // PetriNet instance will be updated by the useEffect hook watching nodes/edges
        
        setTimeout(() => {
          if (reactFlowInstance) {
            reactFlowInstance.fitView();
          }
        }, 100);
      } catch (error) {
        console.error('Error importing PNML file:', error);
        alert('Error importing PNML file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  }, [setNodes, setEdges, reactFlowInstance]);

  // Custom onNodesChange and onEdgesChange to sync with PetriNet
  const customOnNodesChange = useCallback((changes: NodeChange[]) => {
     setNodes(prevNodes => {
        const nextNodes = applyNodeChanges(changes, prevNodes);
        changes.forEach(change => {
            if (change.type === 'remove' && change.id) {
                petriNetRef.current.removeNode(change.id);
            }
            // Add/select/move changes are primarily UI, model updates if needed
        });
        return nextNodes;
    });
  }, [setNodes]);

  const customOnEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges(prevEdges => {
        const nextEdges = applyEdgeChanges(changes, prevEdges);
        changes.forEach(change => {
            if (change.type === 'remove' && change.id) {
                petriNetRef.current.removeEdge(change.id);
            }
        });
        return nextEdges;
    });
  }, [setEdges]);


  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar onExport={handleExport} onImport={handleImport} onRun={handleRun} onStop={handleStop} isRunning={isRunning} />
      <Box component="main" sx={{ flexGrow: 1, height: '100%' }}> {/* Changed width/height */}
        <div ref={reactFlowWrapper} style={{ width: '1000px', height: '1000px' }}> {/* Changed width/height */}
          <ReactFlow
            nodes={nodesWithReactFlowData}
            edges={edges}
            onNodesChange={customOnNodesChange} // Use custom handler
            onEdgesChange={customOnEdgesChange} // Use custom handler
            onEdgeUpdate={(oldEdge, newConnection) => { // Handle edge updates
                const updatedEdge = reconnectEdge(oldEdge, newConnection, edges);
                petriNetRef.current.removeEdge(oldEdge.id);
                petriNetRef.current.addEdge(updatedEdge[0]);
                setEdges((es) => es.map(e => e.id === oldEdge.id ? updatedEdge[0] : e));
            }}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            isValidConnection={isValidConnection}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background />
          </ReactFlow>
        </div>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ReactFlowProvider>
      <PetriNetEditor />
    </ReactFlowProvider>
  );
}

export default App;
