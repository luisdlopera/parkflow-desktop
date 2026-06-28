import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '@parkflow/config/vitest';
import path from 'path';

export default mergeConfig(
  baseConfig,
  defineConfig({
    server: {
      fs: {
        allow: [path.resolve(__dirname, '../..')],
      },
    },
    test: {
      setupFiles: ['./setupTests.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['.next/**', 'node_modules/**', 'test-results/**'],
      coverage: {
        reportsDirectory: './coverage',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@print-agent': path.resolve(__dirname, '../print-agent/src'),
      },
    },
  }),
);
