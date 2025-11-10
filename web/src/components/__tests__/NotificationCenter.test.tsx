/// <reference types="@testing-library/jest-dom" />

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { NotificationCenter } from '../NotificationCenter'
import * as api from '../../services/api'

describe('NotificationCenter', () => {
	let fetchSpy: jest.SpiedFunction<typeof api.fetchNotifications>
	let ackSpy: jest.SpiedFunction<typeof api.acknowledgeNotifications>

	beforeEach(() => {
		fetchSpy = jest.spyOn(api, 'fetchNotifications').mockResolvedValue([
			{
				id: 'notif-1',
				type: 'run_complete',
				message: 'Audit run completed',
				timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
				read: false,
			},
			{
				id: 'notif-2',
				type: 'simulation_anomaly_alert',
				message: 'Simulation flagged 3 anomalies',
				timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
				read: false,
			},
		])
		ackSpy = jest.spyOn(api, 'acknowledgeNotifications').mockResolvedValue({ status: 'ok', updated: 2 })
	})

	afterEach(() => {
		fetchSpy.mockRestore()
		ackSpy.mockRestore()
	})

	it('renders notifications and marks them as read', async () => {
		render(<NotificationCenter pollIntervalMs={0} />)

		await waitFor(() => expect(fetchSpy).toHaveBeenCalled())

		const trigger = screen.getByRole('button', { name: /notifications/i })
		expect(trigger).toBeTruthy()
		await waitFor(() => expect(trigger.getAttribute('aria-label')).toContain('2 unread'))

		await userEvent.click(trigger)
		await waitFor(() => expect(screen.getByText('Audit run completed')).toBeTruthy())
		await waitFor(() => expect(screen.getByText('Simulation flagged 3 anomalies')).toBeTruthy())
		await waitFor(() => expect(screen.getByText('Simulation anomaly alert')).toBeTruthy())

		const markAllButton = screen.getByRole('button', { name: /mark all as read/i })
		await userEvent.click(markAllButton)

		await waitFor(() => expect(ackSpy).toHaveBeenCalledWith(['notif-1', 'notif-2']))
	})
})
