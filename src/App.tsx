import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Split from 'react-split';
import { GraphvizViewer, type GraphvizHandle } from './components/GraphvizViewer';
import { samplePetriNet } from './sample';
import { computeAlignmentFitness, findOptimalAlignment } from './utils/alignment';
import { triggerDownload } from './utils/download';
import { parsePetriNet } from './utils/parser';
import { replayTransitionsDetailed } from './utils/simulate';
import { toDot, type RankDir } from './utils/toDot';
import { resolveTransitionRefs } from './utils/trace';
import type { AlignmentMove, PetriNetInput } from './utils/types';
import { useDebounce } from './utils/useDebounce';

function computePetriNet(text: string, transitions: string, rankdir: RankDir) {
    try {
        const parsed: PetriNetInput = parsePetriNet(text);
        // parse transitions sequence: accept comma/space/line separated ids or labels
        const refs = transitions
            .split(/[\,\n\r\t]+/)
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
}

export default function App() {
    const [text, setText] = useState<string>(JSON.stringify(samplePetriNet, null, 2));
    const [error, setError] = useState<string | null>(null);
    const [transitionsText, setTransitionsText] = useState<string>("T0, T1");
    const [rankdir, setRankdir] = useState<RankDir>('TB');
    const gvRef = useRef<GraphvizHandle | null>(null);
    const [zoom, setZoom] = useState(1);
    const [showAllWarnings, setShowAllWarnings] = useState(false);
    const [alignMoves, setAlignMoves] = useState<AlignmentMove[] | null>(null);
    const [alignCost, setAlignCost] = useState<number | null>(null);
    const [alignFitness, setAlignFitness] = useState<number | null>(null);

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
        return computePetriNet(debouncedText, debouncedTrans, rankdir)
    }, [debouncedText, debouncedTrans, rankdir]);

    useEffect(() => {
        setError(computed.error);
    }, [computed.error]);

    useEffect(() => {
        // no-op; dot recomputes via memo
    }, [computed.dot]);

    const onComputeAlignment = useCallback(() => {
        try {
            const parsed: PetriNetInput = parsePetriNet(text);
            // Use raw refs (ids or labels) for alignment matching
            const refs = transitionsText
                .split(/[\,\n\r\t]+/)
                .map((s) => s.trim())
                .filter(Boolean);
            const { alignment, cost } = findOptimalAlignment(refs, parsed);
            const fitness = computeAlignmentFitness(alignment, cost);
            setAlignMoves(alignment);
            setAlignCost(cost);
            setAlignFitness(fitness);
        } catch (e: any) {
            setError(e?.message ?? String(e));
            setAlignMoves(null);
            setAlignCost(null);
            setAlignFitness(null);
        }
    }, [text, transitionsText]);

    return (
        <div className="app-root">
            <Split className="split" sizes={[40, 60]} minSize={200} gutterSize={8}>
                <div className="pane left">
                    <div className="pane-header">Petri net (JSON or PNML)</div>
                    <textarea
                        className="editor"
                        data-testid="petri-input"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        spellCheck={false}
                    />
                    <div className="pane-header">Transitions (IDs or labels, comma/space separated)</div>
                    <textarea
                        className="editor"
                        data-testid="transitions-input"
                        value={transitionsText}
                        onChange={(e) => setTransitionsText(e.target.value)}
                        placeholder="Example: T0, T1, T2"
                        spellCheck={false}
                        style={styles.transitionsTextarea}
                    />
                    <div style={styles.alignmentControls}>
                        <button onClick={onComputeAlignment} style={btnStyle}>Calculate Alignment</button>
                        {alignFitness != null && (
                            <span style={styles.alignmentSummary}>
                                Cost: <strong>{alignCost}</strong> · Fitness: <strong>{alignFitness.toFixed(3)}</strong>
                            </span>
                        )}
                    </div>
                    {/* Inline hints for transitions */}
                    {(computed.unknown.length > 0 || computed.warnings.length > 0) && (
                        <div style={styles.warningsContainer}>
                            {computed.unknown.length > 0 && (
                                <div style={styles.unknownIDs}>Unknown IDs: {computed.unknown.join(', ')}</div>
                            )}
                            {computed.warnings.length > 0 && (
                                <div>
                                    Warnings: {computed.warnings.length}
                                    <ul style={styles.warningsList}>
                                        {(showAllWarnings ? computed.warnings : computed.warnings.slice(0, 3)).map((w, i) => (<li key={i}>{w}</li>))}
                                        {computed.warnings.length > 3 && (
                                            <li>
                                                <button onClick={() => setShowAllWarnings(!showAllWarnings)} style={styles.showMoreButton}>
                                                    {showAllWarnings ? '…show less' : `…and ${computed.warnings.length - 3} more`}
                                                </button>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                    {alignMoves && alignMoves.length > 0 && (
                        <div style={styles.alignmentContainer}>
                            <div style={styles.alignmentHeader}>Alignment</div>
                            <ol style={styles.alignmentList}>
                                {alignMoves.map((m, i) => (
                                    <li key={i}><code>{m.moveType}</code>: {m.activity}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                    {error && <div className="error">{error}</div>}
                </div>
                <div className="pane right">
                    <div className="pane-header">
                        <div style={styles.paneHeaderContent}>
                            <span>Graph</span>
                            <div style={styles.paneHeaderControls}>
                                <button title="Reset" onClick={() => gvRef.current?.resetZoom()} style={btnStyle}>100%</button>
                                <span style={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
                                <div style={styles.divider} />
                                <button title="Export SVG" onClick={onExportSVG} style={btnStyle}>SVG</button>
                                <button title="Export PNG" onClick={onExportPNG} style={btnStyle}>PNG</button>
                                <div style={styles.divider} />
                                <label htmlFor="rankdir" style={styles.directionLabel}>Direction</label>
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

const styles: Record<string, React.CSSProperties> = {
    transitionsTextarea: {
        flex: '0 0 auto',
        height: 80,
    },
    warningsContainer: {
        padding: '6px 12px',
        borderTop: '1px solid #1f2937',
        color: 'var(--muted)',
    },
    unknownIDs: {
        color: 'var(--error)',
    },
    warningsList: {
        margin: '4px 0 0 16px',
    },
    paneHeaderContent: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    paneHeaderControls: {
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    zoomValue: {
        color: 'var(--muted)',
        minWidth: 48,
        textAlign: 'center',
    },
    divider: {
        width: 1,
        height: 16,
        background: '#1f2937',
    },
    directionLabel: {
        color: 'var(--muted)',
    },
    showMoreButton: {
        background: 'none',
        border: 'none',
        color: 'var(--muted)',
        cursor: 'pointer',
        padding: 0,
        textDecoration: 'underline',
    },
    alignmentControls: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 0',
    },
    alignmentSummary: {
        color: 'var(--muted)'
    },
    alignmentContainer: {
        padding: '6px 12px',
        borderTop: '1px solid #1f2937',
    },
    alignmentHeader: {
        color: 'var(--muted)',
        marginBottom: 4,
    },
    alignmentList: {
        margin: '4px 0 0 18px',
    },
};

