import { ConformanceResult } from '@/types'
import React from 'react'

interface ConformanceResultsProps {
    result: ConformanceResult
}

const ConformanceResults: React.FC<ConformanceResultsProps> = ({ result }) => {
    return (
        <div className="results-section visible bg-white p-6 rounded-lg shadow-lg mt-6">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h2 className="text-xl font-semibold">Conformance Analysis</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 p-4 rounded-lg text-center flex flex-col justify-center">
                    <p className="text-sm text-indigo-800 font-semibold">FITNESS SCORE</p>
                    <p className="text-4xl font-bold text-indigo-600">{result.fitnessScore}%</p>
                    <p className="text-xs text-slate-500 mt-1">How well the log fits the model</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border">
                    <h3 className="font-semibold mb-3 text-slate-800">Event Log Stats</h3>
                    <dl className="text-sm space-y-2">
                        <div className="flex justify-between">
                            <dt className="text-slate-500">Traces</dt>
                            <dd className="font-semibold text-slate-700">{result.eventLogStats.traces}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-slate-500">Total Events</dt>
                            <dd className="font-semibold text-slate-700">{result.eventLogStats.totalEvents}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-slate-500">Avg. Duration</dt>
                            <dd className="font-semibold text-slate-700">{result.eventLogStats.avgDuration}</dd>
                        </div>
                    </dl>
                </div>

                <div className="bg-white p-4 rounded-lg border md:col-span-3">
                    <h3 className="font-semibold mb-2">Problem Hotspots</h3>
                    <ul className="text-sm space-y-2">
                        {result.deviations.map((deviation, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className={`font-mono text-xs px-1.5 py-0.5 rounded-md mt-0.5 ${deviation.type === 'deviation' ? 'bg-red-100 text-red-800' :
                                        deviation.type === 'missing' ? 'bg-slate-100 text-slate-800' :
                                            'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {deviation.type.toUpperCase()}
                                </span>
                                <span>{deviation.description}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default ConformanceResults
