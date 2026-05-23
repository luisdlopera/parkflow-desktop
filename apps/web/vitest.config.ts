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
    pool: 'forks',
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'src/mocks/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'setupTests.ts',
      ],
      thresholds: {
        statements: 50,
        branches: 35,
        functions: 45,
        lines: 50,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
