/// <reference types="@testing-library/jest-dom" />

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { AnomalyHeatmap } from '../AnomalyHeatmap'
import * as api from '../../../services/api'

describe('AnomalyHeatmap', () => {
  const mockPayload = {
    labels: ['VEND-100', 'VEND-200'],
    values: [3, 1],
  }

  let fetchSpy: jest.SpiedFunction<typeof api.fetchAnomalyHeatmap>
  let setIntervalSpy: jest.SpiedFunction<typeof setInterval>
  let clearIntervalSpy: jest.SpiedFunction<typeof clearInterval>

  beforeEach(() => {
    fetchSpy = jest.spyOn(api, 'fetchAnomalyHeatmap').mockResolvedValue(mockPayload)
    setIntervalSpy = jest.spyOn(globalThis, 'setInterval')
  clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    setIntervalSpy.mockRestore()
  clearIntervalSpy.mockRestore()
    jest.clearAllTimers()
  })

  it('renders data returned by the API', async () => {
    render(
      <MemoryRouter>
        <AnomalyHeatmap />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Vendor VEND-100')).toBeTruthy()
      expect(screen.getByText('3 anomalies')).toBeTruthy()
    })
  })

  it('allows toggling between vendor and month modes', async () => {
    render(
      <MemoryRouter>
        <AnomalyHeatmap />
      </MemoryRouter>,
    )

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('vendor'))

    const monthButton = screen.getByRole('button', { name: /by month/i })
    fetchSpy.mockResolvedValueOnce({ labels: ['2024-01'], values: [2] })
    await userEvent.click(monthButton)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('month'))
  expect(screen.getByText('Month 2024-01')).toBeTruthy()
  })

  it('sets up the refresh interval', async () => {
    render(
      <MemoryRouter>
        <AnomalyHeatmap />
      </MemoryRouter>,
    )

  await waitFor(() => expect(setIntervalSpy).toHaveBeenCalled())
  })
})
