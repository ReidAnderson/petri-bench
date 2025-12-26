import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Split from 'react-split';
import { GraphvizViewer, type GraphvizHandle } from './components/GraphvizViewer';
import { samplePetriNet } from './sample';
import { computeAlignmentFitness, findOptimalAlignment } from './utils/alignment';
import { triggerDownload } from './utils/download';
import { parsePetriNetByFormat } from './utils/parser';
import { replayTransitionsDetailed } from './utils/simulate';
import { toDot, type RankDir } from './utils/toDot';
import { toMermaid } from './utils/toMermaid';
import { toPNML } from './utils/toPNML';
import { resolveTransitionRefs } from './utils/trace';
import type { AlignmentMove, PetriNetInput } from './utils/types';
import { useDebounce } from './utils/useDebounce';

type DataFormat = 'json' | 'pnml' | 'dot' | 'mermaid';

function computePetriNet(text: string, transitions: string, rankdir: RankDir, inputFormat: DataFormat) {
    try {
        const parsed: PetriNetInput = parsePetriNetByFormat(text, inputFormat);
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
        return { dot, model: res.model, unknown: resolved.unknown, warnings: totalWarnings, error: null as string | null };
    } catch (e: any) {
        return { dot: 'digraph G { label="Invalid input" }', model: null as any, unknown: [] as string[], warnings: [] as string[], error: e?.message ?? String(e) };
    }
}

