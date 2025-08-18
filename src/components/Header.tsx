import clsx from 'clsx'
import React from 'react'

interface HeaderProps {
    currentPage: 'simulator' | 'conformance'
    onPageChange: (page: 'simulator' | 'conformance') => void
}

const Header: React.FC<HeaderProps> = ({ currentPage, onPageChange }) => {
    return (
        <header className="bg-white shadow-md z-20">
            <div className="container mx-auto px-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-900 py-4">
                        Petri Net Suite
                    </h1>
                    <nav className="flex gap-4">
                        <button
                            onClick={() => onPageChange('simulator')}
                            className={clsx(
                                'nav-tab text-slate-500 py-4 border-b-2 border-transparent',
                                currentPage === 'simulator' && 'active'
                            )}
                        >
                            Simulator
                        </button>
                        <button
                            onClick={() => onPageChange('conformance')}
                            className={clsx(
                                'nav-tab text-slate-500 py-4 border-b-2 border-transparent',
                                currentPage === 'conformance' && 'active'
                            )}
                        >
                            Conformance Checker
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    )
}

export default Header
