import { PetriNet, Place, Transition } from '@/types'
import { computeLayout, getTokenPositions, LayoutLink, LayoutNode } from '@/utils/layoutUtils'
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import React, { useCallback, useMemo } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'

interface PetriNetVisualizationProps {
    mode: 'simulator' | 'conformance',
    petriNet: PetriNet | null,
    onFireTransition?: (transitionId: string) => void,
    onSelectElement?: (sel: { type: 'place' | 'transition'; id: string }) => void,
    highlightedTransitionId?: string,
    // New: allow parent to reset marking
    onResetMarking?: () => void,
    // New: conformance replay highlights
    highlightValidIds?: string[]
    highlightInvalidIds?: string[]
    ghostTransitions?: Array<{ name: string; count: number }>
    // New: ordered sequence for the narrative chips
    replaySequence?: Array<{ step: number; status: 'valid' | 'invalid' | 'missing' | 'noop'; name?: string; transitionId?: string }>
}

const PetriNetVisualization: React.FC<PetriNetVisualizationProps> = ({ mode, petriNet, onFireTransition, onSelectElement, highlightedTransitionId, onResetMarking, highlightValidIds = [], highlightInvalidIds = [], ghostTransitions = [], replaySequence = [] }) => {
    // Compute layout using d3-force when petriNet changes
    const layout = useMemo(() => {
        if (!petriNet) return null;
        return computeLayout(petriNet, 800, 600);
    }, [petriNet]);

    const validSet = useMemo(() => new Set(highlightValidIds), [highlightValidIds])
    const invalidSet = useMemo(() => new Set(highlightInvalidIds), [highlightInvalidIds])

    // List of enabled transitions for display below the visualization
    const enabledTransitions = useMemo(() => {
        return petriNet ? petriNet.transitions.filter(t => t.enabled) : []
    }, [petriNet])

    const handleSelect = useCallback((type: 'place' | 'transition', id: string) => {
        if (mode !== 'simulator') return
        if (!onSelectElement) return
        onSelectElement({ type, id })
    }, [mode, onSelectElement])

    const renderPlace = useCallback((node: LayoutNode) => {
        const place = node.data as Place;
        const x = node.x || 0;
        const y = node.y || 0;
        const radius = 25;
        const tokenPositions = getTokenPositions(place, radius);

        return (
            <g key={place.id} className="place-group" onClick={() => handleSelect('place', place.id)} role={mode === 'simulator' ? 'button' as any : undefined}>
                {/* Place circle */}
                <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill="#e0f2fe"
                    stroke="#0ea5e9"
                    strokeWidth="2"
                    className="hover:fill-blue-100 transition-colors cursor-pointer"
                />

                {/* Place label */}
                <text
                    x={x}
                    y={y - radius - 8}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="500"
                    fill="#1e293b"
                    className="select-none"
                >
                    {place.name}
                </text>

                {/* Tokens */}
                {place.tokens > 6 ? (
                    // Show number for many tokens
                    <text
                        x={x}
                        y={y + 4}
                        textAnchor="middle"
                        fontSize="14"
                        fontWeight="bold"
                        fill="#1e293b"
                        className="select-none"
                    >
                        {place.tokens}
                    </text>
                ) : (
                    // Show individual token circles
                    tokenPositions.map((pos, index) => (
                        <circle
                            key={`token-${place.id}-${index}`}
                            cx={x + pos.x}
                            cy={y + pos.y}
                            r="4"
                            fill="#1e293b"
                        />
                    ))
                )}

                {/* Max tokens indicator (if specified) */}
                {place.maxTokens && place.maxTokens > 0 && (
                    <text
                        x={x + radius + 8}
                        y={y + 4}
                        fontSize="10"
                        fill="#64748b"
                        className="select-none"
                    >
                        max: {place.maxTokens}
                    </text>
                )}
            </g>
        );
    }, [handleSelect, mode]);

    const renderTransition = useCallback((node: LayoutNode) => {
        const transition = node.data as Transition;
        const x = node.x || 0;
        const y = node.y || 0;
        const width = 30;
        const height = 50;
        const isPulse = highlightedTransitionId === transition.id;
        const isValid = validSet.has(transition.id)
        const isInvalid = invalidSet.has(transition.id)

        const fill = isValid ? '#ecfdf5' : isInvalid ? '#fef2f2' : (transition.enabled ? '#f1f5f9' : '#f8fafc')
        const stroke = isValid ? '#10b981' : isInvalid ? '#ef4444' : (transition.enabled ? '#64748b' : '#cbd5e1')
        const strokeWidth = isValid || isInvalid || isPulse ? 3 : 2

        return (
            <g key={transition.id} className="transition-group" onClick={() => handleSelect('transition', transition.id)} role={mode === 'simulator' ? 'button' as any : undefined}>
                {/* Transition rectangle */}
                <rect
                    x={x - width / 2}
                    y={y - height / 2}
                    width={width}
                    height={height}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    className={`hover:fill-gray-100 transition-colors cursor-pointer ${isPulse ? 'animate-pulse' : ''}`}
                    rx={3}
                    ry={3}
                />

                {/* Transition label */}
                <text
                    x={x}
                    y={y - height / 2 - 8}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="500"
                    fill="#1e293b"
                    className="select-none"
                >
                    {transition.name}
                </text>

                {/* Enabled indicator */}
                {transition.enabled && !isInvalid && (
                    <circle
                        cx={x + width / 2 + 8}
                        cy={y - height / 2 + 8}
                        r="3"
                        fill="#10b981"
                    />
                )}
            </g>
        );
    }, [handleSelect, mode, highlightedTransitionId, validSet, invalidSet]);

    const renderArc = useCallback((link: LayoutLink, sourceNode: LayoutNode, targetNode: LayoutNode) => {
        const sourceX = sourceNode.x || 0;
        const sourceY = sourceNode.y || 0;
        const targetX = targetNode.x || 0;
        const targetY = targetNode.y || 0;

        // Calculate connection points on the edge of shapes
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return null;

        const unitX = dx / distance;
        const unitY = dy / distance;

        // Offset for place radius or transition rectangle
        const sourceRadius = sourceNode.type === 'place' ? 25 : 25; // Approximate radius for transition
        const targetRadius = targetNode.type === 'place' ? 25 : 25;

        const startX = sourceX + unitX * sourceRadius;
        const startY = sourceY + unitY * sourceRadius;
        const endX = targetX - unitX * targetRadius;
        const endY = targetY - unitY * targetRadius;

        return (
            <g key={link.id} className="arc-group">
                {/* Arc line */}
                <path
                    d={`M ${startX} ${startY} L ${endX} ${endY}`}
                    stroke="#64748b"
                    strokeWidth="2"
                    markerEnd="url(#arrow)"
                    fill="none"
                    className="hover:stroke-slate-900 transition-colors"
                />

                {/* Weight label (if weight > 1) */}
                {link.weight > 1 && (
                    <text
                        x={(startX + endX) / 2}
                        y={(startY + endY) / 2 - 5}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#dc2626"
                        className="select-none"
                    >
                        {link.weight}
                    </text>
                )}
            </g>
        );
    }, []);

    if (!petriNet || !layout) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col flex-shrink-0">
                <h2 className="text-xl font-semibold mb-4 border-b pb-3">
                    {mode === 'simulator' ? 'Petri Net Visualization' : 'Annotated Visualization'}
                </h2>
                <div className="flex-grow bg-slate-50 rounded-lg flex items-center justify-center min-h-[400px]">
                    <div className="text-slate-500 text-center">
                        <p className="text-lg font-medium">No Petri Net loaded</p>
                        <p className="text-sm mt-2">Upload or create a Petri Net to see the visualization</p>
                    </div>
                </div>
            </div>
        );
    }

    const { nodes, links, bounds } = layout;

    // Create lookup map for nodes
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    const handleEnabledClick = useCallback((id: string) => {
        if (mode !== 'simulator') return
        if (!onFireTransition) return
        onFireTransition(id)
    }, [mode, onFireTransition])

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col flex-shrink-0">
            <h2 className="text-xl font-semibold mb-4 border-b pb-3">
                {mode === 'simulator' ? 'Petri Net Visualization' : 'Annotated Visualization'}
            </h2>

            <div className="flex-grow bg-slate-50 rounded-lg relative min-h-[400px]">
                <TransformWrapper
                    initialScale={0.8}
                    minScale={0.2}
                    maxScale={3}
                    centerOnInit={true}
                    wheel={{ step: 0.1 }}
                    pinch={{ step: 5 }}
                >
                    {({ zoomIn, zoomOut, resetTransform }) => (
                        <>
                            {/* Zoom controls */}
                            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                                <button
                                    onClick={() => zoomIn()}
                                    className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                                    title="Zoom In"
                                >
                                    <ZoomIn size={18} />
                                </button>
                                <button
                                    onClick={() => zoomOut()}
                                    className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                                    title="Zoom Out"
                                >
                                    <ZoomOut size={18} />
                                </button>
                                <button
                                    onClick={() => resetTransform()}
                                    className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                                    title="Reset View"
                                >
                                    <RotateCcw size={18} />
                                </button>
                                {/* New: Reset marking */}
                                {onResetMarking && (
                                    <button
                                        onClick={() => onResetMarking()}
                                        className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                                        title="Reset Marking to Initial"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                )}
                            </div>

                            <TransformComponent
                                wrapperClass="w-full h-full"
                                contentClass="w-full h-full flex items-center justify-center"
                            >
                                <svg
                                    width={Math.max(bounds.width + (ghostTransitions.length > 0 ? 200 : 0), 400)}
                                    height={Math.max(bounds.height, 300)}
                                    viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width + (ghostTransitions.length > 0 ? 200 : 0)} ${bounds.height}`}
                                    className="max-w-none"
                                >
                                    <defs>
                                        <marker
                                            id="arrow"
                                            viewBox="0 0 10 10"
                                            refX="8"
                                            refY="3"
                                            markerWidth="6"
                                            markerHeight="6"
                                            orient="auto-start-reverse"
                                        >
                                            <path d="M 0 0 L 10 3 L 0 6 z" fill="#64748b" />
                                        </marker>
                                    </defs>

                                    {/* Render arcs first (behind nodes) */}
                                    <g className="arcs">
                                        {links.map(link => {
                                            const sourceId = typeof link.source === 'string' ? link.source : (link.source as LayoutNode).id;
                                            const targetId = typeof link.target === 'string' ? link.target : (link.target as LayoutNode).id;
                                            const sourceNode = nodeMap.get(sourceId);
                                            const targetNode = nodeMap.get(targetId);

                                            if (!sourceNode || !targetNode) return null;

                                            return renderArc(link, sourceNode, targetNode);
                                        })}
                                    </g>

                                    {/* Render nodes */}
                                    <g className="nodes">
                                        {nodes.map(node =>
                                            node.type === 'place'
                                                ? renderPlace(node)
                                                : renderTransition(node)
                                        )}
                                    </g>

                                    {/* Ghost transitions (missing events) */}
                                    {ghostTransitions.length > 0 && (
                                        <g className="ghost-transitions">
                                            {ghostTransitions.map((g, idx) => {
                                                const x = bounds.maxX + 80
                                                const y = bounds.minY + 60 + idx * 80
                                                const width = 30
                                                const height = 50
                                                return (
                                                    <g key={`${g.name}-${idx}`}>
                                                        <rect
                                                            x={x - width / 2}
                                                            y={y - height / 2}
                                                            width={width}
                                                            height={height}
                                                            fill="#fef2f2"
                                                            stroke="#ef4444"
                                                            strokeWidth={3}
                                                            rx={3}
                                                            ry={3}
                                                        />
                                                        <text
                                                            x={x}
                                                            y={y - height / 2 - 8}
                                                            textAnchor="middle"
                                                            fontSize="12"
                                                            fontWeight="600"
                                                            fill="#ef4444"
                                                        >
                                                            {g.name}
                                                        </text>
                                                        {/* count badge */}
                                                        <g>
                                                            <rect x={x + width / 2 + 6} y={y - height / 2 - 14} width={18} height={14} rx={7} ry={7} fill="#fee2e2" stroke="#ef4444" />
                                                            <text x={x + width / 2 + 15} y={y - height / 2 - 3} textAnchor="middle" fontSize="10" fontWeight="700" fill="#ef4444">{g.count}</text>
                                                        </g>
                                                    </g>
                                                )
                                            })}
                                        </g>
                                    )}
                                </svg>
                            </TransformComponent>
                        </>
                    )}
                </TransformWrapper>
            </div>

            {/* Legend */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Legend</h3>
                <div className="flex flex-wrap gap-6 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500"></div>
                        <span>Places</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-6 bg-gray-100 border-2 border-gray-600"></div>
                        <span>Transitions</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-800"></div>
                        <span>Tokens</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Enabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-6 bg-emerald-50 border-2 border-emerald-500"></div>
                        <span>Valid (replayed)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-6 bg-rose-50 border-2 border-rose-500"></div>
                        <span>Invalid/Missing</span>
                    </div>
                </div>
            </div>

            {/* Enabled Transitions */}
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Enabled Transitions</h3>
                {enabledTransitions.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                        {enabledTransitions.map(t => (
                            <li
                                key={t.id}
                                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs border ${mode === 'simulator' && onFireTransition ? 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-pointer hover:ring-2 hover:ring-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                                title={t.id}
                                onClick={() => handleEnabledClick(t.id)}
                                role={mode === 'simulator' && onFireTransition ? 'button' : undefined}
                                aria-disabled={mode !== 'simulator' || !onFireTransition}
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="font-medium">{t.name}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-gray-500">None</p>
                )}
            </div>

            {/* Execution narrative */}
            {replaySequence.length > 0 && (
                <div className="mt-3 p-3 bg-white rounded-lg border">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Executed path up to selected step</h3>
                    <div className="flex flex-wrap gap-2">
                        {replaySequence.map((e, i) => {
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

export default PetriNetVisualization