export default function App() {
    const [text, setText] = useState<string>(JSON.stringify(samplePetriNet, null, 2));
    const [error, setError] = useState<string | null>(null);
    const [transitionsText, setTransitionsText] = useState<string>("T0, T1");
    const [rankdir, setRankdir] = useState<RankDir>('TB');
    const [inputFormat, setInputFormat] = useState<DataFormat>('json');
    const [viewFormat, setViewFormat] = useState<DataFormat>('json');
    const gvRef = useRef<GraphvizHandle | null>(null);
    const [zoom, setZoom] = useState(1);
    const [showAllWarnings, setShowAllWarnings] = useState(false);
    const [alignMoves, setAlignMoves] = useState<AlignmentMove[] | null>(null);
    const [alignCost, setAlignCost] = useState<number | null>(null);
    const [alignFitness, setAlignFitness] = useState<number | null>(null);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
    const [isTransitionsCollapsed, setIsTransitionsCollapsed] = useState(false);
    const [isAlignmentCollapsed, setIsAlignmentCollapsed] = useState(false);

    // Formatting panel state (input/view)

    // Quick-add toolbar state
    type EditPanel = 'none' | 'place' | 'transition' | 'connect' | 'removePlace' | 'removeTransition';
    const [openPanel, setOpenPanel] = useState<EditPanel>('none');
    // Add Place form
    const [placeId, setPlaceId] = useState('');
    const [placeLabel, setPlaceLabel] = useState('');
    const [placeTokens, setPlaceTokens] = useState<string>('0');
    // Add Transition form
    const [transId, setTransId] = useState('');
    const [transLabel, setTransLabel] = useState('');
    // Connect form
    const [connDir, setConnDir] = useState<'PT' | 'TP'>('PT');
    const [connPlaceId, setConnPlaceId] = useState('');
    const [connTransId, setConnTransId] = useState('');
    const [connWeight, setConnWeight] = useState<string>('1');
    // Undo history of text states (simple stack, last entry is previous state)
    const [history, setHistory] = useState<string[]>([]);
    const maxHistory = 20;
    // Focus refs for keyboard shortcuts
    const placeIdRef = useRef<HTMLInputElement | null>(null);
    const transIdRef = useRef<HTMLInputElement | null>(null);
    const connPlaceRef = useRef<HTMLSelectElement | null>(null);
    const connTransRef = useRef<HTMLSelectElement | null>(null);
    const removePlaceRef = useRef<HTMLSelectElement | null>(null);
    const removeTransRef = useRef<HTMLSelectElement | null>(null);

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
        return computePetriNet(debouncedText, debouncedTrans, rankdir, inputFormat)
    }, [debouncedText, debouncedTrans, rankdir, inputFormat]);

    const displayText = useMemo(() => {
        if (!computed.model) return text;
        switch (viewFormat) {
            case 'json':
                return JSON.stringify(computed.model, null, 2);
            case 'pnml':
                return toPNML(computed.model);
            case 'dot':
                return toDot(computed.model, { rankdir });
            case 'mermaid':
                return toMermaid(computed.model, { direction: rankdir });
            default:
                return text;
        }
    }, [computed.model, viewFormat, rankdir, text]);

    useEffect(() => {
        setError(computed.error);
    }, [computed.error]);

    useEffect(() => {
        // no-op; dot recomputes via memo
    }, [computed.dot]);

    const onComputeAlignment = useCallback(() => {
        try {
            const parsed: PetriNetInput = parsePetriNetByFormat(text, inputFormat);
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
    }, [text, transitionsText, inputFormat]);

    // --- Editing helpers ---
    const isEditableJSON = viewFormat === 'json' && inputFormat === 'json';

    const tryParseModel = useCallback((t: string): PetriNetInput | null => {
        try {
            return parsePetriNetByFormat(t, inputFormat);
        } catch {
            return null;
        }
    }, [inputFormat]);

    const currentModel = useMemo(() => tryParseModel(text), [text, tryParseModel]);

    const stringifyModel = (m: PetriNetInput) => JSON.stringify(m, null, 2);

    const nextPlaceId = (m: PetriNetInput) => {
        const base = 'P';
        const used = new Set(m.places.map(p => p.id));
        let n = 0;
        while (used.has(`${base}${n}`)) n++;
        return `${base}${n}`;
    };
    const nextTransitionId = (m: PetriNetInput) => {
        const base = 'T';
        const used = new Set(m.transitions.map(p => p.id));
        let n = 0;
        while (used.has(`${base}${n}`)) n++;
        return `${base}${n}`;
    };

    // Reset and prefill forms when panel opens or model changes
    useEffect(() => {
        if (!currentModel) return;
        if (openPanel === 'place') {
            setPlaceId(nextPlaceId(currentModel));
            setPlaceLabel('');
            setPlaceTokens('0');
            setTimeout(() => placeIdRef.current?.focus(), 0);
        } else if (openPanel === 'transition') {
            setTransId(nextTransitionId(currentModel));
            setTransLabel('');
            setTimeout(() => transIdRef.current?.focus(), 0);
        } else if (openPanel === 'connect') {
            setConnDir('PT');
            setConnWeight('1');
            const lastPlaceId = currentModel.places[currentModel.places.length - 1]?.id ?? '';
            const lastTransId = currentModel.transitions[currentModel.transitions.length - 1]?.id ?? '';
            setConnPlaceId(lastPlaceId);
            setConnTransId(lastTransId);
            setTimeout(() => connPlaceRef.current?.focus(), 0);
        } else if (openPanel === 'removePlace') {
            setConnPlaceId(currentModel.places[0]?.id ?? '');
            setTimeout(() => removePlaceRef.current?.focus(), 0);
        } else if (openPanel === 'removeTransition') {
            setConnTransId(currentModel.transitions[0]?.id ?? '');
            setTimeout(() => removeTransRef.current?.focus(), 0);
        }
    }, [openPanel, currentModel]);

    // Keyboard shortcuts: Alt+P (Place), Alt+T (Transition), Alt+C (Connect), Alt+D (Remove Place), Alt+R (Remove Transition)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Avoid interfering with text entry when Ctrl/Meta present
            if (!e.altKey || e.ctrlKey || e.metaKey) return;
            const k = e.key.toLowerCase();
            if (k === 'p') {
                e.preventDefault();
                setOpenPanel('place');
            } else if (k === 't') {
                e.preventDefault();
                setOpenPanel('transition');
            } else if (k === 'c') {
                e.preventDefault();
                setOpenPanel('connect');
            } else if (k === 'd') {
                e.preventDefault();
                setOpenPanel('removePlace');
            } else if (k === 'r') {
                e.preventDefault();
                setOpenPanel('removeTransition');
            } else if (k === 'z') {
                e.preventDefault();
                onUndo();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const onConvertInputToJSON = useCallback(() => {
        try {
            const model = parsePetriNetByFormat(text, inputFormat);
            setText(stringifyModel(model));
            setInputFormat('json');
            setViewFormat('json');
            setError(null);
        } catch (e: any) {
            setError(e?.message ?? String(e));
        }
    }, [text, inputFormat]);

    const onApplyViewAsInput = useCallback(() => {
        try {
            if (!computed.model) return;
            let nextText = displayText;
            setText(nextText);
            setInputFormat(viewFormat);
            setError(null);
        } catch (e: any) {
            setError(e?.message ?? String(e));
        }
    }, [computed.model, displayText, viewFormat]);

    const submitAddPlace = useCallback(() => {
        if (!currentModel) return;
        const id = placeId.trim();
        if (!id) { setError('Place id is required.'); return; }
        if (currentModel.places.some(p => p.id === id) || currentModel.transitions.some(t => t.id === id)) {
            setError(`ID already exists: ${id}`);
            return;
        }
        const tokens = Math.max(0, Number.isFinite(Number(placeTokens)) ? Number(placeTokens) : 0);
        const place: any = { id };
        if (placeLabel.trim()) place.label = placeLabel.trim();
        if (tokens > 0) place.tokens = tokens;
        const model: PetriNetInput = {
            places: [...currentModel.places, place],
            transitions: currentModel.transitions.slice(),
            arcs: currentModel.arcs.slice(),
        };
        // push current text to history before mutating
        setHistory(h => (h.length >= maxHistory ? [...h.slice(1), text] : [...h, text]));
        setText(stringifyModel(model));
        // Open connect with preselected place
        setOpenPanel('connect');
        setConnDir('PT');
        setConnPlaceId(id);
        const lastTransId = currentModel.transitions[currentModel.transitions.length - 1]?.id ?? '';
        setConnTransId(lastTransId);
        setError(null);
    }, [currentModel, placeId, placeLabel, placeTokens]);

    const submitAddTransition = useCallback(() => {
        if (!currentModel) return;
        const id = transId.trim();
        if (!id) { setError('Transition id is required.'); return; }
        if (currentModel.places.some(p => p.id === id) || currentModel.transitions.some(t => t.id === id)) {
            setError(`ID already exists: ${id}`);
            return;
        }
        const t: any = { id };
        if (transLabel.trim()) t.label = transLabel.trim();
        const model: PetriNetInput = {
            places: currentModel.places.slice(),
            transitions: [...currentModel.transitions, t],
            arcs: currentModel.arcs.slice(),
        };
        // push current text to history before mutating
        setHistory(h => (h.length >= maxHistory ? [...h.slice(1), text] : [...h, text]));
        setText(stringifyModel(model));
        // Open connect with preselected transition
        setOpenPanel('connect');
        setConnDir('TP');
        setConnTransId(id);
        const lastPlaceId = currentModel.places[currentModel.places.length - 1]?.id ?? '';
        setConnPlaceId(lastPlaceId);
        setError(null);
    }, [currentModel, transId, transLabel]);

    const submitConnect = useCallback(() => {
        if (!currentModel) return;
        const pId = connPlaceId.trim();
        const tId = connTransId.trim();
        if (!pId || !tId) { setError('Select a place and a transition.'); return; }
        const weightVal = Math.max(1, Number.isFinite(Number(connWeight)) ? Number(connWeight) : 1);
        const from = connDir === 'PT' ? pId : tId;
        const to = connDir === 'PT' ? tId : pId;
        // Prevent duplicate exact same arc (same from,to)
        const exists = currentModel.arcs.some(a => a.from === from && a.to === to);
        if (exists) {
            setError('Arc already exists.');
            return;
        }
        const newArc: any = { from, to };
        if (weightVal > 1) newArc.weight = weightVal;
        const model: PetriNetInput = {
            places: currentModel.places.slice(),
            transitions: currentModel.transitions.slice(),
            arcs: [...currentModel.arcs, newArc],
        };
        // push current text to history before mutating
        setHistory(h => (h.length >= maxHistory ? [...h.slice(1), text] : [...h, text]));
        setText(stringifyModel(model));
        setOpenPanel('none');
        setError(null);
    }, [currentModel, connDir, connPlaceId, connTransId, connWeight, text]);

    const onUndo = useCallback(() => {
        setHistory(h => {
            if (h.length === 0) return h;
            const prev = h[h.length - 1];
            setText(prev);
            setOpenPanel('none');
            setError(null);
            return h.slice(0, -1);
        });
    }, []);

    const submitRemove = useCallback((kind: 'place' | 'transition', id: string) => {
        if (!currentModel) return;
        const targetId = id.trim();
        if (!targetId) { setError('Select an item to remove.'); return; }
        const hasTarget = kind === 'place'
            ? currentModel.places.some(p => p.id === targetId)
            : currentModel.transitions.some(t => t.id === targetId);
        if (!hasTarget) { setError(`${kind} not found: ${targetId}`); return; }
        const nextModel: PetriNetInput = {
            places: kind === 'place' ? currentModel.places.filter(p => p.id !== targetId) : currentModel.places.slice(),
            transitions: kind === 'transition' ? currentModel.transitions.filter(t => t.id !== targetId) : currentModel.transitions.slice(),
            arcs: currentModel.arcs.filter(a => a.from !== targetId && a.to !== targetId),
        };
        // push current text to history before mutating
        setHistory(h => (h.length >= maxHistory ? [...h.slice(1), text] : [...h, text]));
        setText(stringifyModel(nextModel));
        setOpenPanel('none');
        setError(null);
    }, [currentModel, text]);

    return (
        <div className="app-root">
            <Split className="split" sizes={[40, 60]} minSize={200} gutterSize={8}>
                <div className="pane left">
                    <div style={styles.toolbarContainer}>
                        <div style={styles.toolbarHeader}>Edit</div>
                        {!isEditableJSON ? (
                            <div style={styles.convertHint}>
                                Editing is available for JSON nets. Convert input to JSON?
                                <button onClick={onConvertInputToJSON} style={{ ...btnStyle, marginLeft: 8 }}>Convert</button>
                            </div>
                        ) : !currentModel ? (
                            <div style={styles.convertHint}>Fix input errors to enable editing.</div>
                        ) : (
                            <div style={styles.toolbarButtons}>
                                <button style={btnStyle} onClick={() => setOpenPanel(openPanel === 'place' ? 'none' : 'place')}>+ Place</button>
                                <button style={btnStyle} onClick={() => setOpenPanel(openPanel === 'transition' ? 'none' : 'transition')}>+ Transition</button>
                                <button style={btnStyle} onClick={() => setOpenPanel(openPanel === 'connect' ? 'none' : 'connect')}>Connect</button>
                                <button style={btnStyle} onClick={() => setOpenPanel(openPanel === 'removePlace' ? 'none' : 'removePlace')}>Remove Place</button>
                                <button style={btnStyle} onClick={() => setOpenPanel(openPanel === 'removeTransition' ? 'none' : 'removeTransition')}>Remove Transition</button>
                                <div style={{ marginLeft: 'auto' }} />
                                <button style={btnStyle} onClick={onUndo} disabled={history.length === 0} title={history.length ? `Undo (${history.length})` : 'Undo'}>Undo</button>
                            </div>
                        )}
                        {currentModel && (
                            <div style={styles.shortcutHints}>
                                <span style={styles.shortcutHintLabel}>Shortcuts:</span>
                                <code>Alt+P</code> Place · <code>Alt+T</code> Transition · <code>Alt+C</code> Connect · <code>Alt+D</code> Remove Place · <code>Alt+R</code> Remove Transition · <code>Alt+Z</code> Undo
                            </div>
                        )}

                        {/* Inline forms */}
                        {currentModel && openPanel === 'place' && (
                            <div style={styles.formCard}>
                                <div style={styles.formRow}>
                                    <label style={styles.formLabel}>ID</label>
                                    <input ref={placeIdRef} value={placeId} onChange={(e) => setPlaceId(e.target.value)} style={styles.input} />
                                </div>
                                <div style={styles.formRow}>
                                    <label style={styles.formLabel}>Label</label>
                                    <input value={placeLabel} onChange={(e) => setPlaceLabel(e.target.value)} style={styles.input} />
                                </div>
                                <div style={styles.formRow}>
                                    <label style={styles.formLabel}>Tokens</label>
                                    <input value={placeTokens} onChange={(e) => setPlaceTokens(e.target.value)} style={{ ...styles.input, width: 80 }} inputMode="numeric" />
                                </div>
                                <div style={styles.formActions}>
                                    <button style={btnStyle} onClick={submitAddPlace}>Add</button>
                                    <button style={btnStyle} onClick={() => setOpenPanel('none')}>Cancel</button>
                                </div>
                            </div>
                        )}
                        {currentModel && openPanel === 'transition' && (
                            <div style={styles.formCard}>
                                <div style={styles.formRow}>
                                    <label style={styles.formLabel}>ID</label>
                                    <input ref={transIdRef} value={transId} onChange={(e) => setTransId(e.target.value)} style={styles.input} />
                                </div>
                                <div style={styles.formRow}>
                                    <label style={styles.formLabel}>Label</label>
                                    <input value={transLabel} onChange={(e) => setTransLabel(e.target.value)} style={styles.input} />
                                </div>
                                <div style={styles.formActions}>
                                    <button style={btnStyle} onClick={submitAddTransition}>Add</button>
                                    <button style={btnStyle} onClick={() => setOpenPanel('none')}>Cancel</button>
                                </div>
                            </div>
                        )}
                        {currentModel && openPanel === 'connect' && (
                            <div style={styles.formCard}>
                                <div style={styles.formRow}>
                                    <label style={styles.formLabel}>Direction</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <label><input type="radio" checked={connDir === 'PT'} name="direction" onChange={() => { setConnDir('PT'); setTimeout(() => connPlaceRef.current?.focus(), 0); }} /> P → T</label>
                                        <label><input type="radio" checked={connDir === 'TP'} name="direction" onChange={() => { setConnDir('TP'); setTimeout(() => connTransRef.current?.focus(), 0); }} /> T → P</label>
                                    </div>
                                </div>
                                {/* Arc preview */}
                                <div style={styles.arcPreview}>
                                    <strong>Arc:</strong> {connDir === 'PT' ? connPlaceId || '—' : connTransId || '—'} → {connDir === 'PT' ? connTransId || '—' : connPlaceId || '—'}
                                </div>
                                {connDir === 'PT' ? (
                                    <>
                                        <div style={styles.formRow}>
                                            <label style={styles.formLabel}>Source Place</label>
                                            <select ref={connPlaceRef} value={connPlaceId} onChange={(e) => setConnPlaceId(e.target.value)} style={{ ...styles.input, padding: '6px 8px', fontSize: 14 }}>
                                                {currentModel.places.map(p => (
                                                    <option key={p.id} value={p.id}>{p.label ? `${p.label} (${p.id})` : p.id}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={styles.formRow}>
                                            <label style={styles.formLabel}>Target Transition</label>
                                            <select ref={connTransRef} value={connTransId} onChange={(e) => setConnTransId(e.target.value)} style={{ ...styles.input, padding: '6px 8px', fontSize: 14 }}>
                                                {currentModel.transitions.map(t => (
                                                    <option key={t.id} value={t.id}>{t.label ? `${t.label} (${t.id})` : t.id}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={styles.formRow}>
                                            <label style={styles.formLabel}>Source Transition</label>
                                            <select ref={connTransRef} value={connTransId} onChange={(e) => setConnTransId(e.target.value)} style={{ ...styles.input, padding: '6px 8px', fontSize: 14 }}>
                                                {currentModel.transitions.map(t => (
                                                    <option key={t.id} value={t.id}>{t.label ? `${t.label} (${t.id})` : t.id}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={styles.formRow}>
                                            <label style={styles.formLabel}>Target Place</label>
                                            <select ref={connPlaceRef} value={connPlaceId} onChange={(e) => setConnPlaceId(e.target.value)} style={{ ...styles.input, padding: '6px 8px', fontSize: 14 }}>
                                                {currentModel.places.map(p => (
                                                    <option key={p.id} value={p.id}>{p.label ? `${p.label} (${p.id})` : p.id}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <div style={styles.formRow}>
                                    <label style={styles.formLabel}>Weight</label>
                                    <input value={connWeight} onChange={(e) => setConnWeight(e.target.value)} style={{ ...styles.input, width: 80 }} inputMode="numeric" />
                                </div>
                                <div style={styles.formActions}>
                                    <button style={btnStyle} onClick={submitConnect}>Add</button>
                                    <button style={btnStyle} onClick={() => setOpenPanel('none')}>Cancel</button>
                                </div>
                            </div>
                        )}
                        {currentModel && openPanel === 'removePlace' && (
                            <div style={styles.formCard}>
                                <div style={styles.formRow}>
                                    <label style={styles.formLabel}>Place</label>
                                    <select ref={removePlaceRef} value={connPlaceId} onChange={(e) => setConnPlaceId(e.target.value)} style={{ ...styles.input, padding: '6px 8px', fontSize: 14 }}>
                                        {currentModel.places.map(p => (
                                            <option key={p.id} value={p.id}>{p.label ? `${p.label} (${p.id})` : p.id}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.formActions}>
                                    <button style={btnStyle} onClick={() => submitRemove('place', connPlaceId)}>Remove</button>
                                    <button style={btnStyle} onClick={() => setOpenPanel('none')}>Cancel</button>
                                </div>
                            </div>
                        )}
                        {currentModel && openPanel === 'removeTransition' && (
                            <div style={styles.formCard}>
                                <div style={styles.formRow}>
                                    <label style={styles.formLabel}>Transition</label>
                                    <select ref={removeTransRef} value={connTransId} onChange={(e) => setConnTransId(e.target.value)} style={{ ...styles.input, padding: '6px 8px', fontSize: 14 }}>
                                        {currentModel.transitions.map(t => (
                                            <option key={t.id} value={t.id}>{t.label ? `${t.label} (${t.id})` : t.id}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.formActions}>
                                    <button style={btnStyle} onClick={() => submitRemove('transition', connTransId)}>Remove</button>
                                    <button style={btnStyle} onClick={() => setOpenPanel('none')}>Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="pane-header">Petri net (Input/View Formats)</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 12px' }}>
                        <label style={styles.directionLabel}>Input:</label>
                        <select className="select" value={inputFormat} onChange={(e) => setInputFormat(e.target.value as DataFormat)}>
                            <option value="json">JSON</option>
                            <option value="pnml">PNML</option>
                            <option value="dot">DOT</option>
                            <option value="mermaid">Mermaid</option>
                        </select>
                        <label style={{ ...styles.directionLabel, marginLeft: 8 }}>View as:</label>
                        <select className="select" value={viewFormat} onChange={(e) => setViewFormat(e.target.value as DataFormat)}>
                            <option value="json">JSON</option>
                            <option value="pnml">PNML</option>
                            <option value="dot">DOT</option>
                            <option value="mermaid">Mermaid</option>
                        </select>
                        {viewFormat !== inputFormat && (
                            <button style={{ ...btnStyle, marginLeft: 8 }} onClick={onApplyViewAsInput}>Make View the Input</button>
                        )}
                    </div>
                    <textarea
                        className="editor"
                        data-testid="petri-input"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        spellCheck={false}
                    />
                    <div className="pane-header" style={styles.collapsibleHeader}>
                        <span>View Preview ({viewFormat.toUpperCase()})</span>
                        <button
                            style={btnStyle}
                            onClick={() => setIsPreviewCollapsed((prev) => !prev)}
                            aria-expanded={!isPreviewCollapsed}
                        >
                            {isPreviewCollapsed ? 'Expand' : 'Collapse'}
                        </button>
                    </div>
                    {!isPreviewCollapsed && (
                        <textarea
                            className="editor"
                            value={displayText}
                            readOnly
                            spellCheck={false}
                            style={{ ...styles.transitionsTextarea, height: 120 }}
                        />
                    )}
                    <div className="pane-header" style={styles.collapsibleHeader}>
                        <span>Transitions (IDs or labels, comma/space separated)</span>
                        <button
                            style={btnStyle}
                            onClick={() => setIsTransitionsCollapsed((prev) => !prev)}
                            aria-expanded={!isTransitionsCollapsed}
                        >
                            {isTransitionsCollapsed ? 'Expand' : 'Collapse'}
                        </button>
                    </div>
                    {!isTransitionsCollapsed && (
                        <textarea
                            className="editor"
                            data-testid="transitions-input"
                            value={transitionsText}
                            onChange={(e) => setTransitionsText(e.target.value)}
                            placeholder="Example: T0, T1, T2"
                            spellCheck={false}
                            style={styles.transitionsTextarea}
                        />
                    )}
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
                            <div style={styles.collapsibleHeader}>
                                <span style={styles.alignmentHeader}>Alignment</span>
                                <button
                                    style={btnStyle}
                                    onClick={() => setIsAlignmentCollapsed((prev) => !prev)}
                                    aria-expanded={!isAlignmentCollapsed}
                                >
                                    {isAlignmentCollapsed ? 'Expand' : 'Collapse'}
                                </button>
                            </div>
                            {!isAlignmentCollapsed && (
                                <ol style={styles.alignmentList}>
                                    {alignMoves.map((m, i) => (
                                        <li key={i}><code>{m.moveType}</code>: {m.activity}</li>
                                    ))}
                                </ol>
                            )}
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
                    <GraphvizViewer
                        ref={gvRef}
                        dot={computed.dot}
                        onZoomChange={setZoom}
                        onTransitionClick={(id) => setTransitionsText((prev) => prev ? `${prev}, ${id}` : id)}
                    />
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
    toolbarContainer: {
        padding: '6px 12px',
        borderBottom: '1px solid #1f2937',
    },
    toolbarHeader: {
        color: 'var(--muted)'
    },
    toolbarButtons: {
        display: 'flex',
        gap: 8,
        marginTop: 6,
        flexWrap: 'wrap'
    },
    convertHint: {
        marginTop: 6,
        color: 'var(--muted)'
    },
    formCard: {
        marginTop: 8,
        padding: 8,
        border: '1px solid #1f2937',
        borderRadius: 6,
        background: '#0b1228',
    },
    formRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    formLabel: {
        width: 88,
        color: 'var(--muted)'
    },
    input: {
        flex: '1 1 auto',
        background: 'transparent',
        border: '1px solid #1f2937',
        color: 'var(--text)',
        padding: '4px 6px',
        borderRadius: 4,
    },
    formActions: {
        display: 'flex',
        gap: 8,
        marginTop: 8,
        justifyContent: 'flex-end'
    },
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
    collapsibleHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
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
    arcPreview: {
        marginTop: 6,
        padding: '4px 6px',
        background: '#0b1228',
        border: '1px solid #1f2937',
        borderRadius: 4,
        fontSize: 12,
        color: 'var(--muted)'
    },
    shortcutHints: {
        marginTop: 4,
        fontSize: 11,
        color: 'var(--muted)',
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap'
    },
    shortcutHintLabel: {
        fontWeight: 600,
        color: 'var(--muted)'
    },
};

