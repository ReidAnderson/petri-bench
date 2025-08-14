import PetriNetVisualization from '@/components/PetriNetVisualization'
import SimulationControls from '@/components/SimulationControls'
import SimulationResults from '@/components/SimulationResults'
import { FileUploadResult, PetriNet, SimulationResult } from '@/types'
import { createDefaultPetriNet, stepOnce, updateTransitionStates } from '@/utils/petriNetUtils'
import { useCallback, useState } from 'react'

const SimulatorPage: React.FC = () => {
    const [petriNet, setPetriNet] = useState<PetriNet>(() => updateTransitionStates(createDefaultPetriNet()))
    const [currentFileName, setCurrentFileName] = useState<string>('default_petri_net.pnml')
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [stepMessage, setStepMessage] = useState<string | null>(null)

    const handleFileUpload = useCallback((result: FileUploadResult) => {
        if (result.success && result.data) {
            const updatedNet = updateTransitionStates(result.data)
            setPetriNet(updatedNet)
            setCurrentFileName(result.filename)
            setUploadError(null)
            setStepMessage(null)
            // Reset simulation results when a new file is loaded
            setSimulationResult(null)
        } else {
            setUploadError(result.error || 'Unknown error occurred')
            // You could also show a toast notification here
            console.error('File upload failed:', result.error)
        }
    }, [])

    const handleStepOnce = useCallback(() => {
        const result = stepOnce(petriNet)
        setPetriNet(result.petriNet)

        if (result.firedTransition) {
            setStepMessage(`Fired transition: ${result.firedTransition}`)
        } else {
            setStepMessage(result.message || 'No transition fired')
        }

        // Clear message after 3 seconds
        setTimeout(() => setStepMessage(null), 3000)
    }, [petriNet])

    const handleRunSimulation = async (steps: number) => {
        setIsLoading(true)

        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Mock simulation result - in a real app, this would use the actual petriNet
        const mockResult: SimulationResult = {
            steps: [],
            firingCounts: { t1: 5, t2: 3, t3: 2 },
            boundedness: '1-Bounded',
            totalSteps: steps
        }

        setSimulationResult(mockResult)
        setIsLoading(false)
    }

    const handleReset = () => {
        setSimulationResult(null)
        setUploadError(null)
        setStepMessage(null)
        // Reset to initial state with updated transition states
        const resetNet = updateTransitionStates(createDefaultPetriNet())
        setPetriNet(resetNet)
        setCurrentFileName('default_petri_net.pnml')
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            <SimulationControls
                onRunSimulation={handleRunSimulation}
                onStepOnce={handleStepOnce}
                onReset={handleReset}
                onFileUpload={handleFileUpload}
                isLoading={isLoading}
                currentFileName={currentFileName}
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

                <PetriNetVisualization mode="simulator" petriNet={petriNet} />

                {simulationResult && (
                    <SimulationResults result={simulationResult} />
                )}
            </section>
        </div>
    )
}

export default SimulatorPage
