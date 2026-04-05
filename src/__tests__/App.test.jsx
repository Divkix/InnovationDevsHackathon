import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { AppProvider } from '../context/AppContext.jsx'

function renderWithProvider(ui) {
  return render(<AppProvider>{ui}</AppProvider>)
}

describe('App', () => {
  it('renders the InsureScope heading', () => {
    renderWithProvider(<App />)
    expect(screen.getByText('InsureScope')).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    renderWithProvider(<App />)
    expect(screen.getByText('AI-powered insurance coverage analysis')).toBeInTheDocument()
  })

  it('has a working counter button', () => {
    renderWithProvider(<App />)
    const button = screen.getByRole('button', { name: /count is 0/i })
    expect(button).toBeInTheDocument()
  })

  it('displays all framework badges', () => {
    renderWithProvider(<App />)
    expect(screen.getByText('React ✓')).toBeInTheDocument()
    expect(screen.getByText('Vite ✓')).toBeInTheDocument()
    expect(screen.getByText('Tailwind ✓')).toBeInTheDocument()
  })
})
