/**
 * Utility functions for Petri Net operations
 */

import { Arc, PetriNet, Place, SimulationStep, Transition } from '@/types'

/**
 * Creates a default Petri net for demonstration purposes
 */
export const createDefaultPetriNet = (): PetriNet => {
    const places: Place[] = [
        { id: 'p1', name: 'P1', x: 200, y: 50, tokens: 1 },
        { id: 'p2', name: 'P2', x: 325, y: 150, tokens: 0 },
        { id: 'p3', name: 'P3', x: 75, y: 150, tokens: 0 },
    ]

    const transitions: Transition[] = [
        { id: 't1', name: 'T1', x: 260, y: 80, width: 15, height: 30, enabled: true },
        { id: 't2', name: 'T2', x: 185, y: 225, width: 30, height: 15, enabled: false },
        { id: 't3', name: 'T3', x: 125, y: 80, width: 15, height: 30, enabled: false },
    ]

    const arcs: Arc[] = [
        { id: 'a1', source: 'p1', target: 't1', weight: 1 },
        { id: 'a2', source: 't1', target: 'p2', weight: 1 },
        { id: 'a3', source: 'p2', target: 't2', weight: 1 },
        { id: 'a4', source: 't2', target: 'p3', weight: 1 },
        { id: 'a5', source: 'p3', target: 't3', weight: 1 },
        { id: 'a6', source: 't3', target: 'p1', weight: 1 },
    ]

    return { places, transitions, arcs }
}

/**
 * Simulates a Petri net for a given number of steps
 */
export const simulatePetriNet = (
    petriNet: PetriNet,
    steps: number
): SimulationStep[] => {
    const result: SimulationStep[] = []
    const markings = petriNet.places.reduce((acc, place) => {
        acc[place.id] = place.tokens
        return acc
    }, {} as Record<string, number>)

    for (let i = 0; i <= steps; i++) {
        result.push({
            step: i,
            markings: { ...markings },
            timestamp: new Date(Date.now() + i * 1000).toISOString(),
        })

        // Simple simulation logic - fire enabled transitions
        if (markings.p1 > 0) {
            markings.p1--
            markings.p2++
            result[result.length - 1].firedTransition = 't1'
        } else if (markings.p2 > 0) {
            markings.p2--
            markings.p3++
            result[result.length - 1].firedTransition = 't2'
        } else if (markings.p3 > 0) {
            markings.p3--
            markings.p1++
            result[result.length - 1].firedTransition = 't3'
        }
    }

    return result
}

/**
 * Validates if a marking is safe (bounded)
 */
export const isMarkingSafe = (markings: Record<string, number>): boolean => {
    return Object.values(markings).every(tokens => tokens <= 1)
}

/**
 * Calculates fitness score based on simulation results
 */
export const calculateFitnessScore = (
    simulationSteps: SimulationStep[],
    expectedBehavior: string[]
): number => {
    // Mock implementation - in real scenario, this would compare
    // simulation results against expected event log
    const actualFirings = simulationSteps
        .filter(step => step.firedTransition)
        .map(step => step.firedTransition!)

    const matchingEvents = actualFirings.filter(firing =>
        expectedBehavior.includes(firing)
    ).length

    return expectedBehavior.length > 0
        ? (matchingEvents / expectedBehavior.length) * 100
        : 0
}

/**
 * Exports simulation results to XES format (simplified)
 */
export const exportToXES = (simulationSteps: SimulationStep[]): string => {
    const events = simulationSteps
        .filter(step => step.firedTransition)
        .map(step => ({
            timestamp: step.timestamp,
            activity: step.firedTransition,
            trace: 'trace_1'
        }))

    // Simplified XES format
    const xesContent = `<?xml version="1.0" encoding="UTF-8"?>
<log xes.version="1.0" xes.features="nested-attributes" openxes.version="1.0RC7">
  <extension name="Lifecycle" prefix="lifecycle" uri="http://www.xes-standard.org/lifecycle.xesext"/>
  <extension name="Time" prefix="time" uri="http://www.xes-standard.org/time.xesext"/>
  <trace>
    <string key="concept:name" value="trace_1"/>
    ${events.map(event => `
    <event>
      <string key="concept:name" value="${event.activity}"/>
      <date key="time:timestamp" value="${event.timestamp}"/>
      <string key="lifecycle:transition" value="complete"/>
    </event>`).join('')}
  </trace>
</log>`

    return xesContent
}
