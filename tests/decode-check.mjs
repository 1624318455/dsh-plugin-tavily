// Reproduce the client decode path (rehydrateSchema + validateDraft) for the
// Tavily Config schema, using the same schemastery the harness ships.
import Schema from '@deepseek-ai/schemastery'
import z from '@deepseek-ai/schemastery'

// --- plugin/src/index.ts Config, mirrored verbatim ---
// The schema intentionally has NO defaults: code-level defaults live in the
// provider resolution step, so the settings composition base only contains
// fields the yaml explicitly set.
const Config = z.object({
  apiKey: z.string().role('secret'),
  apiKeyEnv: z.string().role('credential-ref'),
  baseURL: z.string(),
  searchDepth: z.union(['basic', 'advanced']),
  topic: z.union(['general', 'news', 'finance']),
  days: z.number().step(1).min(1).max(365),
  includeAnswer: z.boolean(),
  includeRawContent: z.boolean(),
  timeout: z.number().step(100).min(1000),
  maxResults: z.number().step(1).min(1).max(20),
  numResults: z.number().step(1).min(1).max(20),
  searchMode: z.union(['tavily-only', 'deepseek-first']),
})

function rehydrateSchema(serialized) {
  return new Schema(serialized)
}

function validateDraft(schema, draft) {
  try {
    schema(draft)
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

// 1) serialize the schema exactly as the host does (schema.toJSON())
let serialized
try {
  serialized = Config.toJSON()
  console.log('serialized ok, type:', serialized?.type)
  console.log('serialized keys:', Object.keys(serialized ?? {}))
} catch (error) {
  console.log('SERIALIZE FAILED:', error.message)
  process.exit(1)
}

// 2) rehydrate like the client
let rehydrated
try {
  rehydrated = rehydrateSchema(serialized)
  console.log('rehydrate ok')
} catch (error) {
  console.log('REHYDRATE FAILED:', error.message)
  process.exit(1)
}

// 3) validate typical values the way SettingsScopeController.decode does
const cases = [
  ['absent section', {}],
  ['full explicit section', {
    apiKeyEnv: 'TAVILY_API_KEY', baseURL: 'https://api.tavily.com',
    searchDepth: 'basic', topic: 'general', days: 7,
    includeAnswer: true, includeRawContent: false,
    timeout: 30000, maxResults: 5, searchMode: 'tavily-only',
  }],
  ['user overrides', {
    apiKeyEnv: 'MY_KEY', baseURL: 'https://x', searchDepth: 'advanced',
    topic: 'news', days: 3, includeAnswer: false, includeRawContent: true,
    timeout: 15000, maxResults: 10, searchMode: 'deepseek-first',
  }],
  ['string where number', { days: '7' }],
  ['maxResults out of range', { maxResults: 21 }],
  ['invalid searchMode', { searchMode: 'hybrid' }],
]
for (const [label, value] of cases) {
  const failure = validateDraft(rehydrated, value)
  console.log(`validate ${label}:`, failure === undefined ? 'PASS' : `FAIL: ${failure}`)
}