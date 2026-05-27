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

beforeAll(() => server.listen())

afterEach(() => server.resetHandlers())

afterAll(() => server.close())
