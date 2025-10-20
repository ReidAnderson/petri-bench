import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Split from 'react-split';
import { GraphvizViewer, type GraphvizHandle } from './components/GraphvizViewer';
import { samplePetriNet } from './sample';
import { parsePetriNet, type PetriNetInput } from './utils/parser';
import { toDot, type RankDir } from './utils/toDot';
import { useDebounce } from './utils/useDebounce';

export default function App() {
    const [text, setText] = useState<string>(JSON.stringify(samplePetriNet, null, 2));
    const [error, setError] = useState<string | null>(null);
    const [rankdir, setRankdir] = useState<RankDir>('LR');
    const gvRef = useRef<GraphvizHandle | null>(null);

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
    const dot = useMemo(() => {
        try {
            const parsed: PetriNetInput = parsePetriNet(debouncedText);
            setError(null);
            return toDot(parsed, { rankdir });
        } catch (e: any) {
            setError(e?.message ?? String(e));
            return 'digraph G { label="Invalid input" }';
        }
    }, [debouncedText, rankdir]);

    useEffect(() => {
        // no-op; dot recomputes via memo
    }, [dot]);

    return (
        <div className="app-root">
            <Split className="split" sizes={[40, 60]} minSize={200} gutterSize={8}>
                <div className="pane left">
                    <div className="pane-header">Petri net (JSON)</div>
                    <textarea
                        className="editor"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        spellCheck={false}
                    />
                    {error && <div className="error">{error}</div>}
                </div>
                <div className="pane right">
                    <div className="pane-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>Graph</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button title="Zoom out" onClick={() => gvRef.current?.zoomOut()} style={btnStyle}>-</button>
                                <button title="Reset" onClick={() => gvRef.current?.resetZoom()} style={btnStyle}>100%</button>
                                <button title="Zoom in" onClick={() => gvRef.current?.zoomIn()} style={btnStyle}>+</button>
                                <button title="Fit" onClick={() => gvRef.current?.fit()} style={btnStyle}>Fit</button>
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
                    <GraphvizViewer ref={gvRef} dot={dot} />
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

