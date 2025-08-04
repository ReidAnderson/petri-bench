import { SimulationResult } from '@/types'
import React from 'react'

interface SimulationResultsProps {
    result: SimulationResult
}

const SimulationResults: React.FC<SimulationResultsProps> = ({ result }) => {
    return (
        <div className="results-section visible bg-white p-6 rounded-lg shadow-lg mt-6">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h2 className="text-xl font-semibold">Simulation Results & Analysis</h2>
                <button className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm">
                    Export as XES
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
                <div className="bg-slate-100 p-3 rounded-md">
                    <p className="text-sm text-slate-500">Completed Steps</p>
                    <p className="text-lg font-bold">{result.totalSteps}</p>
                </div>
                <div className="bg-slate-100 p-3 rounded-md">
                    <p className="text-sm text-slate-500">Total Tokens</p>
                    <p className="text-lg font-bold">1</p>
                </div>
                <div className="bg-slate-100 p-3 rounded-md">
                    <p className="text-sm text-slate-500">Boundedness</p>
                    <p className="text-lg font-bold">{result.boundedness}</p>
                </div>
                <div className="bg-slate-100 p-3 rounded-md">
                    <p className="text-sm text-slate-500">Enabled Transitions</p>
                    <p className="text-lg font-bold">1</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold mb-2">Token Distribution Over Time</h3>
                    <div className="chart-container">
                        <div className="flex items-center justify-center h-full text-slate-500">
                            Chart will be rendered here
                        </div>
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold mb-2">Transition Firing Frequency</h3>
                    <div className="chart-container">
                        <div className="space-y-2">
                            {Object.entries(result.firingCounts).map(([transition, count]) => (
                                <div key={transition} className="flex justify-between">
                                    <span>{transition.toUpperCase()}</span>
                                    <span className="font-semibold">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SimulationResults
