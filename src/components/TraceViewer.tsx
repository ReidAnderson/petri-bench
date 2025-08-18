import { ExecutionTrace, PetriNet, SimulationStep, ReplayHighlights, ReplayStepEntry } from '@/types'
import { fireTransition, updateTransitionStates } from '@/utils/petriNetUtils'
import React, { useCallback, useMemo, useState } from 'react'

interface TraceViewerProps {
    petriNet: PetriNet
    traces: ExecutionTrace[]
    onApplyStep?: (updatedNet: PetriNet, step: SimulationStep, index: number, highlights: ReplayHighlights) => void
    onWarn?: (message: string) => void
    title?: string
    onExportXES?: (trace: ExecutionTrace) => void
    onExportCSV?: (trace: ExecutionTrace) => void
    // New: notify parent when a trace is selected
    onSelectTrace?: (trace: ExecutionTrace) => void
    // New: per-trace deviation counts (trace.id => count)
    deviationsByTrace?: Record<string, number>
    // Optional: allow parent to reset markings
    onResetMarking?: () => void
}

const cloneNet = (net: PetriNet): PetriNet => ({
    places: net.places.map(p => ({ ...p })),
    transitions: net.transitions.map(t => ({ ...t })),
    arcs: net.arcs.map(a => ({ ...a })),
})

const applyStartMarkings = (net: PetriNet, marks?: Record<string, number>): PetriNet => {
    if (!marks) return updateTransitionStates(net)
    const next = cloneNet(net)
    next.places = next.places.map(p => ({ ...p, tokens: Math.max(0, marks[p.id] ?? p.tokens) }))
    return updateTransitionStates(next)
}

