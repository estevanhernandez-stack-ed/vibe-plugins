import { defineConfig } from 'vitest/config';

// NOTE: This config intentionally reproduces the WSYATM broken-forks-pool
// failure mode. Vibe Test's audit harness detector should flag it:
//   - `pool: 'forks'` + `testTimeout: 5000` ms.
//   - Forks workers need >30s warm-up under coverage; 5s timeout produces
//     silent hangs that look like passing runs.
//   - @vitest/coverage-v8 is present in package.json, so `test:coverage` runs
//     would trip this in CI.
export default defineConfig({
  test: {
    pool: 'forks',
    testTimeout: 5000,
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // DELIBERATE OMISSION: no `all: true` and no `include`. This is the
      // cherry-picked-denominator setup the scanner's import-graph analysis
      // should catch on the Backend side.
    },
  },
});
