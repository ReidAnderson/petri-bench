import { FileUploadResult } from '@/types'
import { parsePNML } from '@/utils/pnmlParser'
import { Upload } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { parseCsvEventLog, parseXesEventLog } from '@/utils/eventLogUtils'

interface ConformanceControlsProps {
    onRunAnalysis: () => void
    onFileUpload: (result: FileUploadResult) => void
    onXesFileUpload?: (result: FileUploadResult) => void
    isLoading: boolean
    currentFileName?: string
    currentXesFileName?: string
}

const ConformanceControls: React.FC<ConformanceControlsProps> = ({
    onRunAnalysis,
    onFileUpload,
    onXesFileUpload,
    isLoading,
    currentFileName = 'default_petri_net.pnml',
    currentXesFileName
}) => {
    const [isDragOver, setIsDragOver] = useState(false)
    const [isXesDragOver, setIsXesDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const xesFileInputRef = useRef<HTMLInputElement>(null)

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

    const handleXesFile = useCallback((file: File) => {
        if (!onXesFileUpload) return

        const lowerName = file.name.toLowerCase()
        if (!lowerName.endsWith('.xes') && !lowerName.endsWith('.csv')) {
            onXesFileUpload({
                success: false,
                error: 'Please select an XES or CSV file (.xes or .csv extension)',
                filename: file.name
            })
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            if (!content) {
                onXesFileUpload({ success: false, error: 'Empty event log file', filename: file.name })
                return
            }

            if (lowerName.endsWith('.csv')) {
                const parsed = parseCsvEventLog(content)
                if (!parsed.success || !parsed.eventLog) {
                    onXesFileUpload({ success: false, error: parsed.error || 'Invalid CSV format', filename: file.name })
                    return
                }
                onXesFileUpload({ success: true, data: parsed.eventLog, filename: file.name })
                return
            }

            // XES: parse into EventLog structure
            const parsedXes = parseXesEventLog(content)
            if (!parsedXes.success || !parsedXes.eventLog) {
                onXesFileUpload({ success: false, error: parsedXes.error || 'Invalid XES format', filename: file.name })
                return
            }
            onXesFileUpload({ success: true, data: parsedXes.eventLog, filename: file.name })
        }
        reader.onerror = () => {
            onXesFileUpload({
                success: false,
                error: 'Failed to read event log file (XES/CSV)',
                filename: file.name
            })
        }
        reader.readAsText(file)
    }, [onXesFileUpload])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFile(file)
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [handleFile])

    const handleXesFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleXesFile(file)
        }
        if (xesFileInputRef.current) {
            xesFileInputRef.current.value = ''
        }
    }, [handleXesFile])

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

    const handleXesDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsXesDragOver(true)
    }, [])

    const handleXesDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsXesDragOver(false)
    }, [])

    const handleXesDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsXesDragOver(false)

        const files = Array.from(e.dataTransfer.files)
        const eventLogFile = files.find(file => /\.(xes|csv)$/i.test(file.name))

        if (eventLogFile) {
            handleXesFile(eventLogFile)
        } else if (files.length > 0 && onXesFileUpload) {
            onXesFileUpload({
                success: false,
                error: 'Please drop an XES or CSV file (.xes or .csv extension)',
                filename: files[0].name
            })
        }
    }, [handleXesFile, onXesFileUpload])

    const openFileDialog = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    const openXesFileDialog = useCallback(() => {
        xesFileInputRef.current?.click()
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

                {/* XES/CSV Upload */}
                <div>
                    <label className="font-medium text-slate-700 text-sm">Event Log</label>
                    <div
                        className={`mt-1 file-upload-area border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isXesDragOver
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                            }`}
                        onDragOver={handleXesDragOver}
                        onDragLeave={handleXesDragLeave}
                        onDrop={handleXesDrop}
                        onClick={openXesFileDialog}
                    >
                        <input
                            ref={xesFileInputRef}
                            type="file"
                            className="hidden"
                            accept=".xes,.csv"
                            onChange={handleXesFileSelect}
                        />
                        <Upload className={`mx-auto h-8 w-8 ${isXesDragOver ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <p className="mt-1 text-sm text-slate-600">
                            <span className="font-semibold text-indigo-600">
                                {isXesDragOver ? 'Drop XES or CSV here' : 'Upload XES'}
                            </span>
                        </p>
                        <p className="text-xs text-slate-500">or drag and drop</p>
                        <p className="text-xs text-slate-400 mt-1">Supported: .xes, .csv</p>
                    </div>
                    {currentXesFileName && (
                        <div className="mt-2 text-sm text-center text-slate-700">
                            <p className="font-medium text-slate-600">Loaded:</p>
                            <p className="text-indigo-700 font-semibold truncate">{currentXesFileName}</p>
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
                    disabled={isLoading || !currentFileName || !currentXesFileName}
                    className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? 'Analyzing...' : 'Run Analysis'}
                </button>
            </div>
        </aside>
    )
}

export default ConformanceControls
