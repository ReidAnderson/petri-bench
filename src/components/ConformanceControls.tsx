import { FileUploadResult } from '@/types'
import { parsePNML } from '@/utils/pnmlParser'
import { Upload } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

interface ConformanceControlsProps {
    onRunAnalysis: () => void
    onFileUpload: (result: FileUploadResult) => void
    isLoading: boolean
    currentFileName?: string
}

const ConformanceControls: React.FC<ConformanceControlsProps> = ({
    onRunAnalysis,
    onFileUpload,
    isLoading,
    currentFileName = 'default_petri_net.pnml'
}) => {
    const [isDragOver, setIsDragOver] = useState(false)
    const [xesFile] = useState<string | null>('event_log.xes')
    const fileInputRef = useRef<HTMLInputElement>(null)

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

    return (
        <aside className="w-full lg:w-1/3 xl:w-1/4 flex flex-col gap-6 flex-shrink-0">
            {/* File Upload Section */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 border-b pb-3">1. Upload Files</h2>

                {/* PNML Upload */}
                <div className="mb-4">
                    <label className="font-medium text-slate-700 text-sm">Petri Net Model</label>
                    <div
                        className={`mt-1 file-upload-area border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDragOver
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
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
                        <Upload className={`mx-auto h-8 w-8 ${isDragOver ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <p className="mt-1 text-sm text-slate-600">
                            <span className="font-semibold text-indigo-600">
                                {isDragOver ? 'Drop PNML here' : 'Upload PNML'}
                            </span>
                        </p>
                        <p className="text-xs text-slate-500">or drag and drop</p>
                    </div>
                    <div className="mt-2 text-sm text-center text-slate-700">
                        <p className="font-medium text-slate-600">Loaded:</p>
                        <p className="text-indigo-700 font-semibold truncate">{currentFileName}</p>
                    </div>
                </div>

                {/* XES Upload */}
                <div>
                    <label className="font-medium text-slate-700 text-sm">Event Log</label>
                    <div className="mt-1 file-upload-area border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                        <input type="file" className="hidden" accept=".xes" />
                        <Upload className="mx-auto h-8 w-8 text-slate-400" />
                        <p className="mt-1 text-sm text-slate-600">
                            <span className="font-semibold text-indigo-600">Upload XES</span>
                        </p>
                        <p className="text-xs text-slate-500">Event log file</p>
                    </div>
                    {xesFile && (
                        <div className="mt-2 text-sm text-center text-slate-700">
                            <p className="font-medium text-slate-600">Loaded:</p>
                            <p className="text-indigo-700 font-semibold">{xesFile}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Analysis Section */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 border-b pb-3">2. Run Analysis</h2>
                <p className="text-sm text-slate-500 mb-4">
                    Analyze the event log against the model to find deviations.
                </p>
                <button
                    onClick={onRunAnalysis}
                    disabled={isLoading || !currentFileName || !xesFile}
                    className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? 'Analyzing...' : 'Run Analysis'}
                </button>
            </div>
        </aside>
    )
}

export default ConformanceControls
