/**
 * Utility functions for Petri Net operations
 */

import { Arc, PetriNet, Place, SimulationStep, Transition } from '@/types'

/**
 * Creates a default Petri net for demonstration purposes
 */
export const createDefaultPetriNet = (): PetriNet => {
    const places: Place[] = [
        { id: 'p1', name: 'Start', x: 100, y: 100, tokens: 1 },
        { id: 'p2', name: 'Process A', x: 300, y: 100, tokens: 0 },
        { id: 'p3', name: 'Process B', x: 300, y: 200, tokens: 0 },
        { id: 'p4', name: 'Sync', x: 500, y: 150, tokens: 0 },
        { id: 'p5', name: 'End', x: 700, y: 150, tokens: 0, maxTokens: 5 },
    ]

    const transitions: Transition[] = [
        { id: 't1', name: 'Split', x: 200, y: 100, width: 30, height: 50, enabled: true },
        { id: 't2', name: 'TaskA', x: 400, y: 100, width: 30, height: 50, enabled: false },
        { id: 't3', name: 'TaskB', x: 400, y: 200, width: 30, height: 50, enabled: false },
        { id: 't4', name: 'Join', x: 600, y: 150, width: 30, height: 50, enabled: false },
    ]

    const arcs: Arc[] = [
        { id: 'a1', source: 'p1', target: 't1', weight: 1 },
        { id: 'a2', source: 't1', target: 'p2', weight: 1 },
        { id: 'a3', source: 't1', target: 'p3', weight: 1 },
        { id: 'a4', source: 'p2', target: 't2', weight: 1 },
        { id: 'a5', source: 'p3', target: 't3', weight: 1 },
        { id: 'a6', source: 't2', target: 'p4', weight: 1 },
        { id: 'a7', source: 't3', target: 'p4', weight: 1 },
        { id: 'a8', source: 'p4', target: 't4', weight: 2 },
        { id: 'a9', source: 't4', target: 'p5', weight: 1 },
    ]

    return { places, transitions, arcs }
}

/**
 * Determines which transitions are enabled based on current token distribution
 */
export const getEnabledTransitions = (petriNet: PetriNet): string[] => {
    const markings = petriNet.places.reduce((acc, place) => {
        acc[place.id] = place.tokens
        return acc
    }, {} as Record<string, number>)

    return petriNet.transitions.filter(transition => {
        // Find input arcs (arcs targeting this transition)
        const inputArcs = petriNet.arcs.filter(arc => arc.target === transition.id)

        // Check if all input places have enough tokens
        return inputArcs.every(arc => {
            const placeTokens = markings[arc.source] || 0
            return placeTokens >= arc.weight
        })
    }).map(transition => transition.id)
}

/**
 * Updates transition enabled states based on current markings
 */
export const updateTransitionStates = (petriNet: PetriNet): PetriNet => {
    const enabledTransitionIds = getEnabledTransitions(petriNet)

    return {
        ...petriNet,
        transitions: petriNet.transitions.map(transition => ({
            ...transition,
            enabled: enabledTransitionIds.includes(transition.id)
        }))
    }
}

/**
 * Fires a single transition and returns the updated Petri net
 */
