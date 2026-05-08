import { render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import Dashboard from '../pages/dashboard'

const mockApi = {
  '/api/v1/operations/supervisor/summary': { active: 5, entriesSinceMidnight: 10 },
  '/api/v1/cash/current': { status: 'OPEN', balance: 5000 },
}

const fetcher = (url: string) => Promise.resolve(mockApi[url as keyof typeof mockApi])

describe('Dashboard Integration', () => {
  it('loads and displays summary data', async () => {
    render(
      <SWRConfig value={{ fetcher }}>
        <Dashboard />
      </SWRConfig>,
    )

    await waitFor(() => {
      expect(screen.getByText('Active Sessions: 5')).toBeInTheDocument()
      expect(screen.getByText('Entries Today: 10')).toBeInTheDocument()
      expect(screen.getByText('Cash Status: OPEN')).toBeInTheDocument()
    })
  })
})
