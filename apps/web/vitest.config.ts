import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  server: {
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov', 'html'],
    reportsDirectory: './coverage',
    thresholds: {
      statements: 60,
      branches: 40,
      functions: 50,
      lines: 60,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['.next/**', 'node_modules/**', 'test-results/**'],
    pool: 'threads',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
