import { PetriNet } from '@/types';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
    Background,
    Connection,
    Controls,
    Edge,
    MarkerType,
    MiniMap,
    Node,
    ReactFlowInstance,
    useEdgesState,
    useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Types for node data
interface PlaceNodeData { label: string; tokens: number }
interface TransitionNodeData { label: string }
interface ArcData { weight: number }

type Tool = 'save' | 'place' | 'transition' | 'pointer' | 'arc' | 'delete'

type SelectedEl =
    | { type: 'place'; id: string }
    | { type: 'transition'; id: string }
    | { type: 'arc'; id: string }
    | null

// Custom node components
import { Handle, Position } from 'reactflow';

const PlaceNode: React.FC<{ data: PlaceNodeData }> = ({ data }) => {
    const { label, tokens } = data
    const base = import.meta.env.BASE_URL || '/'
    const tokenSrc = `${base}images/tokens/${tokens}.svg`
    return (
        <div className="relative flex items-center justify-center rounded-full border-2 border-blue-700 bg-white w-[60px] h-[60px] shadow-sm text-center select-none">
            <Handle type="source" position={Position.Right} className="!w-3 !h-3 bg-blue-700" />
            {tokens > 0 && tokens < 11 ? (
                <div className='absolute inset-0 flex items-center justify-center'>
                    <img alt='tokens' src={tokenSrc} className='w-[60px] h-[60px]' />
                </div>
            ) : tokens >= 11 ? (
                <div className='text-sm font-semibold'>{tokens}</div>
            ) : null}
            <label className="absolute -bottom-6 font-medium text-sm max-w-[200px] whitespace-nowrap overflow-hidden">{label}</label>
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-white border-2 border-blue-700" />
        </div>
    )
}

const TransitionNode: React.FC<{ data: TransitionNodeData }> = ({ data }) => {
    const { label } = data
    return (
        <div className="relative flex items-center justify-center rounded-md border-2 border-teal-600 bg-white w-[25px] h-[60px] shadow-sm text-center select-none">
            <Handle type="source" position={Position.Right} className="!w-3 !h-3 bg-teal-600" />
            <label className="absolute -bottom-6 font-medium text-sm max-w-[140px] whitespace-nowrap overflow-hidden">{label}</label>
            <Handle type="target" position={Position.Left} className="!w-3 !h-3 bg-white border-2 border-teal-600" />
        </div>
    )
}

const nodeTypes = { place: PlaceNode, transition: TransitionNode }

// Toast component
const Toast: React.FC<{ message: string; context: 'success' | 'danger' | ''; onClose: () => void }> = ({ message, context, onClose }) => {
    if (!message) return null
    const base = 'fixed bottom-4 right-4 px-4 py-3 rounded shadow text-sm font-medium flex items-center gap-2'
    const cls = context === 'success'
        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
        : context === 'danger'
            ? 'bg-rose-50 text-rose-700 border border-rose-300'
            : 'bg-slate-100 text-slate-700 border border-slate-300'
    return (
        <div className={`${base} ${cls}`} role="alert">
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 text-xs underline">Close</button>
        </div>
    )
}

// Modal component
interface ModalState {
    isVisible: boolean
    type: 'delete' | 'arc' | null
}

