/**
 * Real-API smoke test for the built dsh-plugin-tavily. Exercises the plugin's real code
 * path end to end — `apply()` registers the provider into `ctx.web` and the settings
 * section into the settings seam (when present), then a live `search()` hits
 * api.tavily.com and maps the response — without constructing the full harness runtime
 * (whose peer closure has cross-package version skew). The full harness registration
 * path is covered by installing the plugin into a real `dsh` profile
 * (`dsh plugin --profile web add ...`).
 *
 * Usage:
 *   node tests/smoke.mjs          # needs TAVILY_API_KEY exported (or source ../.env)
 */
import * as plugin from '../lib/index.mjs'

const apiKey = process.env.TAVILY_API_KEY
if (apiKey === undefined || apiKey.length === 0) {
  console.error('TAVILY_API_KEY is not set — export it or source the repo .env before running.')
  process.exit(1)
}

// Minimal stand-in for the harness's ctx.web: apply() needs registerSearchProvider
// and registerFetchProvider (plus the optional-settings seam hooks, which no-op
// when the service never mounts).
const registered = []
const fetched = []
const ctx = {
  web: {
    registerSearchProvider(provider) {
      registered.push(provider)
      return () => {}
    },
    registerFetchProvider(provider) {
      fetched.push(provider)
      return () => {}
    },
  },
  inject: () => () => {},
  get: () => undefined,
}

plugin.apply(ctx, { apiKey })

const provider = registered[0]
if (provider === undefined) {
  console.error('FAIL — apply() did not register a search provider.')
  process.exit(1)
}
if (provider.id !== 'tavily') {
  console.error(`FAIL — registered provider id is "${provider.id}", expected "tavily".`)
  process.exit(1)
}
if (provider.available() !== true) {
  console.error('FAIL — provider reports unavailable despite a valid apiKey.')
  process.exit(1)
}

const fetchProvider = fetched[0]
if (fetchProvider === undefined || fetchProvider.id !== 'tavily-extract') {
  console.error('FAIL — apply() did not register the tavily-extract fetch provider.')
  process.exit(1)
}
if (fetchProvider.available() !== true) {
  console.error('FAIL — fetch provider reports unavailable despite a valid apiKey.')
  process.exit(1)
}

const result = await provider.search({ query: 'DeepSeek Harness', maxResults: 5 })
console.log(`OK — ${result.sources.length} sources returned, generated answer: ${result.content != null ? 'yes' : 'no'}`)
for (const source of result.sources.slice(0, 3)) {
  console.log(`  - ${source.title ?? '(no title)'}\n    ${source.url}`)
}

if (result.sources.length === 0) {
  console.error('FAIL — the live search returned no sources.')
  process.exit(1)
}
console.log('smoke passed.')
