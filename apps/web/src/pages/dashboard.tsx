import React from 'react'
import useSWR from 'swr'

const Dashboard: React.FC = () => {
  const { data: summary } = useSWR('/api/v1/operations/supervisor/summary')
  const { data: cash } = useSWR('/api/v1/cash/current')

  return (
    <div data-testid="dashboard">
      <h1>Dashboard</h1>
      {summary && (
        <div data-testid="summary-loaded">
          <p>Active Sessions: {summary.active}</p>
          <p>Entries Today: {summary.entriesSinceMidnight}</p>
        </div>
      )}
      {cash && (
        <div data-testid="cash-loaded">
          <p>Cash Status: {cash.status}</p>
        </div>
      )}
    </div>
  )
}

export default Dashboard