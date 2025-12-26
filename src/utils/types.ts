export type Place = {
    id: string;
    label: string;
    tokens: number;
};

export type Transition = {
    id: string;
    label: string;
};

export type Arc = {
    from: string;
    to: string;
    weight?: number;
};

export type PetriNet = {
    places: Place[];
    transitions: Transition[];
    arcs: Arc[];
};

export type AlignmentMove = {
    moveType: 'sync' | 'model' | 'log';
    activity: string;
}

export type Marking = {
    [placeId: string]: number;
}

export type AlignmentState = {
    marking: Marking;
    traceIndex: number;
    cost: number;
}