/// <reference types="@testing-library/jest-dom" />

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PolicyCheckPanel } from '../PolicyCheckPanel'
import * as api from '../../../services/api'

describe('PolicyCheckPanel', () => {
	const mockResponse: api.PolicyCheckResponse = {
		policy_run_id: 'POLICY-TEST-001',
		document_name: 'policy.txt',
		controls_evaluated: ['SOX_404'],
		violations: [
			{
				id: 'VIOL-001',
				control: 'SOX_404',
				control_label: 'SOX 404',
				statement: 'Missing dual approval clause',
				evidence_excerpt: 'Single approval detected for transactions above threshold.',
				severity: 'high',
				confidence: 0.82,
				page: 1,
			},
		],
		summary: '1 potential violation detected; highest severity is high.',
		analysis_duration_ms: 42,
		metadata: {
			pages_processed: 1,
			total_tokens: 28,
		},
		document_preview: 'Single approval detected for transactions above threshold.',
	}

	let uploadSpy: jest.SpiedFunction<typeof api.uploadPolicyDocument>

	beforeEach(() => {
		uploadSpy = jest.spyOn(api, 'uploadPolicyDocument').mockResolvedValue(mockResponse)
	})

	afterEach(() => {
		uploadSpy.mockRestore()
	})

	it('uploads a document and renders the analysis', async () => {
		const onOpenViolation = jest.fn()
		render(<PolicyCheckPanel onOpenViolation={onOpenViolation} />)

		const file = new File(['Single approval allowed'], 'policy.txt', { type: 'text/plain' })
		const fileInput = screen.getByLabelText(/upload policy document/i)
		await userEvent.upload(fileInput, file)

		const analyzeButton = screen.getByRole('button', { name: /analyze document/i })
		await userEvent.click(analyzeButton)

		await waitFor(() => expect(uploadSpy).toHaveBeenCalled())
		await waitFor(() => expect(screen.getByText(mockResponse.summary)).toBeTruthy())

		const viewButton = await screen.findByRole('button', { name: /view snippet/i })
		await userEvent.click(viewButton)

		expect(onOpenViolation).toHaveBeenCalledWith(mockResponse.violations[0], expect.objectContaining({
			documentName: mockResponse.document_name,
			policyRunId: mockResponse.policy_run_id,
		}))
	})

	it('requires a file before analysis', async () => {
		render(<PolicyCheckPanel />)

		const analyzeButton = screen.getByRole('button', { name: /analyze document/i })
		await userEvent.click(analyzeButton)

		expect((analyzeButton as HTMLButtonElement).disabled).toBe(true)
		expect(uploadSpy).not.toHaveBeenCalled()
	})
})
