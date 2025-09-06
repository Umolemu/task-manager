import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import TasksBoard from '../pages/TasksBoard'
import { ToastProvider } from '../components/ToastProvider'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('TasksBoard', () => {
  it('renders three columns and a button to create', () => {
    // mock fetch to avoid 401
    // @ts-ignore
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ tasks: [] }) }))
    render(
      <BrowserRouter>
        <ToastProvider>
          <TasksBoard />
        </ToastProvider>
      </BrowserRouter>
    )
    return waitFor(() => {
      expect(screen.getByText(/Tasks Board/i)).toBeInTheDocument()
      expect(screen.getByText('Todo')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /\+ Task/i }).length).toBeGreaterThan(0)
    })
  })
})
