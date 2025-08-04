import ConformanceControls from '@/components/ConformanceControls'
import ConformanceResults from '@/components/ConformanceResults'
import PetriNetVisualization from '@/components/PetriNetVisualization'
import { ConformanceResult } from '@/types'
import { useState } from 'react'

const ConformancePage: React.FC = () => {
    const [conformanceResult, setConformanceResult] = useState<ConformanceResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)

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
                isLoading={isLoading}
            />

            <section className="w-full lg:w-2/3 xl:w-3/4 flex flex-col">
                <PetriNetVisualization mode="conformance" />

                {conformanceResult && (
                    <ConformanceResults result={conformanceResult} />
                )}
            </section>
        </div>
    )
}

export default ConformancePage
