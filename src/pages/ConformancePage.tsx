import ConformanceControls from '@/components/ConformanceControls'
import ConformanceResults from '@/components/ConformanceResults'
import PetriNetVisualization from '@/components/PetriNetVisualization'
import TraceViewer from '@/components/TraceViewer'
import { ConformanceResult, EventLog, ExecutionTrace, FileUploadResult, PetriNet, SimulationStep } from '@/types'
import { createDefaultPetriNet, updateTransitionStates } from '@/utils/petriNetUtils'
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

    const traces: ExecutionTrace[] = useMemo(() => {
        if (!eventLog) return []
        const startMarkings: Record<string, number> = petriNet.places.reduce((acc, p) => { acc[p.id] = p.tokens; return acc }, {} as Record<string, number>)
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
                startMarkings,
            }
        })
    }, [eventLog, petriNet])

    const handleFileUpload = useCallback((result: FileUploadResult) => {
        if (result.success && result.data) {
            setPetriNet(updateTransitionStates(result.data))
            setCurrentFileName(result.filename)
            setUploadError(null)
            setConformanceResult(null)
            setMessage(null)
            setHighlightedTransitionId(undefined)
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
        } else {
            setUploadError(result.error || 'Unknown event log file error occurred')
            console.error('Event log file upload failed:', result.error)
        }
    }, [])

    const handleRunAnalysis = async () => {
        setIsLoading(true)
        await new Promise(resolve => setTimeout(resolve, 1500))
        const stats = (() => {
            if (eventLog) {
                return {
                    traces: eventLog.traces.length,
                    totalEvents: eventLog.totalEvents,
                    avgDuration: '-'
                }
            }
            return { traces: 0, totalEvents: 0, avgDuration: '-' }
        })()
        const mockResult: ConformanceResult = {
            fitnessScore: 87.5,
            deviations: [
                {
                    type: 'deviation',
                    description: "Transition 'T3' was executed 4 times without 'P3' being marked.",
                    transitionId: 't3',
                    severity: 'high'
                },
                {
                    type: 'missing',
                    description: 'Path from T3 to P1 was never taken in the log.',
                    severity: 'medium'
                }
            ],
            eventLogStats: stats
        }

        setConformanceResult(mockResult)
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

                <PetriNetVisualization mode="conformance" petriNet={petriNet} highlightedTransitionId={highlightedTransitionId} />

                {conformanceResult && (
                    <ConformanceResults result={conformanceResult} />
                )}

                {/* Trace viewer for event log cases */}
                {traces.length > 0 && (
                    <TraceViewer
                        petriNet={petriNet}
                        traces={traces}
                        onApplyStep={(updated, step) => handleTraceApply(updated, step)}
                        onWarn={(msg) => setMessage(msg)}
                        title="Cases"
                    />
                )}
            </section>
        </div>
    )
}

export default ConformancePage
