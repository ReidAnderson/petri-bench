import { useEffect, useMemo, useState } from 'react';
import Split from 'react-split';
import { GraphvizViewer } from './components/GraphvizViewer';
import { samplePetriNet } from './sample';
import { parsePetriNet, type PetriNetInput } from './utils/parser';
import { toDot, type RankDir } from './utils/toDot';
import { useDebounce } from './utils/useDebounce';

export default function App() {
    const [text, setText] = useState<string>(JSON.stringify(samplePetriNet, null, 2));
    const [error, setError] = useState<string | null>(null);
    const [rankdir, setRankdir] = useState<RankDir>('LR');

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
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
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
                    <GraphvizViewer dot={dot} />
                </div>
            </Split>
        </div>
    );
}