const Modal: React.FC<{ modal: ModalState; onConfirm: () => void; onCancel: () => void }> = ({ modal, onConfirm, onCancel }) => {
    if (!modal.isVisible || !modal.type) return null
    const isDelete = modal.type === 'delete'
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-lg font-semibold mb-2">{isDelete ? 'Delete Canvas' : 'Select Arc Style'}</h2>
                <p className="text-sm text-slate-600 mb-4">
                    {isDelete ? 'Do you really want to delete the canvas? This process cannot be undone.' : 'Only solid style available currently.'}
                </p>
                {modal.type === 'arc' && (
                    <div className='mb-4'>
                        <div className='flex gap-4'>
                            <div className='flex items-center gap-2'>
                                <input type='radio' id='arc-solid' checked readOnly />
                                <label htmlFor='arc-solid' className='text-sm'>Solid</label>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded border text-sm">Cancel</button>
                    <button onClick={onConfirm} className={`px-4 py-2 rounded text-sm text-white ${isDelete ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{isDelete ? 'Delete' : 'Confirm'}</button>
                </div>
            </div>
        </div>
    )
}

// Sidebar component
const Sidebar: React.FC<{
    selected: SelectedEl
    nodes: Node[]
    edges: Edge[]
    onUpdateNode: (id: string, data: Partial<PlaceNodeData & TransitionNodeData>) => void
    onUpdateEdge: (id: string, data: Partial<ArcData>) => void
    onDelete: (sel: SelectedEl) => void
    onClose: () => void
}> = ({ selected, nodes, edges, onUpdateNode, onUpdateEdge, onDelete, onClose }) => {
    if (!selected) return null
    const isNode = selected.type === 'place' || selected.type === 'transition'
    const node = isNode ? nodes.find(n => n.id === selected.id) : null
    const edge = selected.type === 'arc' ? edges.find(e => e.id === selected.id) : null
    const weight = edge?.data && (edge.data as ArcData).weight
    const tokens = node?.type === 'place' ? (node.data as PlaceNodeData).tokens : undefined
    const label = node && (node.data as any).label
    return (
        <div className="fixed top-0 right-0 h-full w-72 bg-white border-l shadow-lg z-40 flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">{isNode ? (selected.type === 'place' ? 'Place' : 'Transition') : 'Arc'} Properties</h3>
                <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-700">Close</button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 text-sm">
                {isNode && node && (
                    <>
                        <div>
                            <label className="block text-xs font-medium mb-1">Label</label>
                            <input
                                className="w-full border rounded px-2 py-1 text-sm"
                                value={label}
                                onChange={e => onUpdateNode(node.id, { label: e.target.value })}
                            />
                        </div>
                        {selected.type === 'place' && (
                            <div>
                                <label className="block text-xs font-medium mb-1">Tokens</label>
                                <input
                                    type='number'
                                    className="w-full border rounded px-2 py-1 text-sm"
                                    value={tokens}
                                    onChange={e => onUpdateNode(node.id, { tokens: parseInt(e.target.value || '0', 10) })}
                                    min={0}
                                />
                            </div>
                        )}
                    </>
                )}
                {selected.type === 'arc' && edge && (
                    <div>
                        <label className="block text-xs font-medium mb-1">Weight</label>
                        <input
                            type='number'
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={weight}
                            onChange={e => onUpdateEdge(edge.id, { weight: Math.max(1, parseInt(e.target.value || '1', 10)) })}
                            min={1}
                        />
                    </div>
                )}
            </div>
            <div className="p-4 border-t flex justify-between">
                <button onClick={() => { if (selected) onDelete(selected) }} className="px-3 py-1.5 rounded bg-rose-600 text-white text-xs font-medium hover:bg-rose-700">Delete</button>
            </div>
        </div>
    )
}

// Toolbar component
const Toolbar: React.FC<{
    active: Tool
    onSelect: (t: Tool) => void
    onSave: () => void
}> = ({ active, onSelect, onSave }) => {
    const buttonCls = (tool: Tool) => `px-3 py-2 rounded-md border text-xs font-medium flex items-center gap-1 ${active === tool ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`
    return (
        <div className="flex flex-wrap gap-2">
            <button className={buttonCls('save')} onClick={onSave} title='Save'><span>Save</span></button>
            <button className={buttonCls('pointer')} onClick={() => onSelect('pointer')} title='Pointer'><span>Pointer</span></button>
            <button className={buttonCls('place')} onClick={() => onSelect('place')} title='Add Place'><span>Place</span></button>
            <button className={buttonCls('transition')} onClick={() => onSelect('transition')} title='Add Transition'><span>Transition</span></button>
            <button className={buttonCls('arc')} onClick={() => onSelect('arc')} title='Arc Style'><span>Arc</span></button>
            <button className={buttonCls('delete')} onClick={() => onSelect('delete')} title='Reset Canvas'><span>Delete</span></button>
        </div>
    )
}

// Main ExperimentalVisualization component
interface ExperimentalVisualizationProps {
    petriNet?: PetriNet | null
    readOnly?: boolean
}

const ExperimentalVisualization: React.FC<ExperimentalVisualizationProps> = ({ petriNet = null }) => {
    const reactFlowWrapper = useRef<HTMLDivElement | null>(null)
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)

    // Load initial nodes / edges from localStorage only if no external net
    const storedPlaces = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('places') || '[]') } catch { return [] }
    }, [])
    const storedTransitions = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('transitions') || '[]') } catch { return [] }
    }, [])
    const storedArcs = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('arcs') || '[]') } catch { return [] }
    }, [])

    const initialNodes: Node[] = useMemo(() => {
        if (petriNet) {
            const placeNodes: Node<PlaceNodeData>[] = petriNet.places.map(p => ({
                id: p.id,
                type: 'place',
                position: { x: p.x, y: p.y },
                data: { label: p.name, tokens: p.tokens },
            }))
            const transitionNodes: Node<TransitionNodeData>[] = petriNet.transitions.map(t => ({
                id: t.id,
                type: 'transition',
                position: { x: t.x, y: t.y },
                data: { label: t.name },
            }))
            return ([] as Node[]).concat(placeNodes).concat(transitionNodes)
        }
        return ([] as Node[]).concat(storedPlaces).concat(storedTransitions)
    }, [petriNet, storedPlaces, storedTransitions])

    const initialEdges: Edge[] = useMemo(() => {
        if (petriNet) {
            return petriNet.arcs.map(a => ({
                id: a.id,
                source: a.source,
                target: a.target,
                data: { weight: a.weight },
                type: 'default',
                markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
                label: a.weight > 1 ? String(a.weight) : undefined,
                style: { strokeWidth: 2 },
            }))
        }
        return storedArcs
    }, [petriNet, storedArcs])

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

    const [activeTool, setActiveTool] = useState<Tool>('pointer')
    const [selected, setSelected] = useState<SelectedEl>(null)
    const [toastMsg, setToastMsg] = useState('')
    const [toastContext, setToastContext] = useState<'success' | 'danger' | ''>('')
    const [modal, setModal] = useState<ModalState>({ isVisible: false, type: null })

    // If petriNet prop changes (external), sync nodes/edges
    useEffect(() => {
        if (petriNet) {
            setNodes(initialNodes)
            setEdges(initialEdges)
            setSelected(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [petriNet])

    // Persist only if editable
    useEffect(() => {
        localStorage.setItem('places', JSON.stringify(nodes.filter(n => n.type === 'place')))
        localStorage.setItem('transitions', JSON.stringify(nodes.filter(n => n.type === 'transition')))
        localStorage.setItem('arcs', JSON.stringify(edges))
    }, [nodes, edges])

    const showToast = useCallback((msg: string, context: 'success' | 'danger' | '' = '') => {
        setToastMsg(msg)
        setToastContext(context)
        if (msg) {
            setTimeout(() => setToastMsg(''), 4000)
        }
    }, [])

    const generateNextNodeId = useCallback(() => {
        if (!nodes.length) return '1'
        const maxId = Math.max(...nodes.map(n => parseInt(n.id, 10) || 0))
        return String(maxId + 1)
    }, [nodes])

    const generatePlaceLabel = useCallback(() => {
        const places = nodes.filter(n => n.type === 'place')
        return `p${places.length + 1}`
    }, [nodes])

    const generateTransitionLabel = useCallback(() => {
        const transitions = nodes.filter(n => n.type === 'transition')
        return `t${transitions.length + 1}`
    }, [nodes])

    const onPaneClick = useCallback((e: React.MouseEvent) => {
        if (!reactFlowWrapper.current || !reactFlowInstance) return
        if (activeTool !== 'place' && activeTool !== 'transition') return
        const bounds = reactFlowWrapper.current.getBoundingClientRect()
        const position = reactFlowInstance.project({ x: e.clientX - bounds.left - 50, y: e.clientY - bounds.top - 50 })
        const id = generateNextNodeId()
        if (activeTool === 'place') {
            const node: Node<PlaceNodeData> = { id, type: 'place', position, data: { label: generatePlaceLabel(), tokens: 0 } }
            setNodes(nds => nds.concat(node))
        } else if (activeTool === 'transition') {
            const node: Node<TransitionNodeData> = { id, type: 'transition', position, data: { label: generateTransitionLabel() } }
            setNodes(nds => nds.concat(node))
        }
    }, [activeTool, reactFlowInstance, generateNextNodeId, generatePlaceLabel, generateTransitionLabel, setNodes])

    const onConnect = useCallback((connection: Connection) => {
        if (!reactFlowInstance || !connection.source || !connection.target) return
        const sourceNode = reactFlowInstance.getNode(connection.source)
        const targetNode = reactFlowInstance.getNode(connection.target)
        if (!sourceNode || !targetNode) return
        if (sourceNode.type === targetNode.type) return
        const exists = edges.some(e => e.source === connection.source && e.target === connection.target)
        if (exists) return
        const id = `e-${connection.source}-${connection.target}`
        const edge: Edge<ArcData> = { id, source: connection.source, target: connection.target, data: { weight: 1 }, type: 'default', markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 }, label: undefined, style: { strokeWidth: 2 } }
        setEdges(eds => eds.concat(edge))
    }, [edges, reactFlowInstance, setEdges])

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        if (activeTool === 'pointer') {
            setSelected({ type: node.type as 'place' | 'transition', id: node.id })
        }
    }, [activeTool])

    const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        if (activeTool === 'pointer') {
            setSelected({ type: 'arc', id: edge.id })
        }
    }, [activeTool])

    const onUpdateNode = useCallback((id: string, data: Partial<PlaceNodeData & TransitionNodeData>) => {
        setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
    }, [setNodes])

    const onUpdateEdge = useCallback((id: string, data: Partial<ArcData>) => {
        setEdges(eds => eds.map(e => e.id === id ? { ...e, data: { ...e.data, ...data }, label: (data.weight && data.weight > 1) ? String(data.weight) : undefined } : e))
    }, [setEdges])

    const onDelete = useCallback((el: SelectedEl) => {
        if (!el) return
        if (el.type === 'place' || el.type === 'transition') {
            setNodes(nds => nds.filter(n => n.id !== el.id))
            setEdges(eds => eds.filter(e => e.source !== el.id && e.target !== el.id))
        } else if (el.type === 'arc') {
            setEdges(eds => eds.filter(e => e.id !== el.id))
        }
        setSelected(null)
    }, [setNodes, setEdges])

    const resetCanvas = useCallback(() => {
        setNodes([])
        setEdges([])
        setSelected(null)
        localStorage.removeItem('places')
        localStorage.removeItem('transitions')
        localStorage.removeItem('arcs')
        showToast('Canvas cleared', 'success')
    }, [showToast])

    const onSave = useCallback(() => {
        const labels = nodes.map(n => (n.data as any).label)
        const duplicates = labels.filter((l, i) => labels.indexOf(l) !== i)
        if (duplicates.length) {
            showToast('Duplicated labels found', 'danger')
        } else {
            showToast('Canvas saved', 'success')
            setActiveTool('save')
            setTimeout(() => setActiveTool('place'), 800)
        }
    }, [nodes, showToast])

    const handleSelectTool = useCallback((t: Tool) => {
        if (t === 'delete') { setModal({ isVisible: true, type: 'delete' }) }
        else if (t === 'arc') { setModal({ isVisible: true, type: 'arc' }) }
        else { setActiveTool(t); if (t !== 'pointer') setSelected(null) }
    }, [setActiveTool, setSelected])

    const handleModalConfirm = useCallback(() => {
        if (modal.type === 'delete') resetCanvas()
        setModal({ isVisible: false, type: null })
    }, [modal, resetCanvas])

    const handleModalCancel = useCallback(() => setModal({ isVisible: false, type: null }), [])

    const elementsSelectable = activeTool === 'pointer'

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow flex flex-col gap-4">
                <Toolbar active={activeTool} onSelect={handleSelectTool} onSave={onSave} />
                <div className='text-xs text-slate-500'>Read only view (provided Petri Net)</div>
                <div className="relative" ref={reactFlowWrapper} style={{ height: '70vh', minHeight: 500 }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        nodeTypes={nodeTypes as any}
                        elementsSelectable={elementsSelectable}
                        onPaneClick={onPaneClick}
                        onNodeClick={onNodeClick}
                        onEdgeClick={onEdgeClick}
                        fitView={false}
                        minZoom={0.2}
                        maxZoom={4}
                        zoomOnScroll={false}
                    >
                        <MiniMap className='hidden md:block' />
                        <Controls />
                        <Background />
                    </ReactFlow>
                </div>
            </div>
            <Sidebar
                selected={selected}
                nodes={nodes}
                edges={edges}
                onUpdateNode={onUpdateNode}
                onUpdateEdge={onUpdateEdge}
                onDelete={onDelete}
                onClose={() => setSelected(null)}
            />
            <Toast message={toastMsg} context={toastContext} onClose={() => setToastMsg('')} />
            <Modal modal={modal} onConfirm={handleModalConfirm} onCancel={handleModalCancel} />
        </div>
    )
}

export default ExperimentalVisualization
