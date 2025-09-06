import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import TasksBoard from '../pages/TasksBoard'
import { ToastProvider } from '../components/ToastProvider'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('TasksBoard modal', () => {
  it('opens create modal when clicking + Task', async () => {
  // mock fetch to avoid network
  // @ts-ignore
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ tasks: [] }) }))
  render(
      <BrowserRouter>
        <ToastProvider>
          <TasksBoard />
        </ToastProvider>
      </BrowserRouter>
    )
  await waitFor(() => screen.getByText(/Tasks Board/i))
  const addButtons = screen.getAllByRole('button', { name: /\+ Task/i })
  fireEvent.click(addButtons[0])
  expect(screen.getByText(/New Task/i)).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/Task name/i)).toBeInTheDocument()
  })
})
