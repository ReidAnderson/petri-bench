import * as d3 from 'd3';
import { type Graphviz, graphviz } from 'd3-graphviz';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

type Props = {
    dot: string;
    onZoomChange?: (k: number) => void;
    onTransitionClick?: (id: string) => void;
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

export const GraphvizViewer = forwardRef<GraphvizHandle, Props>(({ dot, onZoomChange, onTransitionClick }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gvRef = useRef<GraphvizInstance | null>(null);
    const cbRef = useRef(onZoomChange);
    useEffect(() => { cbRef.current = onZoomChange; }, [onZoomChange]);
    const transitionCbRef = useRef(onTransitionClick);
    useEffect(() => { transitionCbRef.current = onTransitionClick; }, [onTransitionClick]);

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

        // Delegate click from the SVG root to avoid multiple handlers per node
        // Clear any previous click handler in this namespace, then attach one
        svgSel.on('click.transitionClick', null);
        svgSel.on('click.transitionClick', (event: any) => {
            const target = event.target as Element | null;
            if (!target) return;
            const g = target.closest('g.node');
            if (!g) return;
            const hasEllipse = !!g.querySelector('ellipse');
            const hasPolygon = !!g.querySelector('polygon');
            if (hasPolygon && !hasEllipse) {
                const title = g.querySelector('title')?.textContent?.trim();
                if (title) transitionCbRef.current?.(title);
                event.stopPropagation();
            }
        });
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
            const container = containerRef.current;
            const svgEl = container?.querySelector('svg') as SVGSVGElement | null;
            if (!container || !svgEl) return null;
            return prepareSVGForExport(svgEl, container).svgString;
        },
        /**
         * Export the current SVG to a PNG blob.
         * This is done by rendering the SVG to a canvas with a white background,
         * then exporting the canvas to a PNG blob.
         * The canvas is scaled by devicePixelRatio for better quality on high-DPI screens.
         */
        async exportPNG() {
            const container = containerRef.current;
            const svgEl = container?.querySelector('svg') as SVGSVGElement | null;
            if (!container || !svgEl) return null;
            const prepared = prepareSVGForExport(svgEl, container);
            const blob = new Blob([prepared.svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            try {
                const img = await loadImage(url);
                const targetScale = getExportScale(prepared.width, prepared.height);
                const canvas = document.createElement('canvas');
                canvas.width = Math.ceil(prepared.width * targetScale);
                canvas.height = Math.ceil(prepared.height * targetScale);
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

const EXPORT_BASE_SCALE = 4;
const MAX_EXPORT_SCALE = 6;
const MAX_EXPORT_DIMENSION = 8192;

type GraphDatum = {
    attributes?: Record<string, string>;
    translation?: { x: number; y: number };
    scale?: number;
};

type PreparedSVG = {
    svgString: string;
    width: number;
    height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
}

function prepareSVGForExport(svgEl: SVGSVGElement, container: HTMLElement): PreparedSVG {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    resetGraphTransform(svgEl, clone);
    ensureViewBox(clone, container);
    const size = getSVGSize(clone, container);
    clone.setAttribute('width', String(size.width));
    clone.setAttribute('height', String(size.height));
    const serializer = new XMLSerializer();
    return { svgString: serializer.serializeToString(clone), width: size.width, height: size.height };
}

function resetGraphTransform(sourceSvg: SVGSVGElement, targetSvg: SVGSVGElement) {
    const sourceGraph = sourceSvg.querySelector('g');
    const targetGraph = targetSvg.querySelector('g');
    if (!sourceGraph || !targetGraph) return;
    const data = (sourceGraph as any).__data__ as GraphDatum | undefined;
    const baseTransform = data?.attributes?.transform;
    if (baseTransform) {
        targetGraph.setAttribute('transform', baseTransform);
        return;
    }
    if (data?.translation) {
        const scale = typeof data.scale === 'number' ? data.scale : 1;
        targetGraph.setAttribute('transform', `translate(${data.translation.x},${data.translation.y}) scale(${scale})`);
    } else {
        targetGraph.removeAttribute('transform');
    }
}

function ensureViewBox(svg: SVGSVGElement, container: HTMLElement) {
    if (svg.getAttribute('viewBox')) return;
    const intrinsic = getIntrinsicSize(svg, container);
    svg.setAttribute('viewBox', `0 0 ${intrinsic.width} ${intrinsic.height}`);
}

function getSVGSize(svg: SVGSVGElement, container: HTMLElement): { width: number; height: number } {
    const vb = svg.getAttribute('viewBox');
    if (vb) {
        const parts = vb
            .split(/\s+/)
            .map((p) => parseFloat(p))
            .filter((n) => !isNaN(n));
        if (parts.length === 4) {
            return { width: Math.max(parts[2], 1), height: Math.max(parts[3], 1) };
        }
    }
    return getIntrinsicSize(svg, container);
}

function getIntrinsicSize(svg: SVGSVGElement, container: HTMLElement): { width: number; height: number } {
    const widthAttr = parseLength(svg.getAttribute('width'));
    const heightAttr = parseLength(svg.getAttribute('height'));
    if (widthAttr && heightAttr) {
        return { width: widthAttr, height: heightAttr };
    }
    const rect = container.getBoundingClientRect();
    if (rect.width && rect.height) {
        return { width: rect.width, height: rect.height };
    }
    return { width: 1000, height: 600 };
}

function parseLength(value: string | null): number | null {
    if (!value) return null;
    const match = value.trim().match(/^([0-9.]+)([a-z%]*)$/i);
    if (!match) return null;
    const amount = parseFloat(match[1]);
    if (!isFinite(amount)) return null;
    const unit = match[2]?.toLowerCase();
    switch (unit) {
        case 'pt':
            return amount * (96 / 72);
        case 'pc':
            return amount * 16;
        case 'mm':
            return amount * (96 / 25.4);
        case 'cm':
            return amount * (96 / 2.54);
        case 'in':
            return amount * 96;
        case 'px':
        case '':
            return amount;
        default:
            return null;
    }
}

function getExportScale(width: number, height: number): number {
    const deviceScale = (window.devicePixelRatio || 1) * 2;
    const desired = Math.max(EXPORT_BASE_SCALE, deviceScale);
    const maxByWidth = MAX_EXPORT_DIMENSION / Math.max(width, 1);
    const maxByHeight = MAX_EXPORT_DIMENSION / Math.max(height, 1);
    const safeMax = Math.max(1, Math.min(maxByWidth, maxByHeight));
    return Math.max(1, Math.min(desired, MAX_EXPORT_SCALE, safeMax));
}
