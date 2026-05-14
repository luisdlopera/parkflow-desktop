import '@testing-library/jest-dom'
import { server } from './src/mocks/server'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

// Polyfill ResizeObserver for HeroUI components in jsdom
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

function createStorageMock(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value))
    },
  }
}

function installStorageMocks() {
  if (typeof window === 'undefined') {
    return
  }
  const localStorageMock = createStorageMock()
  const sessionStorageMock = createStorageMock()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: localStorageMock,
  })
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    writable: true,
    value: sessionStorageMock,
  })
}

beforeAll(() => {
  installStorageMocks()
  server.listen()
})

beforeEach(() => {
  // Some tauri mocks can override storage in jsdom; enforce stable storage per test.
  installStorageMocks()
})

afterEach(() => server.resetHandlers())

afterAll(() => server.close())
