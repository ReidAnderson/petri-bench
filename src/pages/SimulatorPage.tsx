import ExperimentalVisualization from '@/components/ExperimentalVisualization'
import SimulationControls from '@/components/SimulationControls'
import SimulationResults from '@/components/SimulationResults'
import TraceViewer from '@/components/TraceViewer'
import { ExecutionTrace, FileUploadResult, PetriNet, SimulationResult, SimulationStep } from '@/types'
import { stepsToXES, traceToCSV } from '@/utils/exportUtils'
import { createDefaultPetriNet, fireTransition, simulatePetriNet, stepOnce, updateTransitionStates } from '@/utils/petriNetUtils'
import { Copy } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

const SimulatorPage: React.FC = () => {
    const [petriNet, setPetriNet] = useState<PetriNet>(() => updateTransitionStates(createDefaultPetriNet()))
    const [currentFileName, setCurrentFileName] = useState<string>('default_petri_net.pnml')
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [stepMessage, setStepMessage] = useState<string | null>(null)
    const [selected, setSelected] = useState<{ type: 'place' | 'transition'; id: string } | null>(null)
    const [copyMsg, setCopyMsg] = useState<string | null>(null)
    const [traces, setTraces] = useState<ExecutionTrace[]>([])
    const [highlightedTransitionId, setHighlightedTransitionId] = useState<string | undefined>(undefined)
    // New: store initial markings to allow resetting
    const [initialMarkings, setInitialMarkings] = useState<Record<string, number>>(() => {
        const net = updateTransitionStates(createDefaultPetriNet())
        return net.places.reduce((acc, p) => { acc[p.id] = p.tokens; return acc }, {} as Record<string, number>)
    })

    const selectedPlace = useMemo(() => selected?.type === 'place' ? petriNet.places.find(p => p.id === selected.id) ?? null : null, [selected, petriNet])
    const selectedTransition = useMemo(() => selected?.type === 'transition' ? petriNet.transitions.find(t => t.id === selected.id) ?? null : null, [selected, petriNet])

    const handleFileUpload = useCallback((result: FileUploadResult) => {
        if (result.success && result.data) {
            const updatedNet = updateTransitionStates(result.data)
            setPetriNet(updatedNet)
            setInitialMarkings(updatedNet.places.reduce((acc, p) => { acc[p.id] = p.tokens; return acc }, {} as Record<string, number>))
            setCurrentFileName(result.filename)
            setUploadError(null)
            setStepMessage(null)
            setSimulationResult(null)
            setSelected(null)
            setTraces([])
            setHighlightedTransitionId(undefined)
        } else {
            setUploadError(result.error || 'Unknown error occurred')
            console.error('File upload failed:', result.error)
        }
    }, [])

    const pushManualStep = useCallback((net: PetriNet, firedTransition?: string) => {
        setTraces(prev => {
            const nowISO = new Date().toISOString()
            const markings: Record<string, number> = net.places.reduce((acc, p) => { acc[p.id] = p.tokens; return acc }, {} as Record<string, number>)
            const last = prev[0]
            if (last && last.source === 'manual') {
                const step: SimulationStep = { step: last.steps.length + 1, markings, firedTransition, timestamp: nowISO }
                const updated = { ...last, steps: [...last.steps, step] }
                return [updated, ...prev.slice(1)]
            }
            const firstStep: SimulationStep = { step: 1, markings, firedTransition, timestamp: nowISO }
            const startMarkings: Record<string, number> = petriNet.places.reduce((acc, p) => { acc[p.id] = p.tokens; return acc }, {} as Record<string, number>)
            const newTrace: ExecutionTrace = {
                id: `manual-${nowISO}`,
                label: `Manual ${new Date(nowISO).toLocaleTimeString()}`,
                steps: [firstStep],
                source: 'manual',
                createdAt: nowISO,
                startMarkings,
            }
            return [newTrace, ...prev]
        })
    }, [petriNet])

    const handleStepOnce = useCallback(() => {
        const result = stepOnce(petriNet)
        setPetriNet(result.petriNet)
        setHighlightedTransitionId(result.firedTransition)
        pushManualStep(result.petriNet, result.firedTransition)
        if (result.firedTransition) {
            setStepMessage(`Fired transition: ${result.firedTransition}`)
        } else {
            setStepMessage(result.message || 'No transition fired')
        }
        setTimeout(() => setStepMessage(null), 3000)
        setTimeout(() => setHighlightedTransitionId(undefined), 1000)
    }, [petriNet, pushManualStep])

    const handleFireTransition = useCallback((transitionId: string) => {
        const result = fireTransition(petriNet, transitionId)
        setPetriNet(result.petriNet)
        setHighlightedTransitionId(result.success ? transitionId : undefined)
        pushManualStep(result.petriNet, result.success ? transitionId : undefined)
        setStepMessage(result.success ? `Fired transition: ${transitionId}` : (result.message || 'Transition not fired'))
        setTimeout(() => setStepMessage(null), 3000)
        setTimeout(() => setHighlightedTransitionId(undefined), 1000)
    }, [petriNet, pushManualStep])

    const handleRunSimulation = async (steps: number) => {
        setIsLoading(true)
        await new Promise(resolve => setTimeout(resolve, 500))
        const simSteps: SimulationStep[] = simulatePetriNet(petriNet, steps)
        const now = Date.now()
        const simResult: SimulationResult = {
            steps: simSteps,
            firingCounts: simSteps.reduce<Record<string, number>>((acc, s) => {
                if (s.firedTransition) acc[s.firedTransition] = (acc[s.firedTransition] || 0) + 1
                return acc
            }, {}),
            boundedness: '1-Bounded',
            totalSteps: steps
        }
        setSimulationResult(simResult)
        const startMarkings: Record<string, number> = petriNet.places.reduce((acc, p) => { acc[p.id] = p.tokens; return acc }, {} as Record<string, number>)
        setTraces(prev => [{
            id: `sim-${now}`,
            label: `Run ${new Date(now).toLocaleTimeString()}`,
            steps: simSteps,
            source: 'simulation',
            createdAt: new Date(now).toISOString(),
            startMarkings,
        }, ...prev])
        setIsLoading(false)
    }

    const handleReset = () => {
        setSimulationResult(null)
        setUploadError(null)
        setStepMessage(null)
        const resetNet = updateTransitionStates(createDefaultPetriNet())
        setPetriNet(resetNet)
        setInitialMarkings(resetNet.places.reduce((acc, p) => { acc[p.id] = p.tokens; return acc }, {} as Record<string, number>))
        setCurrentFileName('default_petri_net.pnml')
        setSelected(null)
        setTraces([])
        setHighlightedTransitionId(undefined)
    }

    const handleSelectElement = useCallback((sel: { type: 'place' | 'transition'; id: string }) => {
        setSelected(sel)
    }, [])

    const handleUpdatePlace = useCallback((id: string, changes: Partial<PetriNet['places'][number]>) => {
        setPetriNet(prev => {
            const oldId = id
            const requestedId = typeof changes.id === 'string' ? changes.id.trim() : undefined
            const willRename = requestedId && requestedId !== oldId

            // Validate uniqueness across places and transitions when renaming
            const isTaken = (candidate: string) =>
                prev.places.some(p => p.id === candidate) || prev.transitions.some(t => t.id === candidate)

            let newId = oldId
            if (willRename) {
                if (!requestedId || isTaken(requestedId)) {
                    // Ignore invalid/duplicate id changes
                    newId = oldId
                } else {
                    newId = requestedId
                }
            }

            const nextPlaces = prev.places.map(p => {
                if (p.id !== oldId) return p
                const nextTokens = changes.tokens !== undefined ? Math.max(0, Math.floor(changes.tokens)) : p.tokens
                const nextMax = changes.maxTokens !== undefined ? (changes.maxTokens === null ? undefined : Math.max(0, Math.floor(changes.maxTokens))) : p.maxTokens
                const clampedTokens = nextMax !== undefined ? Math.min(nextTokens, nextMax) : nextTokens
                return {
                    ...p,
                    ...changes,
                    id: newId,
                    tokens: clampedTokens,
                    maxTokens: nextMax,
                }
            })

            // If id changed, update arcs referencing this place
            const nextArcs = willRename && newId !== oldId && requestedId && !isTaken(requestedId)
                ? prev.arcs.map(a => ({
                    ...a,
                    source: a.source === oldId ? newId : a.source,
                    target: a.target === oldId ? newId : a.target,
                }))
                : prev.arcs

            const updated = updateTransitionStates({ ...prev, places: nextPlaces, arcs: nextArcs })

            // Keep selection in sync
            if (willRename && newId !== oldId && requestedId && !isTaken(requestedId)) {
                setSelected(sel => sel && sel.type === 'place' && sel.id === oldId ? { type: 'place', id: newId } : sel)
                // New: also update initial markings key
                setInitialMarkings(prevMarks => {
                    const marks = { ...prevMarks }
                    if (Object.prototype.hasOwnProperty.call(marks, oldId)) {
                        marks[newId] = marks[oldId]
                        delete marks[oldId]
                    }
                    return marks
                })
            }

            return updated
        })
    }, [])

    const handleUpdateTransition = useCallback((id: string, changes: Partial<PetriNet['transitions'][number]>) => {
        setPetriNet(prev => {
            const oldId = id
            const requestedId = typeof changes.id === 'string' ? changes.id.trim() : undefined
            const willRename = requestedId && requestedId !== oldId

            const isTaken = (candidate: string) =>
                prev.places.some(p => p.id === candidate) || prev.transitions.some(t => t.id === candidate)

            let newId = oldId
            if (willRename) {
                if (!requestedId || isTaken(requestedId)) {
                    newId = oldId
                } else {
                    newId = requestedId
                }
            }

            const nextTransitions = prev.transitions.map(t => t.id === oldId ? { ...t, ...changes, id: newId } : t)

            // If id changed, update arcs referencing this transition
            const nextArcs = willRename && newId !== oldId && requestedId && !isTaken(requestedId)
                ? prev.arcs.map(a => ({
                    ...a,
                    source: a.source === oldId ? newId : a.source,
                    target: a.target === oldId ? newId : a.target,
                }))
                : prev.arcs

            const updated = updateTransitionStates({ ...prev, transitions: nextTransitions, arcs: nextArcs })

            if (willRename && newId !== oldId && requestedId && !isTaken(requestedId)) {
                setSelected(sel => sel && sel.type === 'transition' && sel.id === oldId ? { type: 'transition', id: newId } : sel)
            }

            return updated
        })
    }, [])

    const handleCopyNet = useCallback(async () => {
        try {
            const data = JSON.stringify(petriNet, null, 2)
            if (navigator && 'clipboard' in navigator && (navigator as any).clipboard?.writeText) {
                await (navigator as any).clipboard.writeText(data)
            } else {
                // Fallback for older browsers
                const textarea = document.createElement('textarea')
                textarea.value = data
                textarea.style.position = 'fixed'
                textarea.style.left = '-9999px'
                document.body.appendChild(textarea)
                textarea.focus()
                textarea.select()
                document.execCommand('copy')
                document.body.removeChild(textarea)
            }
            setCopyMsg('Copied!')
        } catch (e) {
            setCopyMsg('Copy failed')
        } finally {
            setTimeout(() => setCopyMsg(null), 2000)
        }
    }, [petriNet])

    // Helper to copy arbitrary text (used by exports)
    const copyToClipboard = useCallback(async (text: string, successMsg?: string) => {
        try {
            if (navigator && 'clipboard' in navigator && (navigator as any).clipboard?.writeText) {
                await (navigator as any).clipboard.writeText(text)
            } else {
                const textarea = document.createElement('textarea')
                textarea.value = text
                textarea.style.position = 'fixed'
                textarea.style.left = '-9999px'
                document.body.appendChild(textarea)
                textarea.focus()
                textarea.select()
                document.execCommand('copy')
                document.body.removeChild(textarea)
            }
            setStepMessage(successMsg || 'Copied to clipboard')
        } catch (e) {
            setStepMessage('Copy failed')
        } finally {
            setTimeout(() => setStepMessage(null), 3000)
        }
    }, [])

    const handleTraceApply = useCallback((net: PetriNet, step?: SimulationStep) => {
        setPetriNet(net)
        if (step?.firedTransition) {
            // try match by id or name
            const t = net.transitions.find(tt => tt.id === step.firedTransition || tt.name === step.firedTransition)
            if (t) {
                if (!t.enabled) {
                    setStepMessage(`Warning: Transition ${step.firedTransition} is not enabled at this step`)
                }
                setHighlightedTransitionId(t.id)
                setTimeout(() => setHighlightedTransitionId(undefined), 1000)
            }
        }
    }, [])

    // Removed file download in favor of clipboard copy
    const handleExportXES = useCallback(async (trace: ExecutionTrace) => {
        const xes = stepsToXES(trace.steps, trace.id)
        await copyToClipboard(xes, 'XES copied to clipboard')
    }, [copyToClipboard])

    const handleExportCSV = useCallback(async (trace: ExecutionTrace) => {
        const csv = traceToCSV(trace)
        await copyToClipboard(csv, 'CSV copied to clipboard')
    }, [copyToClipboard])

    // New: reset tokens to initial markings
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
    }, [initialMarkings])

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            <SimulationControls
                onRunSimulation={handleRunSimulation}
                onStepOnce={handleStepOnce}
                onReset={handleReset}
                onFileUpload={handleFileUpload}
                isLoading={isLoading}
                currentFileName={currentFileName}
                selectedPlace={selectedPlace}
                selectedTransition={selectedTransition}
                onUpdatePlace={handleUpdatePlace}
                onUpdateTransition={handleUpdateTransition}
                onClearSelection={() => setSelected(null)}
            />

            <section className="main-panel w-full lg:w-2/3 xl:w-3/4 flex flex-col">
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

                {/* Step Message */}
                {stepMessage && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">Simulation Step</h3>
                                <div className="mt-2 text-sm text-green-700">
                                    <p>{stepMessage}</p>
                                </div>
                            </div>
                            <div className="ml-auto pl-3">
                                <div className="-mx-1.5 -my-1.5">
                                    <button
                                        type="button"
                                        className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100"
                                        onClick={() => setStepMessage(null)}
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

                {/* Copy JSON toolbar */}
                <div className="mb-2 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleCopyNet}
                        className="inline-flex items-center gap-2 bg-slate-600 text-white font-medium py-1.5 px-3 rounded-lg hover:bg-slate-700"
                        title="Copy current Petri Net JSON to clipboard"
                    >
                        <Copy size={16} />
                        Copy JSON
                    </button>
                    {copyMsg && (
                        <span className={`text-xs ${copyMsg === 'Copied!' ? 'text-emerald-700' : 'text-red-600'}`}>{copyMsg}</span>
                    )}
                </div>

                <ExperimentalVisualization mode="simulator" petriNet={petriNet} onFireTransition={handleFireTransition} onSelectElement={handleSelectElement} highlightedTransitionId={highlightedTransitionId} onResetMarking={handleResetMarking} onPetriNetChange={setPetriNet} />

                {simulationResult && (
                    <SimulationResults result={simulationResult} />
                )}

                <TraceViewer
                    petriNet={petriNet}
                    traces={traces}
                    onApplyStep={(updated, step) => handleTraceApply(updated, step)}
                    onWarn={(msg) => setStepMessage(msg)}
                    title="Executions"
                    onExportXES={handleExportXES}
                    onExportCSV={handleExportCSV}
                    onResetMarking={handleResetMarking}
                />
            </section>
        </div>
    )
}

export default SimulatorPage
