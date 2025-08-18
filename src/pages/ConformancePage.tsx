import ConformanceControls from '@/components/ConformanceControls'
import ConformanceResults from '@/components/ConformanceResults'
import PetriNetVisualization from '@/components/PetriNetVisualization'
import TraceViewer from '@/components/TraceViewer'
import { ConformanceResult, Deviation, EventLog, ExecutionTrace, FileUploadResult, PetriNet, SimulationStep } from '@/types'
import { createDefaultPetriNet, fireTransition, updateTransitionStates } from '@/utils/petriNetUtils'
import { useCallback, useMemo, useState } from 'react'

const ConformancePage: React.FC = () => {
    const [petriNet, setPetriNet] = useState<PetriNet>(() => updateTransitionStates(createDefaultPetriNet()))
    const [currentFileName, setCurrentFileName] = useState<string>('default_petri_net.pnml')
    const [currentXesFileName, setCurrentXesFileName] = useState<string>()
    const [eventLog, setEventLog] = useState<EventLog | null>(null)
    const [conformanceResult, setConformanceResult] = useState<ConformanceResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [highlightedTransitionId, setHighlightedTransitionId] = useState<string | undefined>(undefined)
    // New: per-trace deviations and current selection
    const [perTraceDeviations, setPerTraceDeviations] = useState<Record<string, Deviation[]>>({})
    const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
    // New: track initial markings to support resetting
    const [initialMarkings, setInitialMarkings] = useState<Record<string, number>>(() => {
        const net = updateTransitionStates(createDefaultPetriNet())
        return net.places.reduce((acc, p) => { acc[p.id] = p.tokens; return acc }, {} as Record<string, number>)
    })

    const traces: ExecutionTrace[] = useMemo(() => {
        if (!eventLog) return []
        return eventLog.traces.map((tr) => {
            const steps: SimulationStep[] = tr.events.map((ev, idx) => ({
                step: idx + 1,
                // markings are derived during replay; not needed here
                markings: {},
                firedTransition: ev.activity,
                timestamp: ev.timestamp,
            }))
            return {
                id: `case-${tr.id}`,
                label: `Case ${tr.id}`,
                steps,
                source: 'conformance',
                createdAt: new Date().toISOString(),
                // Use the captured initial markings from when the model was loaded
                startMarkings: { ...initialMarkings },
            }
        })
    }, [eventLog, initialMarkings])

    const handleFileUpload = useCallback((result: FileUploadResult) => {
        if (result.success && result.data) {
            const updated = updateTransitionStates(result.data)
            setPetriNet(updated)
            setInitialMarkings(updated.places.reduce((acc, p) => { acc[p.id] = p.tokens; return acc }, {} as Record<string, number>))
            setCurrentFileName(result.filename)
            setUploadError(null)
            setConformanceResult(null)
            setMessage(null)
            setHighlightedTransitionId(undefined)
            setPerTraceDeviations({})
            setSelectedTraceId(null)
        } else {
            setUploadError(result.error || 'Unknown error occurred')
            console.error('File upload failed:', result.error)
        }
    }, [])

    const handleXesFileUpload = useCallback((result: FileUploadResult) => {
        if (result.success) {
            setCurrentXesFileName(result.filename)
            setEventLog((result as any).data ?? null)
            setUploadError(null)
            setConformanceResult(null)
            setMessage(null)
            setHighlightedTransitionId(undefined)
            setPerTraceDeviations({})
            setSelectedTraceId(null)
        } else {
            setUploadError(result.error || 'Unknown event log file error occurred')
            console.error('Event log file upload failed:', result.error)
        }
    }, [])

    // Helper: build a net from start markings
    const applyStartMarkings = useCallback((net: PetriNet, marks?: Record<string, number>): PetriNet => {
        if (!marks) return updateTransitionStates(net)
        const next: PetriNet = {
            places: net.places.map(p => ({ ...p, tokens: Math.max(0, marks[p.id] ?? p.tokens) })),
            transitions: net.transitions.map(t => ({ ...t })),
            arcs: net.arcs.map(a => ({ ...a })),
        }
        return updateTransitionStates(next)
    }, [])

    const handleRunAnalysis = async () => {
        setIsLoading(true)
        await new Promise(resolve => setTimeout(resolve, 300))

        // Compute per-trace deviations by replaying events on the model
        const deviationsMap: Record<string, Deviation[]> = {}
        let totalEventSteps = 0
        let enabledMatches = 0

        for (const trace of traces) {
            let net: PetriNet = applyStartMarkings({
                places: petriNet.places.map(p => ({ ...p })),
                transitions: petriNet.transitions.map(t => ({ ...t })),
                arcs: petriNet.arcs.map(a => ({ ...a })),
            }, trace.startMarkings)

            const devs: Deviation[] = []
            for (let i = 0; i < trace.steps.length; i++) {
                const s = trace.steps[i]
                if (!s.firedTransition) {
                    // No-op step
                    net = updateTransitionStates(net)
                    continue
                }
                totalEventSteps++
                // Find by id or name
                const trans = net.transitions.find(t => t.id === s.firedTransition || t.name === s.firedTransition)
                if (!trans) {
                    // Extra behavior: event not found in model
                    devs.push({
                        type: 'extra',
                        description: `Step #${s.step}: Event '${s.firedTransition}' not found in model`,
                        severity: 'low',
                    })
                    net = updateTransitionStates(net)
                } else if (trans.enabled) {
                    const res = fireTransition(net, trans.id)
                    net = res.petriNet
                    enabledMatches++
                } else {
                    // Record deviation when event exists but is not enabled
                    devs.push({
                        type: 'deviation',
                        description: `Step #${s.step}: Transition '${s.firedTransition}' was executed when not enabled`,
                        transitionId: trans.id,
                        severity: 'high',
                    })
                    // keep net state but update enabled flags
                    net = updateTransitionStates(net)
                }
            }
            deviationsMap[trace.id] = devs
        }

        setPerTraceDeviations(deviationsMap)

        const stats = (() => {
            if (eventLog) {
                return {
                    traces: eventLog.traces.length,
                    totalEvents: eventLog.totalEvents,
                    avgDuration: '-',
                }
            }
            return { traces: 0, totalEvents: 0, avgDuration: '-' }
        })()

        // Aggregate deviations for summary view
        const aggregated: Deviation[] = Object.entries(deviationsMap).flatMap(([traceId, devs]) => {
            const label = traces.find(t => t.id === traceId)?.label || traceId
            return devs.map(d => ({ ...d, description: `${label}: ${d.description}` }))
        })

        const fitnessScore = totalEventSteps === 0 ? 0 : Math.round((enabledMatches / totalEventSteps) * 1000) / 10

        const result: ConformanceResult = {
            fitnessScore,
            deviations: aggregated,
            eventLogStats: stats,
        }

        setConformanceResult(result)
        setIsLoading(false)
    }

    const handleTraceApply = useCallback((net: PetriNet, step?: SimulationStep) => {
        setPetriNet(net)
        if (step?.firedTransition) {
            const t = net.transitions.find(tt => tt.id === step.firedTransition || tt.name === step.firedTransition)
            if (t) {
                if (!t.enabled) {
                    setMessage(`Warning: Transition ${step.firedTransition} is not enabled at this step`)
                } else {
                    setMessage(null)
                }
                setHighlightedTransitionId(t.id)
                setTimeout(() => setHighlightedTransitionId(undefined), 1000)
            }
        }
    }, [])

    // New: reset tokens to the initial markings captured on load/upload
    const handleResetMarking = useCallback(() => {
        setPetriNet(prev => {
            const next = {
                ...prev,
                places: prev.places.map(p => {
                    const init = initialMarkings[p.id] ?? 0
                    const max = p.maxTokens
                    const tokens = max !== undefined ? Math.min(init, max) : init
                    return { ...p, tokens }
                })
            }
            return updateTransitionStates(next)
        })
        setHighlightedTransitionId(undefined)
        setMessage(null)
    }, [initialMarkings])

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            <ConformanceControls
                onRunAnalysis={handleRunAnalysis}
                onFileUpload={handleFileUpload}
                onXesFileUpload={handleXesFileUpload}
                isLoading={isLoading}
                currentFileName={currentFileName}
                currentXesFileName={currentXesFileName}
            />

            <section className="w-full lg:w-2/3 xl:w-3/4 flex flex-col">
                {/* Error Message */}
                {uploadError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">File Upload Error</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>{uploadError}</p>
                                </div>
                            </div>
                            <div className="ml-auto pl-3">
                                <div className="-mx-1.5 -my-1.5">
                                    <button
                                        type="button"
                                        className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100"
                                        onClick={() => setUploadError(null)}
                                    >
                                        <span className="sr-only">Dismiss</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Warning/Info Message */}
                {message && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                        {message}
                    </div>
                )}

                <PetriNetVisualization mode="conformance" petriNet={petriNet} highlightedTransitionId={highlightedTransitionId} onResetMarking={handleResetMarking} />

                {conformanceResult && (
                    <ConformanceResults result={conformanceResult} />
                )}

                {/* Trace viewer for event log cases */}
                {traces.length > 0 && (
                    <>
                        <TraceViewer
                            petriNet={petriNet}
                            traces={traces}
                            onApplyStep={(updated, step) => handleTraceApply(updated, step)}
                            onWarn={(msg) => setMessage(msg)}
                            title="Cases"
                            onSelectTrace={(t) => setSelectedTraceId(t.id)}
                            deviationsByTrace={Object.fromEntries(Object.entries(perTraceDeviations).map(([k, v]) => [k, v.length]))}
                            onResetMarking={handleResetMarking}
                        />

                        {/* Selected trace deviations */}
                        {selectedTraceId && perTraceDeviations[selectedTraceId] && (
                            <div className="bg-white p-4 rounded-lg shadow mt-4">
                                <h3 className="font-semibold mb-2 text-slate-800">Deviations for {traces.find(t => t.id === selectedTraceId)?.label}</h3>
                                {perTraceDeviations[selectedTraceId].length === 0 ? (
                                    <p className="text-sm text-slate-500">No deviations found.</p>
                                ) : (
                                    <ul className="text-sm space-y-2">
                                        {perTraceDeviations[selectedTraceId].map((d, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <span className={`font-mono text-xs px-1.5 py-0.5 rounded-md mt-0.5 ${d.type === 'deviation' ? 'bg-red-100 text-red-800' : d.type === 'missing' ? 'bg-slate-100 text-slate-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {d.type.toUpperCase()}
                                                </span>
                                                <span>{d.description}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}

export default ConformancePage
