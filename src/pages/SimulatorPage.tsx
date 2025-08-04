import PetriNetVisualization from '@/components/PetriNetVisualization'
import SimulationControls from '@/components/SimulationControls'
import SimulationResults from '@/components/SimulationResults'
import { SimulationResult } from '@/types'
import { useState } from 'react'

const SimulatorPage: React.FC = () => {
    const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleRunSimulation = async (steps: number) => {
        setIsLoading(true)

        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Mock simulation result
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
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            <SimulationControls
                onRunSimulation={handleRunSimulation}
                onReset={handleReset}
                isLoading={isLoading}
            />

            <section className="main-panel w-full lg:w-2/3 xl:w-3/4 flex flex-col">
                <PetriNetVisualization mode="simulator" />

                {simulationResult && (
                    <SimulationResults result={simulationResult} />
                )}
            </section>
        </div>
    )
}

export default SimulatorPage
