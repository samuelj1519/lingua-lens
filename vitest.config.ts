import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/vitest.setup.ts'],
    testTimeout: 30000,
  },
});
