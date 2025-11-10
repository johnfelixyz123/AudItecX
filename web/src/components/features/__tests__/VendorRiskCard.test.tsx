/// <reference types="@testing-library/jest-dom" />

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { VendorRiskCard } from '../VendorRiskCard'

const mockNavigate = jest.fn()
const originalFetch = globalThis.fetch
let setIntervalSpy: jest.SpiedFunction<typeof setInterval>
let clearIntervalSpy: jest.SpiedFunction<typeof clearInterval>

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('VendorRiskCard', () => {
  const mockResponse = [
    { vendor_id: 'VEND-106', vendor_name: 'Orion Industrial Parts', invoices: 5, anomalies: 2, score: 80 },
    { vendor_id: 'VEND-100', vendor_name: 'Apex Office Supply Co.', invoices: 3, anomalies: 0, score: 100 },
  ]
  let fetchSpy: jest.MockedFunction<typeof globalThis.fetch>

  beforeEach(() => {
    setIntervalSpy = jest.spyOn(globalThis, 'setInterval')
    clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval')
    fetchSpy = jest
      .fn(async () => ({
        ok: true,
        json: async () => mockResponse,
      }))
      .mockName('fetchSpy') as unknown as jest.MockedFunction<typeof globalThis.fetch>
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch
    mockNavigate.mockReset()
  })

  afterEach(() => {
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
    jest.resetAllMocks()
    globalThis.fetch = originalFetch
  })

  it('renders vendor risk metrics from the API', async () => {
    render(
      <MemoryRouter>
        <VendorRiskCard />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Orion Industrial Parts')).toBeTruthy()
    })
    expect(screen.getByText('80')).toBeTruthy()
    expect(screen.getAllByText(/confidence/)).toHaveLength(mockResponse.length)
  })

  it('refreshes data on demand and via interval', async () => {
    render(
      <MemoryRouter>
        <VendorRiskCard />
      </MemoryRouter>,
    )

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30_000)

    const refreshButton = screen.getByRole('button', { name: /refresh vendor risk metrics/i })
    await userEvent.click(refreshButton)
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
  })

  it('navigates to workspace with vendor filter when a row is clicked', async () => {
    render(
      <MemoryRouter>
        <VendorRiskCard />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Orion Industrial Parts')).toBeTruthy())
    const vendorButton = screen.getByRole('button', { name: /orion industrial parts/i })
    await userEvent.click(vendorButton)
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('vendor=VEND-106'))
  })
})
