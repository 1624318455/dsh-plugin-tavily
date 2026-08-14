import { defineConfig } from 'tsdown'

/**
 * dsh-plugin-tavily build: one ESM Node entry emitted to `lib/`. The `@deepseek-ai/*`
 * seam and framework packages are externalized — the harness provides them at runtime
 * (declared as peerDependencies), so the built artifact must import the single
 * already-loaded copies rather than bundle duplicates.
 */
export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2022',
  dts: false,
  clean: true,
  deps: {
    neverBundle: [/@deepseek-ai\//],
  },
})
