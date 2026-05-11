import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  server: {
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['.next/**', 'node_modules/**', 'test-results/**'],
    pool: 'threads',
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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