const TraceViewer: React.FC<TraceViewerProps> = ({ petriNet, traces, onApplyStep, onWarn, title = 'Traces', onExportXES, onExportCSV, onSelectTrace, deviationsByTrace }) => {
    const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
    const [cursor, setCursor] = useState<number>(0)

    const selectedTrace = useMemo(() => traces.find(t => t.id === selectedTraceId) || null, [traces, selectedTraceId])

    const steps = selectedTrace?.steps ?? []

    const canPrev = cursor > 0
    const canNext = cursor < Math.max(steps.length - 1, 0)

    const buildUpToWithHighlights = useCallback((targetIdx: number): { net: PetriNet; highlights: ReplayHighlights } => {
        const trace = selectedTrace
        if (!trace) return { net: petriNet, highlights: { valid: [], invalidNotEnabled: [], missingEvents: [], sequence: [] } }
        let net = applyStartMarkings(cloneNet(petriNet), trace.startMarkings)
        const valid: string[] = []
        const invalidNotEnabled: string[] = []
        const missingMap = new Map<string, number>()
        const sequence: ReplayStepEntry[] = []

        for (let i = 0; i <= targetIdx && i < trace.steps.length; i++) {
            const s = trace.steps[i]
            if (!s.firedTransition) {
                net = updateTransitionStates(net)
                sequence.push({ step: s.step, status: 'noop' })
                continue
            }
            const trans = net.transitions.find(t => t.id === s.firedTransition || t.name === s.firedTransition)
            if (!trans) {
                missingMap.set(s.firedTransition, (missingMap.get(s.firedTransition) ?? 0) + 1)
                net = updateTransitionStates(net)
                sequence.push({ step: s.step, status: 'missing', name: s.firedTransition })
            } else if (trans.enabled) {
                const res = fireTransition(net, trans.id)
                net = res.petriNet
                valid.push(trans.id)
                sequence.push({ step: s.step, status: 'valid', transitionId: trans.id, name: trans.name })
            } else {
                invalidNotEnabled.push(trans.id)
                net = updateTransitionStates(net)
                sequence.push({ step: s.step, status: 'invalid', transitionId: trans.id, name: trans.name })
            }
        }

        const highlights: ReplayHighlights = {
            valid,
            invalidNotEnabled,
            missingEvents: Array.from(missingMap.entries()).map(([name, count]) => ({ name, count })),
            sequence,
        }
        return { net, highlights }
    }, [petriNet, selectedTrace])

    const applyCursor = useCallback((idx: number) => {
        const nextIdx = Math.max(0, Math.min(idx, Math.max(steps.length - 1, 0)))
        setCursor(nextIdx)
        const step = steps[nextIdx]
        if (step) {
            const { net, highlights } = buildUpToWithHighlights(nextIdx)
            onApplyStep?.(net, step, nextIdx, highlights)
            if ((highlights.invalidNotEnabled.length + highlights.missingEvents.length) > 0) {
                onWarn?.(`Up to step #${step.step}: ${highlights.valid.length} valid, ${highlights.invalidNotEnabled.length} invalid, ${highlights.missingEvents.reduce((a, b) => a + b.count, 0)} missing`)
            } else {
                onWarn?.(`Up to step #${step.step}: ${highlights.valid.length} valid, no deviations`)
            }
        }
    }, [steps, buildUpToWithHighlights, onApplyStep, onWarn])

    const handleSelectTrace = useCallback((id: string) => {
        setSelectedTraceId(id)
        setCursor(0)
        const trace = traces.find(t => t.id === id)
        if (trace && trace.steps.length > 0) {
            const { net, highlights } = buildUpToWithHighlights(0)
            onApplyStep?.(net, trace.steps[0], 0, highlights)
            onSelectTrace?.(trace)
        } else if (trace) {
            onSelectTrace?.(trace)
        }
    }, [traces, buildUpToWithHighlights, onApplyStep, onSelectTrace])

    const handlePrev = useCallback(() => applyCursor(cursor - 1), [applyCursor, cursor])
    const handleNext = useCallback(() => applyCursor(cursor + 1), [applyCursor, cursor])

    return (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-lg">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                <div className="flex items-center gap-2">
                    {selectedTrace && (
                        <>
                            {onExportCSV && (
                                <button
                                    className="px-2 py-1 text-xs border rounded hover:bg-slate-50"
                                    onClick={() => onExportCSV(selectedTrace)}
                                    title="Export CSV"
                                >CSV</button>
                            )}
                            {onExportXES && (
                                <button
                                    className="px-2 py-1 text-xs border rounded hover:bg-slate-50"
                                    onClick={() => onExportXES(selectedTrace)}
                                    title="Export XES"
                                >XES</button>
                            )}
                            <span className="text-xs text-slate-500">
                                Steps: {steps.length}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Trace list */}
            <div className="flex flex-wrap gap-2 mb-3">
                {traces.length === 0 && (
                    <span className="text-xs text-slate-400">No executions yet</span>
                )}
                {traces.map(t => {
                    const selected = selectedTraceId === t.id
                    const count = deviationsByTrace?.[t.id] ?? 0
                    return (
                        <button
                            key={t.id}
                            onClick={() => handleSelectTrace(t.id)}
                            className={`px-2.5 py-1 rounded-full text-xs border inline-flex items-center gap-1.5 ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}`}
                            title={`${t.label} (${t.steps.length} steps)`}
                        >
                            <span>{t.label}</span>
                            {count > 0 && (
                                <span
                                    className={`ml-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${selected ? 'bg-white/15 text-white border-white/30' : 'bg-red-50 text-red-700 border-red-200'}`}
                                    title={`${count} deviations`}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Stepper */}
            {selectedTrace && (
                <div className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-slate-700">
                            {selectedTrace.label}
                            <span className="ml-2 text-xs text-slate-500">{cursor + 1} / {steps.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrev}
                                disabled={!canPrev}
                                className={`px-2 py-1 rounded border text-xs ${canPrev ? 'bg-white hover:bg-slate-50 border-slate-300' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'}`}
                            >
                                Prev
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={!canNext}
                                className={`px-2 py-1 rounded border text-xs ${canNext ? 'bg-white hover:bg-slate-50 border-slate-300' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    {/* Steps list */}
                    <ol className="text-xs max-h-48 overflow-auto space-y-1">
                        {steps.map((s, idx) => (
                            <li key={idx}>
                                <button
                                    onClick={() => { applyCursor(idx); }}
                                    className={`w-full text-left px-2 py-1 rounded ${idx === cursor ? 'bg-blue-50 text-blue-800' : 'hover:bg-slate-50'}`}
                                >
                                    <span className="font-mono">#{s.step}</span>
                                    {s.firedTransition ? (
                                        <span className="ml-2">fired <span className="font-semibold">{s.firedTransition}</span></span>
                                    ) : (
                                        <span className="ml-2 text-slate-500">no fire</span>
                                    )}
                                    <span className="ml-2 text-slate-400">{new Date(s.timestamp).toLocaleTimeString()}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    )
}

export default TraceViewer
