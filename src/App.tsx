import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Split from 'react-split';
import { GraphvizViewer, type GraphvizHandle } from './components/GraphvizViewer';
import { samplePetriNet } from './sample';
import { parsePetriNet } from './utils/parser';
import { replayTransitionsDetailed } from './utils/simulate';
import { toDot, type RankDir } from './utils/toDot';
import { resolveTransitionRefs } from './utils/trace';
import type { PetriNetInput } from './utils/types';
import { useDebounce } from './utils/useDebounce';

export default function App() {
    const [text, setText] = useState<string>(JSON.stringify(samplePetriNet, null, 2));
    const [error, setError] = useState<string | null>(null);
    const [transitionsText, setTransitionsText] = useState<string>("T0, T1");
    const [rankdir, setRankdir] = useState<RankDir>('TB');
    const gvRef = useRef<GraphvizHandle | null>(null);
    const [zoom, setZoom] = useState(1);

    const onExportSVG = useCallback(() => {
        const svg = gvRef.current?.exportSVG();
        if (!svg) return;
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, 'petri-net.svg');
    }, []);

    const onExportPNG = useCallback(async () => {
        const pngBlob = await gvRef.current?.exportPNG();
        if (!pngBlob) return;
        const url = URL.createObjectURL(pngBlob);
        triggerDownload(url, 'petri-net.png');
    }, []);

    const debouncedText = useDebounce(text, 300);
    const debouncedTrans = useDebounce(transitionsText, 300);
    const computed = useMemo(() => {
        try {
            const parsed: PetriNetInput = parsePetriNet(debouncedText);
            // parse transitions sequence: accept comma/space/line separated ids or labels
            const refs = debouncedTrans
                .split(/[\,\n\r\t\s]+/)
                .map((s) => s.trim())
                .filter(Boolean);
            const resolved = resolveTransitionRefs(parsed, refs);
            const seq = resolved.ids;
            // Non-strict by default: skip invalid firings but continue
            const res = seq.length ? replayTransitionsDetailed(parsed, seq, { strict: false }) : { model: parsed, warnings: [] as string[] };
            const totalWarnings = [...resolved.warnings, ...res.warnings];
            const label = refs.length ? `Applied: ${refs.join(' → ')}${totalWarnings.length ? `\n(${totalWarnings.length} warning${totalWarnings.length > 1 ? 's' : ''})` : ''}` : undefined;
            const dot = toDot(res.model, { rankdir, label });
            return { dot, unknown: resolved.unknown, warnings: totalWarnings, error: null as string | null };
        } catch (e: any) {
            return { dot: 'digraph G { label="Invalid input" }', unknown: [] as string[], warnings: [] as string[], error: e?.message ?? String(e) };
        }
    }, [debouncedText, debouncedTrans, rankdir]);

    useEffect(() => {
        setError(computed.error);
    }, [computed.error]);

    useEffect(() => {
        // no-op; dot recomputes via memo
    }, [computed.dot]);

    return (
        <div className="app-root">
            <Split className="split" sizes={[40, 60]} minSize={200} gutterSize={8}>
                <div className="pane left">
                    <div className="pane-header">Petri net (JSON or PNML)</div>
                    <textarea
                        className="editor"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        spellCheck={false}
                    />
                    <div className="pane-header">Transitions (IDs, comma/space separated)</div>
                    <textarea
                        className="editor"
                        value={transitionsText}
                        onChange={(e) => setTransitionsText(e.target.value)}
                        placeholder="Example: T0, T1, T2"
                        spellCheck={false}
                        style={{ flex: '0 0 auto', height: 80 }}
                    />
                    {/* Inline hints for transitions */}
                    {(computed.unknown.length > 0 || computed.warnings.length > 0) && (
                        <div style={{ padding: '6px 12px', borderTop: '1px solid #1f2937', color: 'var(--muted)' }}>
                            {computed.unknown.length > 0 && (
                                <div style={{ color: 'var(--error)' }}>Unknown IDs: {computed.unknown.join(', ')}</div>
                            )}
                            {computed.warnings.length > 0 && (
                                <div>
                                    Warnings: {computed.warnings.length}
                                    <ul style={{ margin: '4px 0 0 16px' }}>
                                        {computed.warnings.slice(0, 3).map((w, i) => (<li key={i}>{w}</li>))}
                                        {computed.warnings.length > 3 && <li>…and {computed.warnings.length - 3} more</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                    {error && <div className="error">{error}</div>}
                </div>
                <div className="pane right">
                    <div className="pane-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>Graph</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button title="Reset" onClick={() => gvRef.current?.resetZoom()} style={btnStyle}>100%</button>
                                <span style={{ color: 'var(--muted)', minWidth: 48, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                                <div style={{ width: 1, height: 16, background: '#1f2937' }} />
                                <button title="Export SVG" onClick={onExportSVG} style={btnStyle}>SVG</button>
                                <button title="Export PNG" onClick={onExportPNG} style={btnStyle}>PNG</button>
                                <div style={{ width: 1, height: 16, background: '#1f2937' }} />
                                <label htmlFor="rankdir" style={{ color: 'var(--muted)' }}>Direction</label>
                                <select
                                    id="rankdir"
                                    className="select"
                                    value={rankdir}
                                    onChange={(e) => setRankdir(e.target.value as RankDir)}
                                >
                                    <option value="LR">LR (Left → Right)</option>
                                    <option value="TB">TB (Top → Bottom)</option>
                                    <option value="RL">RL (Right → Left)</option>
                                    <option value="BT">BT (Bottom → Top)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <GraphvizViewer ref={gvRef} dot={computed.dot} onZoomChange={setZoom} />
                </div>
            </Split>
        </div>
    );
}

const btnStyle: React.CSSProperties = {
    background: '#0b1228',
    border: '1px solid #1f2937',
    color: 'var(--text)',
    padding: '4px 8px',
    borderRadius: 4,
    cursor: 'pointer'
};

function triggerDownload(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

