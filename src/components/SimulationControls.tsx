import { FileUploadResult, Place, Transition } from '@/types'
import { parsePNML } from '@/utils/pnmlParser'
import { Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface SimulationControlsProps {
    onRunSimulation: (steps: number) => void
    onStepOnce: () => void
    onReset: () => void
    onFileUpload: (result: FileUploadResult) => void
    isLoading: boolean
    currentFileName?: string
    selectedPlace?: Place | null
    selectedTransition?: Transition | null
    onUpdatePlace?: (id: string, changes: Partial<Place>) => void
    onUpdateTransition?: (id: string, changes: Partial<Transition>) => void
    onClearSelection?: () => void
}

const SimulationControls: React.FC<SimulationControlsProps> = ({
    onRunSimulation,
    onStepOnce,
    onReset,
    onFileUpload,
    isLoading,
    currentFileName = 'default_petri_net.pnml',
    selectedPlace = null,
    selectedTransition = null,
    onUpdatePlace,
    onUpdateTransition,
    onClearSelection,
}) => {
    const [steps, setSteps] = useState(20)
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Local edit state for Modify & Tweak
    const [placeId, setPlaceId] = useState('')
    const [placeName, setPlaceName] = useState('')
    const [placeTokens, setPlaceTokens] = useState<string>('0')
    const [placeMaxTokens, setPlaceMaxTokens] = useState<string>('')

    const [transitionId, setTransitionId] = useState('')
    const [transitionName, setTransitionName] = useState('')

    // Sync local state when selection changes
    useEffect(() => {
        if (selectedPlace) {
            setPlaceId(selectedPlace.id)
            setPlaceName(selectedPlace.name)
            setPlaceTokens(String(selectedPlace.tokens ?? 0))
            setPlaceMaxTokens(selectedPlace.maxTokens !== undefined ? String(selectedPlace.maxTokens) : '')
        }
    }, [selectedPlace])

    useEffect(() => {
        if (selectedTransition) {
            setTransitionId(selectedTransition.id)
            setTransitionName(selectedTransition.name)
        }
    }, [selectedTransition])

    const handleSavePlace = useCallback(() => {
        if (!selectedPlace || !onUpdatePlace) return
        const tokensNum = Math.max(0, Math.floor(parseInt(placeTokens || '0', 10)))
        const maxNum = placeMaxTokens.trim() === '' ? undefined : Math.max(0, Math.floor(parseInt(placeMaxTokens, 10)))
        const clamped = maxNum !== undefined ? Math.min(tokensNum, maxNum) : tokensNum
        onUpdatePlace(selectedPlace.id, { id: placeId.trim(), name: placeName.trim() || selectedPlace.name, tokens: clamped, maxTokens: maxNum })
    }, [selectedPlace, onUpdatePlace, placeId, placeName, placeTokens, placeMaxTokens])

    const handleSaveTransition = useCallback(() => {
        if (!selectedTransition || !onUpdateTransition) return
        const newName = transitionName.trim() || selectedTransition.name
        onUpdateTransition(selectedTransition.id, { id: transitionId.trim(), name: newName })
    }, [onUpdateTransition, selectedTransition, transitionId, transitionName])

    const handleFile = useCallback((file: File) => {
        if (!file.name.toLowerCase().endsWith('.pnml')) {
            onFileUpload({
                success: false,
                error: 'Please select a PNML file (.pnml extension)',
                filename: file.name
            })
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            if (content) {
                const parseResult = parsePNML(content, file.name)
                onFileUpload({
                    success: parseResult.success,
                    data: parseResult.petriNet,
                    error: parseResult.error,
                    filename: parseResult.filename
                })
            }
        }
        reader.onerror = () => {
            onFileUpload({
                success: false,
                error: 'Failed to read file',
                filename: file.name
            })
        }
        reader.readAsText(file)
    }, [onFileUpload])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFile(file)
        }
        // Reset input value to allow selecting the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [handleFile])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)

        const files = Array.from(e.dataTransfer.files)
        const pnmlFile = files.find(file => file.name.toLowerCase().endsWith('.pnml'))

        if (pnmlFile) {
            handleFile(pnmlFile)
        } else if (files.length > 0) {
            onFileUpload({
                success: false,
                error: 'Please drop a PNML file (.pnml extension)',
                filename: files[0].name
            })
        }
    }, [handleFile, onFileUpload])

    const openFileDialog = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    const handleIncTokens = useCallback((delta: number) => {
        setPlaceTokens(prev => {
            const n = Math.max(0, (parseInt(prev || '0', 10) || 0) + delta)
            return String(n)
        })
    }, [])

    return (
        <aside className="collapsible-sidebar w-full lg:w-1/3 xl:w-1/4 flex flex-col gap-6 flex-shrink-0">
            {/* File Upload Section */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 border-b pb-3">1. Load Petri Net</h2>
                <div
                    className={`file-upload-area border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragOver
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={openFileDialog}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pnml"
                        onChange={handleFileSelect}
                    />
                    <Upload className={`mx-auto h-10 w-10 ${isDragOver ? 'text-blue-500' : 'text-slate-400'}`} />
                    <p className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold text-blue-600">
                            {isDragOver ? 'Drop your PNML file here' : 'Upload a PNML file'}
                        </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        or drag and drop it here
                    </p>
                </div>
                <div className="mt-4 text-sm text-center text-slate-700">
                    <p className="font-medium">Currently loaded:</p>
                    <p className="text-blue-700 truncate">{currentFileName}</p>
                </div>
            </div>

            {/* Modification Section */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 border-b pb-3 flex items-center justify-between">
                    <span>2. Modify & Tweak</span>
                    {(selectedPlace || selectedTransition) && (
                        <button
                            type="button"
                            className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
                            onClick={() => onClearSelection?.()}
                            title="Clear selection"
                        >
                            Clear
                        </button>
                    )}
                </h2>
                {selectedPlace ? (
                    <div className="space-y-3">
                        <div className="text-xs text-slate-500">Editing place: <span className="font-medium text-slate-700">{selectedPlace.id}</span></div>
                        <label className="block text-sm font-medium text-slate-700">ID</label>
                        <input
                            type="text"
                            value={placeId}
                            onChange={(e) => setPlaceId(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                            placeholder="Unique identifier"
                        />
                        <label className="block text-sm font-medium text-slate-700">Name</label>
                        <input
                            type="text"
                            value={placeName}
                            onChange={(e) => setPlaceName(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        />
                        <label className="block text-sm font-medium text-slate-700">Tokens</label>
                        <div className="flex gap-2 items-center">
                            <button type="button" className="px-3 py-1 rounded-md bg-slate-100" onClick={() => handleIncTokens(-1)}>-</button>
                            <input
                                type="number"
                                min={0}
                                value={placeTokens}
                                onChange={(e) => setPlaceTokens(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-md text-sm"
                            />
                            <button type="button" className="px-3 py-1 rounded-md bg-slate-100" onClick={() => handleIncTokens(1)}>+</button>
                        </div>
                        <label className="block text-sm font-medium text-slate-700">Max tokens (optional)</label>
                        <input
                            type="number"
                            min={0}
                            placeholder="Unbounded"
                            value={placeMaxTokens}
                            onChange={(e) => setPlaceMaxTokens(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        />
                        <p className="text-xs text-slate-500">IDs must be unique across places and transitions.</p>
                        <div className="flex gap-2">
                            <button
                                className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                                onClick={handleSavePlace}
                            >
                                Save Place
                            </button>
                            <button
                                type="button"
                                className="flex-1 bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors"
                                onClick={() => onClearSelection?.()}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                ) : selectedTransition ? (
                    <div className="space-y-3">
                        <div className="text-xs text-slate-500">Editing transition: <span className="font-medium text-slate-700">{selectedTransition.id}</span></div>
                        <label className="block text-sm font-medium text-slate-700">ID</label>
                        <input
                            type="text"
                            value={transitionId}
                            onChange={(e) => setTransitionId(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                            placeholder="Unique identifier"
                        />
                        <label className="block text-sm font-medium text-slate-700">Name</label>
                        <input
                            type="text"
                            value={transitionName}
                            onChange={(e) => setTransitionName(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        />
                        <p className="text-xs text-slate-500">Enabled state is computed automatically. IDs must be unique across places and transitions.</p>
                        <div className="flex gap-2">
                            <button
                                className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                                onClick={handleSaveTransition}
                            >
                                Save Transition
                            </button>
                            <button
                                type="button"
                                className="flex-1 bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors"
                                onClick={() => onClearSelection?.()}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-slate-500 mb-4">
                            Click on elements in the diagram to modify their properties.
                        </p>
                        <button
                            className="w-full bg-slate-200 text-slate-600 font-medium py-2 px-4 rounded-lg"
                            disabled
                        >
                            No element selected
                        </button>
                    </>
                )}
            </div>

            {/* Simulation Section */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 border-b pb-3">3. Run Simulation</h2>
                <div className="flex items-center gap-4">
                    <label htmlFor="sim-steps" className="text-sm font-medium text-slate-700">
                        Steps:
                    </label>
                    <input
                        type="number"
                        id="sim-steps"
                        value={steps}
                        onChange={(e) => setSteps(parseInt(e.target.value) || 20)}
                        className="w-full p-2 border border-slate-300 rounded-md text-sm"
                        min="1"
                        max="1000"
                    />
                </div>
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => onRunSimulation(steps)}
                        disabled={isLoading}
                        className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? 'Running...' : 'Run Simulation'}
                    </button>
                    <button
                        onClick={onStepOnce}
                        disabled={isLoading}
                        className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        title="Execute one step of the simulation"
                    >
                        Step Once
                    </button>
                </div>
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={onReset}
                        className="w-full bg-slate-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </aside>
    )
}

export default SimulationControls
