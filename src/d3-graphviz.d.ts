declare module 'd3-graphviz' {
    import { Selection } from 'd3-selection';

    export interface Graphviz<GElement extends Element, Datum, PElement extends Element, PDatum> {
        (selection: Selection<GElement, Datum, PElement, PDatum>): this;
        renderDot(dot: string): this;
        zoomScaleBy(selection: Selection<GElement, Datum, PElement, PDatum>, scale: number): this;
        resetZoom(selection: Selection<GElement, Datum, PElement, PDatum>): this;
        fit(): this;
    }

    export function graphviz<GElement extends Element, Datum, PElement extends Element, PDatum>(selector: string | GElement): Graphviz<GElement, Datum, PElement, PDatum>;
}
