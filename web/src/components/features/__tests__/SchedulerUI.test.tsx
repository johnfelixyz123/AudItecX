/// <reference types="@testing-library/jest-dom" />

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { SchedulerUI } from '../SchedulerUI'
import * as api from '../../../services/api'

describe('SchedulerUI', () => {
  const initialSchedule = {
    id: 'sched-1',
    vendor_id: 'VEND-101',
    frequency: 'weekly' as const,
    start_at: '2099-01-01T00:00:00Z',
    created_at: '2098-12-01T00:00:00Z',
    next_run_at: '2099-01-08T00:00:00Z',
    last_run_at: null,
    last_run_id: null,
  }

  let fetchSpy: jest.SpiedFunction<typeof api.fetchSchedules>
  let createSpy: jest.SpiedFunction<typeof api.createSchedule>
  let deleteSpy: jest.SpiedFunction<typeof api.deleteSchedule>

  beforeEach(() => {
    fetchSpy = jest.spyOn(api, 'fetchSchedules').mockResolvedValue([initialSchedule])
    createSpy = jest.spyOn(api, 'createSchedule').mockResolvedValue({
      id: 'sched-2',
      vendor_id: 'VEND-202',
      frequency: 'daily',
      start_at: '2099-02-01T00:00:00Z',
      created_at: '2099-01-15T00:00:00Z',
      next_run_at: '2099-02-01T00:00:00Z',
      last_run_at: null,
      last_run_id: null,
    })
    deleteSpy = jest.spyOn(api, 'deleteSchedule').mockResolvedValue()
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    createSpy.mockRestore()
    deleteSpy.mockRestore()
  })

  it('renders existing schedules and loads on mount', async () => {
    render(
      <MemoryRouter>
        <SchedulerUI />
      </MemoryRouter>,
    )

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(await screen.findByText(/Vendor VEND-101/i)).toBeInTheDocument()
  })

  it('submits a new schedule and refreshes the list', async () => {
    const refreshedSchedule: api.ScheduleItem = {
      id: 'sched-2',
      vendor_id: 'VEND-202',
      frequency: 'monthly',
      start_at: '2099-02-01T00:00:00Z',
      created_at: '2099-01-15T00:00:00Z',
      next_run_at: '2099-02-01T00:00:00Z',
      last_run_at: null,
      last_run_id: null,
    }
    fetchSpy.mockResolvedValueOnce([initialSchedule])
    fetchSpy.mockResolvedValueOnce([initialSchedule, refreshedSchedule])
    createSpy.mockResolvedValueOnce(refreshedSchedule)

    render(
      <MemoryRouter>
        <SchedulerUI />
      </MemoryRouter>,
    )

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    await userEvent.type(screen.getByLabelText(/Vendor ID/i), 'VEND-202')
    await userEvent.selectOptions(screen.getByLabelText(/Frequency/i), 'monthly')
    await userEvent.type(screen.getByLabelText(/Start date/i), '2099-02-01')

    await userEvent.click(screen.getByRole('button', { name: /Schedule audit/i }))

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith({
      vendor_id: 'VEND-202',
      frequency: 'monthly',
      start_date: '2099-02-01',
    }))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/Vendor VEND-202/i)).toBeInTheDocument()
  })

  it('deletes a schedule and refreshes the list', async () => {
    fetchSpy.mockResolvedValueOnce([initialSchedule])
    fetchSpy.mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <SchedulerUI />
      </MemoryRouter>,
    )

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    await userEvent.click(await screen.findByRole('button', { name: /Delete schedule for VEND-101/i }))

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith('sched-1'))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
  })
})
