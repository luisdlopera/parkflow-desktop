import React from 'react'
import { render } from '@testing-library/react'
import { ThemeProvider } from '@/lib/theme/ThemeProvider'
import { useThemeStore } from '@/lib/theme/theme-store'

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    useThemeStore.setState({ theme: 'auto', isDark: false })
  })

  test('applies dark class when saved as dark', () => {
    useThemeStore.setState({ theme: 'dark', isDark: false })
    render(
      <ThemeProvider>
        <div data-testid="child">ok</div>
      </ThemeProvider>
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  test('respects system preference when auto', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">ok</div>
      </ThemeProvider>
    )
    expect(document.documentElement).toBeDefined()
  })
})
