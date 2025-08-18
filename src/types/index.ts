export interface Place {
    id: string
    name: string
    x: number
    y: number
    tokens: number
    maxTokens?: number
}

export interface Transition {
    id: string
    name: string
    x: number
    y: number
    width: number
    height: number
    enabled: boolean
}

export interface Arc {
    id: string
    source: string
    target: string
    weight: number
}

export interface PetriNet {
    places: Place[]
    transitions: Transition[]
    arcs: Arc[]
}

export interface SimulationStep {
    step: number
    markings: Record<string, number>
    firedTransition?: string
    timestamp: string
}

export interface SimulationResult {
    steps: SimulationStep[]
    firingCounts: Record<string, number>
    boundedness: string
    totalSteps: number
}

export interface ConformanceResult {
    fitnessScore: number
    deviations: Deviation[]
    eventLogStats: EventLogStats
}

export interface Deviation {
    type: 'missing' | 'deviation' | 'extra'
    description: string
    transitionId?: string
    severity: 'low' | 'medium' | 'high'
}

export interface EventLogStats {
    traces: number
    totalEvents: number
    avgDuration: string
}

export interface FileUploadResult {
    success: boolean
    data?: any
    error?: string
    filename: string
}

// Parsed Event Log types
export interface LogEvent {
    activity: string
    timestamp: string
    lifecycle?: string
    resource?: string
    // Additional attributes
    [key: string]: any
}

export interface Trace {
    id: string
    events: LogEvent[]
}

export interface EventLog {
    traces: Trace[]
    totalEvents: number
}

/**
 * Generic execution trace that can be replayed in the UI.
 * - source 'manual' for interactive simulation,
 * - 'simulation' for automated runs,
 * - 'conformance' for uploaded event log cases.
 */
export interface ExecutionTrace {
    id: string
    label: string
    steps: SimulationStep[]
    source: 'manual' | 'simulation' | 'conformance'
    createdAt: string
    /** initial markings used to start the replay */
    startMarkings?: Record<string, number>
}

export type ReplayStepStatus = 'valid' | 'invalid' | 'missing' | 'noop'
export interface ReplayStepEntry {
    step: number
    status: ReplayStepStatus
    name?: string
    transitionId?: string
}

/**
 * Highlights produced during trace replay up to a selected step.
 * - valid: transitions in the model that were enabled at the moment they fired.
 * - invalidNotEnabled: transitions in the model that were not enabled when the event occurred.
 * - missingEvents: events whose activity name does not exist in the model.
 * - sequence: ordered per-step classification for the narrative.
 */
export interface ReplayHighlights {
    valid: string[]
    invalidNotEnabled: string[]
    missingEvents: Array<{ name: string; count: number }>
    sequence: ReplayStepEntry[]
}
