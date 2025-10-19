export type Place = {
    id: string;
    label?: string;
    tokens?: number;
};

export type Transition = {
    id: string;
    label?: string;
};

export type Arc = {
    from: string;
    to: string;
    weight?: number;
};

export type PetriNetInput = {
    places: Place[];
    transitions: Transition[];
    arcs: Arc[];
};
