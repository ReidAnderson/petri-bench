import * as d3 from 'd3';
import 'd3-graphviz';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

type Props = {
    dot: string;
};

export type GraphvizHandle = {
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    fit: () => void;
    exportSVG: () => string | null;
    exportPNG: () => Promise<Blob | null>;
};

// Access d3 graphviz extensions through any to avoid type issues

export const GraphvizViewer = forwardRef<GraphvizHandle, Props>(({ dot }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;

        // Initialize graphviz instance once per mount
        const selection = d3.select(container);
    const anySel: any = selection as any;
    anySel.graphviz({
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
    const anySel: any = selection as any;
    const gv = anySel.graphviz();
        if (!gv) return;
        gv.renderDot(dot);
    }, [dot]);

    useImperativeHandle(ref, () => ({
        zoomIn() {
            if (!containerRef.current) return;
            const selection = d3.select(containerRef.current) as any;
            const gv = (selection as any).graphviz?.();
            if (gv?.zoomScaleBy) gv.zoomScaleBy(selection, 1.2);
        },
        zoomOut() {
            if (!containerRef.current) return;
            const selection = d3.select(containerRef.current) as any;
            const gv = (selection as any).graphviz?.();
            if (gv?.zoomScaleBy) gv.zoomScaleBy(selection, 1 / 1.2);
        },
        resetZoom() {
            if (!containerRef.current) return;
            const selection = d3.select(containerRef.current) as any;
            const gv = (selection as any).graphviz?.();
            if (gv?.resetZoom) gv.resetZoom(selection);
        },
        fit() {
            if (!containerRef.current) return;
            const selection = d3.select(containerRef.current) as any;
            const gv = (selection as any).graphviz?.();
            if (gv?.fit) gv.fit();
        },
        exportSVG() {
            const svg = containerRef.current?.querySelector('svg');
            if (!svg) return null;
            const clone = svg.cloneNode(true) as SVGSVGElement;
            clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            const serializer = new XMLSerializer();
            return serializer.serializeToString(clone);
        },
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
