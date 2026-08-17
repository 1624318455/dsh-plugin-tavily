import { defineConfig } from 'tsdown'

/**
 * dsh-plugin-tavily dual build:
 *
 * 1. Node ESM `lib/index.mjs` — the Host half. `@deepseek-ai/*` seam and
 *    framework packages are externalized (declared as peerDependencies), so
 *    the artifact imports the single already-loaded copies rather than
 *    bundling duplicates.
 *
 * 2. Browser CJS `lib/client.js` — the Client half, fetched by the harness's
 *    client module loader at `/plugins/@dsh-external/dsh-plugin-tavily/client.js`.
 *    The banner wraps the bundle in `window.__ModuleLoader__.load({ id,
 *    factory })`; the loader's `require` answers the externals (the platform
 *    module table + the runtime store exemption), and everything else —
 *    this plugin's own card code — is inlined so the factory is self-contained.
 */

// The module table the browser shell seeds (platform modules) plus the
// runtime store exemption. `id` in the load banner must equal the entry name
// (package name); the loader resolves `./client` from the package exports.
const PACKAGE_ID = '@dsh-external/dsh-plugin-tavily'

const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
  '@deepseek-ai/dsh-client-runtime/client',
]

export default defineConfig([
  {
    name: PACKAGE_ID,
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
  },
  {
    name: `${PACKAGE_ID}/client`,
    entry: { client: 'src/client/index.ts' },
    // Browser bundle lands next to the node half (single lib/ artifact dir;
    // the entryFileNames pin keeps it exactly lib/client.js). clean must stay
    // off — a default clean would wipe the node-half output emitted above.
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    dts: false,
    clean: false,
    sourcemap: true,
    external: [...CLIENT_EXTERNALS],
    // Anything NOT in the loader module table must inline instead (this
    // plugin's own card code). A require() the table cannot answer is a
    // guaranteed runtime throw, so the rule is the table list itself: no
    // opinion for table entries (external above wins), bundle everything else.
    noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    },
    outputOptions: {
      entryFileNames: 'client.cjs',
      banner: `if (typeof window !== 'undefined') {
window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });\n} else {\nmodule.exports = {};\n}',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
