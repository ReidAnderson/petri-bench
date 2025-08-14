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
