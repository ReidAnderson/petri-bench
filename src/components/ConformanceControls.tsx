import { useState } from 'react'

interface ConformanceControlsProps {
    onRunAnalysis: () => void
    isLoading: boolean
}

const ConformanceControls: React.FC<ConformanceControlsProps> = ({
    onRunAnalysis,
    isLoading
}) => {
    const [pnmlFile] = useState<string | null>('default_model.pnml')
    const [xesFile] = useState<string | null>('event_log.xes')

    return (
        <aside className="w-full lg:w-1/3 xl:w-1/4 flex flex-col gap-6 flex-shrink-0">
            {/* File Upload Section */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 border-b pb-3">1. Upload Files</h2>

                {/* PNML Upload */}
                <div className="mb-4">
                    <label className="font-medium text-slate-700 text-sm">Petri Net Model</label>
                    <div className="mt-1 file-upload-area">
                        <input type="file" className="hidden" accept=".pnml" />
                        <p className="text-sm text-slate-600">
                            <span className="font-semibold text-blue-600">Upload PNML</span>
                        </p>
                    </div>
                    {pnmlFile && (
                        <div className="mt-2 text-sm text-center text-slate-700">
                            <p className="font-medium text-slate-600">Loaded:</p>
                            <p className="text-indigo-700 font-semibold">{pnmlFile}</p>
                        </div>
                    )}
                </div>

                {/* XES Upload */}
                <div>
                    <label className="font-medium text-slate-700 text-sm">Event Log</label>
                    <div className="mt-1 file-upload-area">
                        <input type="file" className="hidden" accept=".xes" />
                        <p className="text-sm text-slate-600">
                            <span className="font-semibold text-blue-600">Upload XES</span>
                        </p>
                    </div>
                    {xesFile && (
                        <div className="mt-2 text-sm text-center text-slate-700">
                            <p className="font-medium text-slate-600">Loaded:</p>
                            <p className="text-indigo-700 font-semibold">{xesFile}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Analysis Section */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 border-b pb-3">2. Run Analysis</h2>
                <p className="text-sm text-slate-500 mb-4">
                    Analyze the event log against the model to find deviations.
                </p>
                <button
                    onClick={onRunAnalysis}
                    disabled={isLoading || !pnmlFile || !xesFile}
                    className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                    {isLoading ? 'Analyzing...' : 'Run Analysis'}
                </button>
            </div>
        </aside>
    )
}

export default ConformanceControls
