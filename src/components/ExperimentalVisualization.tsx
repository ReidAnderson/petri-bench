import { PetriNet, Place, ReplayStepEntry, Transition } from '@/types'
import { getTokenPositions } from '@/utils/layoutUtils'
import { updateTransitionStates } from '@/utils/petriNetUtils'
import { RotateCcw } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import ReactFlow, {
    Background,
    Connection,
    Controls,
    Edge,
    MarkerType,
    MiniMap,
    Node,
    NodeDragHandler,
    useEdgesState,
    useNodesState,
} from 'reactflow'
import 'reactflow/dist/style.css'

// ----------------------------------------------------------------------------
// Public props (superset of original PetriNetVisualization for drop-in replace)
// ----------------------------------------------------------------------------
export interface PetriNetVisualizationProps {
    mode: 'simulator' | 'conformance'
    petriNet: PetriNet | null
    onFireTransition?: (transitionId: string) => void
    onSelectElement?: (sel: { type: 'place' | 'transition'; id: string }) => void
    highlightedTransitionId?: string
    onResetMarking?: () => void
    highlightValidIds?: string[]
    highlightInvalidIds?: string[]
    ghostTransitions?: Array<{ name: string; count: number }>
    replaySequence?: ReplayStepEntry[]
    // New: propagate structural / marking edits upward
    onPetriNetChange?: (net: PetriNet) => void
}

// Internal helper types for React Flow node data
interface PlaceNodeData { name: string; tokens: number; maxTokens?: number }
interface TransitionNodeData { name: string; enabled: boolean }

// ----------------------------------------------------------------------------
// Custom Node Components
// ----------------------------------------------------------------------------
import { Handle, Position } from 'reactflow'

const PlaceNode: React.FC<{ id: string; data: PlaceNodeData; selected: boolean }> = ({ data, selected }) => {
    const radius = 30
    const tokenPositions = getTokenPositions({ id: '', name: '', x: 0, y: 0, tokens: data.tokens, maxTokens: data.maxTokens } as Place, radius)
    return (
        <div className={`relative rounded-full border-2 w-[60px] h-[60px] flex items-center justify-center select-none transition-colors ${selected ? 'ring-2 ring-blue-400' : ''} bg-blue-50 border-blue-500`}>
            <Handle type="source" position={Position.Right} className="!w-3 !h-3 bg-blue-600" />
            {/* Tokens */}
            {data.tokens > 6 ? (
                <span className="text-sm font-semibold text-slate-800">{data.tokens}</span>
            ) : (
                tokenPositions.map((pos, i) => (
                    <div key={i} className="absolute w-2 h-2 rounded-full bg-slate-800" style={{ transform: `translate(${30 + pos.x}px, ${30 + pos.y}px)` }} />
                ))
            )}
            <label className="absolute -bottom-6 font-medium text-[11px] max-w-[80px] truncate text-center">{data.name}</label>
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-white border-2 border-blue-600" />
        </div>
    )
}

const TransitionNode: React.FC<{ id: string; data: TransitionNodeData; selected: boolean; pulse: boolean; valid: boolean; invalid: boolean }> = ({ data, selected, pulse, valid, invalid }) => {
    const stateColor = valid ? 'emerald' : invalid ? 'rose' : data.enabled ? 'slate' : 'gray'
    const bg = valid ? 'bg-emerald-50' : invalid ? 'bg-rose-50' : data.enabled ? 'bg-slate-50' : 'bg-gray-50'
    const border = valid ? 'border-emerald-500' : invalid ? 'border-rose-500' : data.enabled ? 'border-slate-600' : 'border-slate-300'
    return (
        <div className={`relative rounded-md border-2 w-[28px] h-[60px] flex items-center justify-center select-none ${bg} ${border} ${pulse ? 'animate-pulse' : ''} ${selected ? 'ring-2 ring-blue-400' : ''}`}>
            <Handle type="source" position={Position.Right} className={`!w-3 !h-3 bg-${stateColor}-600`} />
            {data.enabled && !invalid && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
            )}
            <label className="absolute -bottom-6 font-medium text-[11px] max-w-[100px] truncate text-center">{data.name}</label>
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-white border-2 border-slate-400" />
        </div>
    )
}

const nodeTypes = {
    place: PlaceNode,
    transition: TransitionNode,
}

