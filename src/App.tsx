import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  MiniMap,
  Background,
  MarkerType,
  type Connection,
  type Edge,
  type ReactFlowInstance,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';

import Sidebar from './Sidebar';
import { toPNML, fromPNML } from './pnml';
import PlaceNode from './PlaceNode';
import TransitionNode from './TransitionNode';
import './App.css';

const nodeTypes = {
  place: PlaceNode,
  transition: TransitionNode,
};

const initialNodes: Node[] = [
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

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2-3', source: '2', target: '3', markerEnd: { type: MarkerType.ArrowClosed } },
];

let id = 4;
const getId = () => `${id++}`;

function PetriNetEditor() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const simulationInterval = useRef<number | null>(null);

  // Validate connections to enforce Petri net constraints
  const isValidConnection = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);

      if (!sourceNode || !targetNode) {
        return false;
      }

      // Places can only connect to transitions, and transitions can only connect to places
      if (sourceNode.type === targetNode.type) {
        return false;
      }

      return true;
    },
    [nodes]
  );

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      // check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: {
          label: `${type === 'place' ? 'P' : 'T'}${id}`,
          ...(type === 'place' && { tokens: 0 }),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const handleFire = useCallback(
    (transitionId: string) => {
      setNodes((currentNodes) => {
        const newNodes = [...currentNodes];
        const transitionNodeIndex = newNodes.findIndex((n) => n.id === transitionId);
        if (transitionNodeIndex === -1) return currentNodes;

        const inputEdges = edges.filter((e) => e.target === transitionId);
        const outputEdges = edges.filter((e) => e.source === transitionId);

        const inputPlaceIndices = inputEdges.map((edge) => newNodes.findIndex((n) => n.id === edge.source));
        const outputPlaceIndices = outputEdges.map((edge) => newNodes.findIndex((n) => n.id === edge.target));

        const canFire = inputPlaceIndices.every((index) => newNodes[index].data.tokens > 0);

        if (canFire) {
          inputPlaceIndices.forEach((index) => {
            newNodes[index] = {
              ...newNodes[index],
              data: { ...newNodes[index].data, tokens: newNodes[index].data.tokens - 1 },
            };
          });
          outputPlaceIndices.forEach((index) => {
            newNodes[index] = {
              ...newNodes[index],
              data: { ...newNodes[index].data, tokens: newNodes[index].data.tokens + 1 },
            };
          });
        } else {
          console.log(`Transition ${transitionId} cannot fire: not enough tokens.`);
        }

        return newNodes;
      });
    },
    [edges, setNodes]
  );

  const findFireableTransition = useCallback(() => {
    const transitions = nodes.filter((n) => n.type === 'transition');
    const fireableTransitions = transitions.filter((transition) => {
      const inputEdges = edges.filter((e) => e.target === transition.id);
      if (inputEdges.length === 0) return false; // Transitions must have inputs to be enabled
      const canFire = inputEdges.every((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        return sourceNode && sourceNode.data.tokens > 0;
      });
      return canFire;
    });

    if (fireableTransitions.length > 0) {
      // Pick a random fireable transition
      const randomIndex = Math.floor(Math.random() * fireableTransitions.length);
      return fireableTransitions[randomIndex].id;
    }

    return null;
  }, [nodes, edges]);

  const runSimulationStep = useCallback(() => {
    const fireableId = findFireableTransition();
    if (fireableId) {
      handleFire(fireableId);
    } else {
      // Stop the simulation if no more transitions can be fired
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
      setIsRunning(false);
    }
  }, [findFireableTransition, handleFire]);

  const handleRun = useCallback(() => {
    setIsRunning(true);
    simulationInterval.current = window.setInterval(runSimulationStep, 1000);
  }, [runSimulationStep]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, []);

  const setTokens = useCallback(
    (nodeId: string, tokens: number) => {
      setNodes((currentNodes) => {
        const newNodes = [...currentNodes];
        const nodeIndex = newNodes.findIndex((n) => n.id === nodeId);
        if (nodeIndex > -1) {
          newNodes[nodeIndex] = {
            ...newNodes[nodeIndex],
            data: { ...newNodes[nodeIndex].data, tokens },
          };
        }
        return newNodes;
      });
    },
    [setNodes]
  );

  const nodesWithSimData = useMemo(() => {
    return nodes.map((node) => {
      if (node.type === 'transition') {
        return {
          ...node,
          data: {
            ...node.data,
            onFire: () => handleFire(node.id),
          },
        };
      }
      if (node.type === 'place') {
        return {
          ...node,
          data: {
            ...node.data,
            setTokens: (tokens: number) => setTokens(node.id, tokens),
          },
        };
      }
      return node;
    });
  }, [nodes, handleFire, setTokens]);

  const handleExport = useCallback(() => {
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
        
        // Update the ID counter to avoid conflicts
        const maxId = Math.max(
          ...importedNodes.map(node => parseInt(node.id.replace(/\D/g, '')) || 0),
          ...importedEdges.map(edge => parseInt(edge.id.replace(/\D/g, '')) || 0),
          id
        );
        id = maxId + 1;
        
        setNodes(importedNodes);
        setEdges(importedEdges);
        
        // Fit the view to show all imported nodes
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

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar onExport={handleExport} onImport={handleImport} onRun={handleRun} onStop={handleStop} isRunning={isRunning} />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <div ref={reactFlowWrapper} style={{ width: '1500px', height: '1500px' }}>
          <ReactFlow
            nodes={nodesWithSimData}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
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
