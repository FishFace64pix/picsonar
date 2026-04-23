/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@picsonar/shared': resolve(__dirname, '../packages/shared/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        statements: 35,
        branches: 30,
        functions: 35,
        lines: 35,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'src/main.tsx',
        'src/i18n.ts',
        'vitest.config.ts',
      ],
    },
  },
})
