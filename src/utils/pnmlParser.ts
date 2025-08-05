import { Arc, PetriNet, Place, Transition } from '@/types';
import { updateTransitionStates } from './petriNetUtils';

export interface ParseResult {
    success: boolean;
    petriNet?: PetriNet;
    error?: string;
    filename: string;
}

/**
 * Parses a PNML (Petri Net Markup Language) file content
 */
export function parsePNML(xmlContent: string, filename: string): ParseResult {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        // Check for parsing errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            return {
                success: false,
                error: 'Invalid XML format',
                filename
            };
        }

        // Find the net element
        const netElement = xmlDoc.querySelector('net');
        if (!netElement) {
            return {
                success: false,
                error: 'No Petri net found in PNML file',
                filename
            };
        }

        const places: Place[] = [];
        const transitions: Transition[] = [];
        const arcs: Arc[] = [];

        // Parse places
        const placeElements = netElement.querySelectorAll('place');
        placeElements.forEach((placeEl) => {
            const id = placeEl.getAttribute('id');
            if (!id) return;

            // Get name
            const nameEl = placeEl.querySelector('name text');
            const name = nameEl?.textContent || id;

            // Get position (graphics)
            const positionEl = placeEl.querySelector('graphics position');
            const x = parseFloat(positionEl?.getAttribute('x') || '0');
            const y = parseFloat(positionEl?.getAttribute('y') || '0');

            // Get initial marking (tokens)
            const markingEl = placeEl.querySelector('initialMarking text');
            const tokens = parseInt(markingEl?.textContent || '0', 10);

            // Get capacity if available
            const capacityEl = placeEl.querySelector('capacity text');
            const maxTokens = capacityEl ? parseInt(capacityEl.textContent || '0', 10) : undefined;

            places.push({
                id,
                name,
                x,
                y,
                tokens,
                maxTokens
            });
        });

        // Parse transitions
        const transitionElements = netElement.querySelectorAll('transition');
        transitionElements.forEach((transitionEl) => {
            const id = transitionEl.getAttribute('id');
            if (!id) return;

            // Get name
            const nameEl = transitionEl.querySelector('name text');
            const name = nameEl?.textContent || id;

            // Get position (graphics)
            const positionEl = transitionEl.querySelector('graphics position');
            const x = parseFloat(positionEl?.getAttribute('x') || '0');
            const y = parseFloat(positionEl?.getAttribute('y') || '0');

            // Get dimensions
            const dimensionEl = transitionEl.querySelector('graphics dimension');
            const width = parseFloat(dimensionEl?.getAttribute('x') || '30');
            const height = parseFloat(dimensionEl?.getAttribute('y') || '50');

            transitions.push({
                id,
                name,
                x,
                y,
                width,
                height,
                enabled: false // Will be calculated based on current marking
            });
        });

        // Parse arcs
        const arcElements = netElement.querySelectorAll('arc');
        arcElements.forEach((arcEl) => {
            const id = arcEl.getAttribute('id');
            const source = arcEl.getAttribute('source');
            const target = arcEl.getAttribute('target');

            if (!id || !source || !target) return;

            // Get weight/inscription
            const inscriptionEl = arcEl.querySelector('inscription text');
            const weight = parseInt(inscriptionEl?.textContent || '1', 10);

            arcs.push({
                id,
                source,
                target,
                weight
            });
        });

        // Calculate enabled transitions based on current marking
        const petriNet: PetriNet = {
            places,
            transitions,
            arcs
        };

        // Use the utility function to properly calculate transition states
        const updatedPetriNet = updateTransitionStates(petriNet);

        return {
            success: true,
            petriNet: updatedPetriNet,
            filename
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown parsing error',
            filename
        };
    }
}

/**
 * Creates a sample PNML content for testing
 */
export function createSamplePNML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<pnml xmlns="http://www.pnml.org/version-2009/grammar/pnml">
    <net id="net1" type="http://www.pnml.org/version-2009/grammar/ptnet">
        <name>
            <text>Sample Petri Net</text>
        </name>
        
        <place id="p1">
            <name>
                <text>Start</text>
            </name>
            <graphics>
                <position x="100" y="100"/>
            </graphics>
            <initialMarking>
                <text>1</text>
            </initialMarking>
        </place>
        
        <place id="p2">
            <name>
                <text>Middle</text>
            </name>
            <graphics>
                <position x="300" y="100"/>
            </graphics>
            <initialMarking>
                <text>0</text>
            </initialMarking>
        </place>
        
        <place id="p3">
            <name>
                <text>End</text>
            </name>
            <graphics>
                <position x="500" y="100"/>
            </graphics>
            <initialMarking>
                <text>0</text>
            </initialMarking>
        </place>
        
        <transition id="t1">
            <name>
                <text>Process A</text>
            </name>
            <graphics>
                <position x="200" y="100"/>
                <dimension x="30" y="50"/>
            </graphics>
        </transition>
        
        <transition id="t2">
            <name>
                <text>Process B</text>
            </name>
            <graphics>
                <position x="400" y="100"/>
                <dimension x="30" y="50"/>
            </graphics>
        </transition>
        
        <arc id="a1" source="p1" target="t1">
            <inscription>
                <text>1</text>
            </inscription>
        </arc>
        
        <arc id="a2" source="t1" target="p2">
            <inscription>
                <text>1</text>
            </inscription>
        </arc>
        
        <arc id="a3" source="p2" target="t2">
            <inscription>
                <text>1</text>
            </inscription>
        </arc>
        
        <arc id="a4" source="t2" target="p3">
            <inscription>
                <text>1</text>
            </inscription>
        </arc>
    </net>
</pnml>`;
}
