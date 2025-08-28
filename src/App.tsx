import Header from '@/components/Header'
import ConformancePage from '@/pages/ConformancePage'
import SimulatorPage from '@/pages/SimulatorPage'
import { useState } from 'react'
import { Route, HashRouter as Router, Routes } from 'react-router-dom'
import EditorPage from './pages/EditorPage'

function App() {
    const [currentPage, setCurrentPage] = useState<'simulator' | 'conformance'>('simulator')

    return (
        <Router>
            <div className="flex flex-col h-screen bg-slate-100 text-slate-800">
                <Header currentPage={currentPage} onPageChange={setCurrentPage} />
                <main className="flex-grow container mx-auto px-6 py-8 relative">
                    <Routes>
                        <Route
                            path="/"
                            element={
                                currentPage === 'simulator' ? <SimulatorPage /> : <ConformancePage />
                            }
                        />
                        <Route path="/simulator" element={<SimulatorPage />} />
                        <Route path="/conformance" element={<ConformancePage />} />
                        <Route path="/experimental" element={<EditorPage />} />
                    </Routes>
                </main>
            </div>
        </Router>
    )
}

export default App
