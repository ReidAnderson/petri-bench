import { Upload } from 'lucide-react'
import { useState } from 'react'

interface SimulationControlsProps {
    onRunSimulation: (steps: number) => void
    onReset: () => void
    isLoading: boolean
}

const SimulationControls: React.FC<SimulationControlsProps> = ({
    onRunSimulation,
    onReset,
    isLoading
}) => {
    const [steps, setSteps] = useState(20)

    return (
        <aside className="collapsible-sidebar w-full lg:w-1/3 xl:w-1/4 flex flex-col gap-6 flex-shrink-0">
            {/* File Upload Section */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 border-b pb-3">1. Load Petri Net</h2>
                <div className="file-upload-area">
                    <input type="file" className="hidden" accept=".pnml" />
                    <Upload className="mx-auto h-10 w-10 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold text-blue-600">Upload a file</span>
                    </p>
                </div>
                <div className="mt-4 text-sm text-center text-slate-700">
                    <p className="font-medium">Displaying default:</p>
                    <p className="text-blue-700">complex_petri_net.pnml</p>
                </div>
            </div>

            {/* Modification Section */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 border-b pb-3">2. Modify & Tweak</h2>
                <p className="text-sm text-slate-500 mb-4">
                    Click on elements in the diagram to modify their properties.
                </p>
                <button
                    className="w-full bg-slate-200 text-slate-600 font-medium py-2 px-4 rounded-lg"
                    disabled
                >
                    No element selected
                </button>
            </div>

            {/* Simulation Section */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 border-b pb-3">3. Run Simulation</h2>
                <div className="flex items-center gap-4">
                    <label htmlFor="sim-steps" className="text-sm font-medium text-slate-700">
                        Steps:
                    </label>
                    <input
                        type="number"
                        id="sim-steps"
                        value={steps}
                        onChange={(e) => setSteps(parseInt(e.target.value) || 20)}
                        className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    />
                </div>
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => onRunSimulation(steps)}
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isLoading ? 'Running...' : 'Run Simulation'}
                    </button>
                    <button
                        onClick={onReset}
                        className="w-full bg-slate-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </aside>
    )
}

export default SimulationControls
