import { render, screen } from '@testing-library/react'
import { TestComponent } from '../TestComponent'

describe('TestComponent', () => {
  it('renders hello world', () => {
    render(<TestComponent />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})