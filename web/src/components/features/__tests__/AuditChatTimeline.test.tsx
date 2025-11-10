import { fireEvent, render, screen } from '@testing-library/react'
import { AuditChatTimeline } from '../AuditChatTimeline'
import type { ConversationMessage } from '../../../services/api'

describe('AuditChatTimeline', () => {
	const sampleMessages: ConversationMessage[] = [
		{
			id: 'msg-1',
			role: 'user',
			text: 'Need summary for vendor **VEND-100**',
			timestamp: '2025-01-01T00:00:00Z',
			keywords: ['vendor', 'summary'],
		},
		{
			id: 'msg-2',
			role: 'assistant',
			text: '# Heading\n\n- bullet insight',
			timestamp: '2025-01-01T00:01:00Z',
			keywords: ['heading', 'insight'],
		},
	]

	it('renders markdown conversation entries', () => {
		render(<AuditChatTimeline runId="RUN-1" messages={sampleMessages} />)
		expect(screen.getByText('Audit Chat Timeline')).toBeInTheDocument()
		expect(screen.getByText(/Heading/)).toBeInTheDocument()
		expect(screen.getByText(/bullet insight/)).toBeInTheDocument()
	})

	it('filters messages by search term and keywords', () => {
		render(<AuditChatTimeline runId="RUN-2" messages={sampleMessages} />)
		const input = screen.getByPlaceholderText('Search by keyword or text…')
		fireEvent.change(input, { target: { value: 'heading' } })
		expect(screen.queryByText(/Need summary for vendor/i)).not.toBeInTheDocument()
		expect(screen.getByText(/Heading/)).toBeInTheDocument()
	})

	it('shows empty state when no messages exist', () => {
		render(<AuditChatTimeline runId="RUN-3" messages={[]} />)
		expect(
			screen.getByText('No conversation captured yet. Run a request to populate this timeline.'),
		).toBeInTheDocument()
	})
})