export const fireTransition = (petriNet: PetriNet, transitionId: string): { petriNet: PetriNet; success: boolean; message?: string } => {
    const transition = petriNet.transitions.find(t => t.id === transitionId)
    if (!transition) {
        return {
            petriNet,
            success: false,
            message: `Transition ${transitionId} not found`
        }
    }

    // Check if transition is enabled
    const enabledTransitions = getEnabledTransitions(petriNet)
    if (!enabledTransitions.includes(transitionId)) {
        return {
            petriNet,
            success: false,
            message: `Transition ${transition.name} is not enabled`
        }
    }

    // Create new markings by firing the transition
    const newPlaces = petriNet.places.map(place => {
        let newTokens = place.tokens

        // Remove tokens from input places
        const inputArcs = petriNet.arcs.filter(arc => arc.source === place.id && arc.target === transitionId)
        inputArcs.forEach(arc => {
            newTokens -= arc.weight
        })

        // Add tokens to output places
        const outputArcs = petriNet.arcs.filter(arc => arc.source === transitionId && arc.target === place.id)
        outputArcs.forEach(arc => {
            newTokens += arc.weight
        })

        // Check capacity constraints
        if (place.maxTokens && newTokens > place.maxTokens) {
            return place // Don't modify if capacity would be exceeded
        }

        return {
            ...place,
            tokens: Math.max(0, newTokens) // Ensure non-negative tokens
        }
    })

    // Check if any capacity was exceeded
    const capacityExceeded = petriNet.places.some(place => {
        if (!place.maxTokens) return false

        const newPlace = newPlaces.find(p => p.id === place.id)
        return newPlace && newPlace.tokens !== place.tokens && place.tokens === newPlace.tokens
    })

    if (capacityExceeded) {
        return {
            petriNet,
            success: false,
            message: `Firing ${transition.name} would exceed place capacity`
        }
    }

    const newPetriNet: PetriNet = {
        places: newPlaces,
        transitions: petriNet.transitions,
        arcs: petriNet.arcs
    }

    // Update transition enabled states
    const updatedPetriNet = updateTransitionStates(newPetriNet)

    return {
        petriNet: updatedPetriNet,
        success: true,
        message: `Fired transition ${transition.name}`
    }
}

/**
 * Performs one step of simulation by firing a random enabled transition
 */
export const stepOnce = (petriNet: PetriNet): { petriNet: PetriNet; firedTransition?: string; message?: string } => {
    const enabledTransitions = getEnabledTransitions(petriNet)

    if (enabledTransitions.length === 0) {
        return {
            petriNet: updateTransitionStates(petriNet),
            message: 'No transitions are enabled'
        }
    }

    // Fire a random enabled transition (for demonstration)
    // In a real implementation, you might want to let the user choose
    const randomTransition = enabledTransitions[Math.floor(Math.random() * enabledTransitions.length)]
    const result = fireTransition(petriNet, randomTransition)

    if (result.success) {
        return {
            petriNet: result.petriNet,
            firedTransition: randomTransition,
            message: result.message
        }
    } else {
        return {
            petriNet: updateTransitionStates(petriNet),
            message: result.message
        }
    }
}
export const simulatePetriNet = (
    petriNet: PetriNet,
    steps: number
): SimulationStep[] => {
    const result: SimulationStep[] = []
    let curPetriNet = petriNet;

    for (let i = 0; i <= steps; i++) {
        // get all enabled transitions
        const enabledTransitions = getEnabledTransitions(curPetriNet)

        if (enabledTransitions.length === 0) {
            break;
        }

        // pick a random enabled transition to fire
        const randomTransition = enabledTransitions[Math.floor(Math.random() * enabledTransitions.length)]
        const fireResult = fireTransition(curPetriNet, randomTransition)
        curPetriNet = fireResult.petriNet;
        const markings = curPetriNet.places.reduce((acc, place) => {
            acc[place.id] = place.tokens
            return acc
        }, {} as Record<string, number>)

        result.push({
            step: i,
            markings: { ...markings },
            timestamp: new Date(Date.now() + i * 1000).toISOString(),
            firedTransition: fireResult.success ? randomTransition : undefined
        })
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

/**
 * Applies the provided markings to the given Petri net and updates transition states.
 * Useful for replaying traces where each step provides a marking snapshot.
 */
export const applyMarkingsToNet = (
    petriNet: PetriNet,
    markings: Record<string, number>
): PetriNet => {
    const newPlaces: Place[] = petriNet.places.map((p) => ({
        ...p,
        tokens: Math.max(0, markings[p.id] ?? p.tokens),
    }))
    return updateTransitionStates({ ...petriNet, places: newPlaces })
}