// ----------------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------------
const ExperimentalVisualization: React.FC<PetriNetVisualizationProps> = ({
    mode,
    petriNet,
    onFireTransition,
    onSelectElement,
    highlightedTransitionId,
    onResetMarking,
    highlightValidIds = [],
    highlightInvalidIds = [],
    replaySequence = [],
    onPetriNetChange,
}) => {
    const reactFlowWrapper = useRef<HTMLDivElement | null>(null)

    // Editable only in simulator & when callback provided
    const editable = mode === 'simulator' && !!onPetriNetChange

    // Derive nodes/edges from petriNet
    const rfNodes: Node[] = useMemo(() => {
        if (!petriNet) return []
        return [
            ...petriNet.places.map(p => ({
                id: p.id,
                type: 'place',
                position: { x: p.x, y: p.y },
                data: { name: p.name, tokens: p.tokens, maxTokens: p.maxTokens },
                draggable: editable,
                selectable: true,
            } as Node<PlaceNodeData>)),
            ...petriNet.transitions.map(t => ({
                id: t.id,
                type: 'transition',
                position: { x: t.x, y: t.y },
                data: { name: t.name, enabled: t.enabled },
                draggable: editable,
                selectable: true,
            } as Node<TransitionNodeData>)),
        ]
    }, [petriNet, editable])

    const rfEdges: Edge[] = useMemo(() => {
        if (!petriNet) return []
        return petriNet.arcs.map(a => ({
            id: a.id,
            source: a.source,
            target: a.target,
            data: { weight: a.weight },
            type: 'default',
            markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
            label: a.weight > 1 ? String(a.weight) : undefined,
            style: { strokeWidth: 2 },
            selectable: editable,
        }))
    }, [petriNet, editable])

    const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges)

    // Sync when petriNet changes from outside
    useEffect(() => { setNodes(rfNodes); setEdges(rfEdges) }, [rfNodes, rfEdges, setNodes, setEdges])

    // Valid/invalid sets
    const validSet = useMemo(() => new Set(highlightValidIds), [highlightValidIds])
    const invalidSet = useMemo(() => new Set(highlightInvalidIds), [highlightInvalidIds])

    // Handlers --------------------------------------------------------------
    const updatePetriNetPositions = useCallback((changed: Node[]) => {
        if (!petriNet || !onPetriNetChange) return
        const next: PetriNet = {
            places: petriNet.places.map(p => {
                const n = changed.find(nn => nn.id === p.id)
                return n ? { ...p, x: n.position.x, y: n.position.y } : p
            }),
            transitions: petriNet.transitions.map(t => {
                const n = changed.find(nn => nn.id === t.id)
                return n ? { ...t, x: n.position.x, y: n.position.y } : t
            }),
            arcs: [...petriNet.arcs],
        }
        onPetriNetChange(updateTransitionStates(next))
    }, [petriNet, onPetriNetChange])

    const onNodeDragStop: NodeDragHandler = useCallback((_e, _node, nodesArr) => {
        updatePetriNetPositions(nodesArr as Node[])
    }, [updatePetriNetPositions])

    const onConnect = useCallback((connection: Connection) => {
        if (!petriNet || !onPetriNetChange || !editable || !connection.source || !connection.target) return
        const sourceType = petriNet.places.some(p => p.id === connection.source) ? 'place' : 'transition'
        const targetType = petriNet.places.some(p => p.id === connection.target) ? 'place' : 'transition'
        if (sourceType === targetType) return
        if (petriNet.arcs.some(a => a.source === connection.source && a.target === connection.target)) return
        const newArcId = `a${Date.now()}`
        const next: PetriNet = {
            ...petriNet,
            arcs: [...petriNet.arcs, { id: newArcId, source: connection.source, target: connection.target, weight: 1 }],
        }
        onPetriNetChange(updateTransitionStates(next))
    }, [petriNet, onPetriNetChange, editable])

    const handleNodeClick = useCallback((e: React.MouseEvent, node: Node) => {
        // Ctrl+Click on an enabled transition fires it
        if (node.type === 'transition' && e.ctrlKey) {
            if (onFireTransition && petriNet?.transitions.find(t => t.id === node.id)?.enabled) {
                onFireTransition(node.id)
            }
            return
        }
        // Just notify selection upward for external sidebar
        if (onSelectElement) onSelectElement({ type: node.type as 'place' | 'transition', id: node.id })
    }, [onFireTransition, onSelectElement, petriNet])

    const addPlace = useCallback(() => {
        if (!petriNet || !onPetriNetChange) return
        const idBase = 'p'
        let idx = petriNet.places.length + 1
        while (petriNet.places.some(p => p.id === `${idBase}${idx}`)) idx++
        const newPlace: Place = { id: `${idBase}${idx}`, name: `P${idx}`, x: 100, y: 100, tokens: 0 }
        const next = updateTransitionStates({ ...petriNet, places: [...petriNet.places, newPlace] })
        onPetriNetChange(next)
    }, [petriNet, onPetriNetChange])

    const addTransition = useCallback(() => {
        if (!petriNet || !onPetriNetChange) return
        const idBase = 't'
        let idx = petriNet.transitions.length + 1
        while (petriNet.transitions.some(t => t.id === `${idBase}${idx}`)) idx++
        const newT: Transition = { id: `${idBase}${idx}`, name: `T${idx}`, x: 200, y: 100, width: 30, height: 50, enabled: false }
        const next = updateTransitionStates({ ...petriNet, transitions: [...petriNet.transitions, newT] })
        onPetriNetChange(next)
    }, [petriNet, onPetriNetChange])

    // Highlight styling injection
    const styledNodes = useMemo(() => nodes.map(n => {
        if (n.type === 'transition') {
            const pulse = highlightedTransitionId === n.id
            const valid = validSet.has(n.id)
            const invalid = invalidSet.has(n.id)
            return { ...n, data: { ...(n.data as any), pulse, valid, invalid } }
        }
        return n
    }), [nodes, highlightedTransitionId, validSet, invalidSet])

    const narrative = useMemo(() => replaySequence.map(s => ({ ...s })), [replaySequence])

    if (!petriNet) {
        return (
            <div className="bg-white p-6 rounded-lg shadow flex flex-col">
                <h2 className="text-lg font-semibold mb-4">{mode === 'simulator' ? 'Petri Net' : 'Annotated Net'}</h2>
                <div className="flex-1 min-h-[300px] flex items-center justify-center text-slate-500 text-sm">No Petri Net loaded</div>
            </div>
        )
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow flex flex-col relative">
            <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-semibold flex-1">{mode === 'simulator' ? 'Petri Net' : 'Conformance View'}</h2>
                {editable && (
                    <div className="flex items-center gap-2">
                        <button onClick={addPlace} className="px-2 py-1 text-xs rounded border bg-blue-50 hover:bg-blue-100">Add Place</button>
                        <button onClick={addTransition} className="px-2 py-1 text-xs rounded border bg-blue-50 hover:bg-blue-100">Add Transition</button>
                    </div>
                )}
                {onResetMarking && (
                    <button onClick={() => onResetMarking()} className="px-2 py-1 text-xs rounded border flex items-center gap-1 bg-slate-50 hover:bg-slate-100" title="Reset Marking">
                        <RotateCcw size={14} /> Reset
                    </button>
                )}
            </div>
            <div className="relative" ref={reactFlowWrapper} style={{ height: '60vh', minHeight: 420 }}>
                {editable && (
                    <div className="pointer-events-none absolute z-10 top-2 left-2 text-[11px] text-slate-600 bg-white/80 backdrop-blur px-2 py-1 rounded border border-slate-200 shadow-sm">
                        Ctrl+Click an enabled transition to fire
                    </div>
                )}
                <ReactFlow
                    nodes={styledNodes as any}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={handleNodeClick}
                    onNodeDragStop={onNodeDragStop}
                    nodesDraggable={editable}
                    nodesConnectable={editable}
                    edgesUpdatable={false}
                    elementsSelectable={true}
                    nodeTypes={nodeTypes as any}
                    fitView
                    minZoom={0.2}
                    maxZoom={2}
                    zoomOnScroll
                    zoomOnPinch
                    zoomOnDoubleClick={false}
                    panOnScroll
                    panOnDrag
                    preventScrolling={false}
                >
                    <MiniMap className="hidden md:block" />
                    <Controls />
                    <Background />
                </ReactFlow>
            </div>
            {narrative.length > 0 && (
                <div className="mt-4 p-3 rounded border bg-white">
                    <h3 className="text-sm font-medium mb-2">Executed path</h3>
                    <div className="flex flex-wrap gap-2">
                        {narrative.map((e, i) => {
                            const base = 'px-2 py-0.5 rounded-full text-xs border inline-flex items-center gap-1'
                            const cls = e.status === 'valid'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : e.status === 'invalid'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : e.status === 'missing'
                                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                            return (
                                <span key={i} className={`${base} ${cls}`} title={`#${e.step}`}>
                                    <span className="font-mono">#{e.step}</span>
                                    {e.name ? <span className="font-semibold">{e.name}</span> : <span>no fire</span>}
                                </span>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ExperimentalVisualization
