import React from 'react'

interface PetriNetVisualizationProps {
    mode: 'simulator' | 'conformance'
}

const PetriNetVisualization: React.FC<PetriNetVisualizationProps> = ({ mode }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col flex-shrink-0">
            <h2 className="text-xl font-semibold mb-4 border-b pb-3">
                {mode === 'simulator' ? 'Petri Net Visualization' : 'Annotated Visualization'}
            </h2>
            <div className="flex-grow bg-slate-50 rounded-lg flex items-center justify-center min-h-[300px]">
                <svg className="w-full h-full" viewBox="0 0 400 300">
                    <defs>
                        <marker
                            id="arrow"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                        >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                        </marker>
                    </defs>

                    {/* Places */}
                    <g>
                        <circle cx="200" cy="50" r="20" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="2" />
                        <text x="200" y="45" textAnchor="middle" fontSize="9">P1</text>
                        <circle id="p1_token" cx="200" cy="50" r="5" fill="#1e293b" />
                    </g>
                    <g>
                        <circle cx="325" cy="150" r="20" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="2" />
                        <text x="325" y="145" textAnchor="middle" fontSize="9">P2</text>
                        <circle id="p2_token" cx="325" cy="150" r="5" fill="#1e293b" style={{ display: 'none' }} />
                    </g>
                    <g>
                        <circle cx="75" cy="150" r="20" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="2" />
                        <text x="75" y="145" textAnchor="middle" fontSize="9">P3</text>
                        <circle id="p3_token" cx="75" cy="150" r="5" fill="#1e293b" style={{ display: 'none' }} />
                    </g>

                    {/* Transitions */}
                    <g>
                        <rect x="260" y="80" width="15" height="30" fill="#f1f5f9" stroke="#64748b" strokeWidth="2" />
                        <text x="290" y="95" fontSize="9">T1</text>
                    </g>
                    <g>
                        <rect x="185" y="225" width="30" height="15" fill="#f1f5f9" stroke="#64748b" strokeWidth="2" />
                        <text x="200" y="215" textAnchor="middle" fontSize="9">T2</text>
                    </g>
                    <g>
                        <rect x="125" y="80" width="15" height="30" fill="#f1f5f9" stroke="#64748b" strokeWidth="2" />
                        <text x="115" y="95" textAnchor="end" fontSize="9">T3</text>
                    </g>

                    {/* Arcs */}
                    <path d="M 218 60 L 260 85" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                    <path d="M 275 95 L 307 138" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                    <path d="M 305 150 L 215 228" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                    <path d="M 185 232.5 L 95 162" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                    <path d="M 93 138 L 125 95" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                    <path d="M 140 95 L 182 60" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                </svg>
            </div>
        </div>
    )
}

export default PetriNetVisualization
