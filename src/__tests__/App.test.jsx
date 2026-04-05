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

  it('renders the Camera and Dashboard tabs', () => {
    renderWithProvider(<App />)
    expect(screen.getByTestId('tab-camera')).toBeInTheDocument()
    expect(screen.getByTestId('tab-dashboard')).toBeInTheDocument()
  })

  it('renders the Policy Selector in header', () => {
    renderWithProvider(<App />)
    expect(screen.getByTestId('policy-selector')).toBeInTheDocument()
  })
})
