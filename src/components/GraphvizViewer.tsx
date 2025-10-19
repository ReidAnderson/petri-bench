import * as d3 from 'd3';
import 'd3-graphviz';
import { useEffect, useRef } from 'react';

type Props = {
    dot: string;
};

// d3-graphviz augments d3 with graphviz() method; types are not bundled
declare module 'd3' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export function select(selector: any): any;
}

export function GraphvizViewer({ dot }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;

        // Initialize graphviz instance once per mount
        const selection = d3.select(container);
        // @ts-expect-error - graphviz() is injected by d3-graphviz
            const gv = selection.graphviz({
            useWorker: false,
            zoom: true,
            fit: true,
            engine: 'dot',
            images: true,
                // Support wasm assets from public/wasm; respect Vite base path
                wasmFolder: `${import.meta.env.BASE_URL}wasm`
        });

        return () => {
            // cleanup svg contents
            selection.selectAll('*').remove();
        };
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const selection = d3.select(containerRef.current);
        // @ts-expect-error - graphviz() is injected by d3-graphviz
        const gv = selection.graphviz();
        if (!gv) return;
        gv.renderDot(dot);
    }, [dot]);

    return <div className="graphviz-container" ref={containerRef} />;
}
