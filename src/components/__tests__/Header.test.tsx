import Header from '@/components/Header'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

const HeaderWrapper = ({ currentPage, onPageChange }: any) => (
    <BrowserRouter>
        <Header currentPage={currentPage} onPageChange={onPageChange} />
    </BrowserRouter>
)

describe('Header', () => {
    it('renders the title', () => {
        render(<HeaderWrapper currentPage="simulator" onPageChange={() => { }} />)
        expect(screen.getByText('Petri Net Suite')).toBeInTheDocument()
    })

    it('renders navigation buttons', () => {
        render(<HeaderWrapper currentPage="simulator" onPageChange={() => { }} />)
        expect(screen.getByText('Simulator')).toBeInTheDocument()
        expect(screen.getByText('Conformance Checker')).toBeInTheDocument()
    })

    it('highlights the active page', () => {
        render(<HeaderWrapper currentPage="simulator" onPageChange={() => { }} />)
        const simulatorButton = screen.getByText('Simulator')
        expect(simulatorButton).toHaveClass('active')
    })
})
