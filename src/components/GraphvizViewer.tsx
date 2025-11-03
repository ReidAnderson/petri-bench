import * as d3 from 'd3';
import { type Graphviz, graphviz } from 'd3-graphviz';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

type Props = {
    dot: string;
    onZoomChange?: (k: number) => void;
};

export type GraphvizHandle = {
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    fit: () => void;
    exportSVG: () => string | null;
    exportPNG: () => Promise<Blob | null>;
};

type D3Selection = d3.Selection<HTMLDivElement, unknown, null, undefined>;
type GraphvizInstance = Graphviz<HTMLDivElement, unknown, null, undefined>;

export const GraphvizViewer = forwardRef<GraphvizHandle, Props>(({ dot, onZoomChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gvRef = useRef<GraphvizInstance | null>(null);
    const cbRef = useRef(onZoomChange);
    useEffect(() => { cbRef.current = onZoomChange; }, [onZoomChange]);

    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const selection: D3Selection = d3.select(container);
        const gv = graphviz(container).options({
            useWorker: false,
            zoom: true,
            fit: true,
            engine: 'dot',
            images: true,
            // Support wasm assets from public/wasm; respect Vite base path
            wasmFolder: `${import.meta.env.BASE_URL}wasm`
        });
        gvRef.current = gv;

        return () => {
            // cleanup svg contents
            selection.selectAll('*').remove();
        };
    }, []);

    useEffect(() => {
        const gv = gvRef.current;
        if (!gv || !containerRef.current) return;
        gv.renderDot(dot);
        // Attach zoom listener to update scale label
        const svgSel = d3.select(containerRef.current).select('svg');
        const update = () => {
            const node = svgSel.node();
            if (!node) return;
            const t = d3.zoomTransform(node);
            if (typeof t?.k === 'number') cbRef.current?.(t.k);
        };
        svgSel.on('zoom.zoomLabel', update);
        // Update once after render
        setTimeout(update, 0);
    }, [dot]);

    useImperativeHandle(ref, () => ({
        zoomIn() {
            const gv = gvRef.current;
            if (gv) (gv as any).zoomScaleBy(d3.select(containerRef.current!), 1.2);
        },
        zoomOut() {
            const gv = gvRef.current;
            if (gv) (gv as any).zoomScaleBy(d3.select(containerRef.current!), 1 / 1.2);
        },
        resetZoom() {
            const gv = gvRef.current;
            if (gv) (gv as any).resetZoom(d3.select(containerRef.current!));
        },
        fit() {
            gvRef.current?.fit();
        },
        exportSVG() {
            const svg = containerRef.current?.querySelector('svg');
            if (!svg) return null;
            const clone = svg.cloneNode(true) as SVGSVGElement;
            clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            const serializer = new XMLSerializer();
            return serializer.serializeToString(clone);
        },
        /**
         * Export the current SVG to a PNG blob.
         * This is done by rendering the SVG to a canvas with a white background,
         * then exporting the canvas to a PNG blob.
         * The canvas is scaled by devicePixelRatio for better quality on high-DPI screens.
         */
        async exportPNG() {
            const svgEl = containerRef.current?.querySelector('svg') as SVGSVGElement | null;
            if (!svgEl) return null;
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgEl);
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            try {
                const img = await loadImage(url);
                const { width, height } = getSVGSize(svgEl, containerRef.current!);
                const scale = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
                const canvas = document.createElement('canvas');
                canvas.width = Math.ceil(width * scale);
                canvas.height = Math.ceil(height * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) return null;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
            } finally {
                URL.revokeObjectURL(url);
            }
        }
    }));

    return <div className="graphviz-container" ref={containerRef} />;
});

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
}

function getSVGSize(svg: SVGSVGElement, container: HTMLElement): { width: number; height: number } {
    const wAttr = svg.getAttribute('width');
    const hAttr = svg.getAttribute('height');
    if (wAttr && hAttr) {
        const w = parseFloat(wAttr);
        const h = parseFloat(hAttr);
        if (!isNaN(w) && !isNaN(h)) return { width: w, height: h };
    }
    const vb = svg.getAttribute('viewBox');
    if (vb) {
        const parts = vb.split(/\s+/).map((p) => parseFloat(p)).filter((n) => !isNaN(n));
        if (parts.length === 4) return { width: parts[2], height: parts[3] };
    }
    const rect = container.getBoundingClientRect();
    return { width: rect.width || 1000, height: rect.height || 600 };
}
