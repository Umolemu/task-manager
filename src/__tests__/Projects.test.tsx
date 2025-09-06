import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { BrowserRouter } from 'react-router-dom'
import Projects from '../pages/Projects'
import { ToastProvider } from '../components/ToastProvider'

describe('Projects page', () => {
  it('renders title and controls', () => {
    render(
      <BrowserRouter>
        <ToastProvider>
          <Projects />
        </ToastProvider>
      </BrowserRouter>
    )
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search projects/i)).toBeInTheDocument()
  })
})
