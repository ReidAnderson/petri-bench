import ConformanceControls from '@/components/ConformanceControls'
import ConformanceResults from '@/components/ConformanceResults'
import PetriNetVisualization from '@/components/PetriNetVisualization'
import { ConformanceResult, FileUploadResult, PetriNet } from '@/types'
import { createDefaultPetriNet } from '@/utils/petriNetUtils'
import { useCallback, useState } from 'react'

const ConformancePage: React.FC = () => {
    const [petriNet, setPetriNet] = useState<PetriNet>(() => createDefaultPetriNet())
    const [currentFileName, setCurrentFileName] = useState<string>('default_petri_net.pnml')
    const [conformanceResult, setConformanceResult] = useState<ConformanceResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)

    const handleFileUpload = useCallback((result: FileUploadResult) => {
        if (result.success && result.data) {
            setPetriNet(result.data)
            setCurrentFileName(result.filename)
            setUploadError(null)
            // Reset conformance results when a new file is loaded
            setConformanceResult(null)
        } else {
            setUploadError(result.error || 'Unknown error occurred')
            console.error('File upload failed:', result.error)
        }
    }, [])

    const handleRunAnalysis = async () => {
        setIsLoading(true)

        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Mock conformance result
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
                    description: "Path from T3 to P1 was never taken in the log.",
                    severity: 'medium'
                }
            ],
            eventLogStats: {
                traces: 50,
                totalEvents: 432,
                avgDuration: '2.7 days'
            }
        }

        setConformanceResult(mockResult)
        setIsLoading(false)
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            <ConformanceControls
                onRunAnalysis={handleRunAnalysis}
                onFileUpload={handleFileUpload}
                isLoading={isLoading}
                currentFileName={currentFileName}
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

                <PetriNetVisualization mode="conformance" petriNet={petriNet} />

                {conformanceResult && (
                    <ConformanceResults result={conformanceResult} />
                )}
            </section>
        </div>
    )
}

export default ConformancePage
