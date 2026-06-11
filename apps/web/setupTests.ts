import '@testing-library/jest-dom'
import { server } from './src/mocks/server'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

// Polyfill ResizeObserver for HeroUI components in jsdom
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() { /* Mock ResizeObserver observe hook */ }
    unobserve() { /* Mock ResizeObserver unobserve hook */ }
    disconnect() { /* Mock ResizeObserver disconnect hook */ }
  }
}

// Mock window.matchMedia for useMediaQuery hook
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeAll(() => server.listen())

afterEach(() => server.resetHandlers())

afterAll(() => server.close())
import 'fake-indexeddb/auto';
