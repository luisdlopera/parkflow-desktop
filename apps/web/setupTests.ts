import '@testing-library/jest-dom'
import { server } from './src/mocks/server'
import { afterAll, afterEach, beforeAll } from 'vitest'

// Polyfill ResizeObserver for HeroUI components in jsdom
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

beforeAll(() => server.listen())

afterEach(() => server.resetHandlers())

afterAll(() => server.close())