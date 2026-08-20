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
  searchDepth: z.union(['basic', 'advanced', 'fast', 'ultra-fast']),
  topic: z.union(['general', 'news', 'finance']),
  days: z.number().step(1).min(1).max(365),
  includeAnswer: z.union([z.boolean(), z.union(['basic', 'advanced'])]),
  includeRawContent: z.union([z.boolean(), z.union(['markdown', 'text'])]),
  timeout: z.number().step(100).min(1000),
  chunksPerSource: z.number().step(1).min(1).max(3),
  timeRange: z.union(['day', 'week', 'month', 'year', 'd', 'w', 'm', 'y']),
  startDate: z.string(),
  endDate: z.string(),
  includeImages: z.boolean(),
  includeImageDescriptions: z.boolean(),
  includeFavicon: z.boolean(),
  includeDomains: z.array(z.string()),
  excludeDomains: z.array(z.string()),
  country: z.string(),
  maxResults: z.number().step(1).min(1).max(20),
  retryMaxAttempts: z.number().step(1).min(0).max(5),
  cacheTtlSeconds: z.number().step(1).min(0).max(3600),
  numResults: z.number().step(1).min(1).max(20),
  searchMode: z.union(['tavily-only', 'deepseek-first', 'tavily-first']),
  engine: z.union(['tavily', 'deepseek']),
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
    topic: 'news', days: 3, includeAnswer: false, includeRawContent: 'markdown',
    timeout: 15000, maxResults: 10, searchMode: 'deepseek-first',
  }],
  ['full new-parameter section', {
    searchDepth: 'ultra-fast', timeRange: 'w', startDate: '2025-01-01', endDate: '2025-02-01',
    includeAnswer: 'advanced', includeRawContent: 'text', chunksPerSource: 3,
    includeDomains: ['example.com'], excludeDomains: ['spam.com'], country: 'japan',
    includeImages: true, includeImageDescriptions: true, includeFavicon: true,
  }],
  ['string where number', { days: '7' }],
  ['maxResults out of range', { maxResults: 21 }],
  ['chunksPerSource out of range', { chunksPerSource: 0 }],
  ['retry/cache valid', { retryMaxAttempts: 2, cacheTtlSeconds: 60 }],
  ['retry attempts too high', { retryMaxAttempts: 9 }],
  ['engine deepseek valid', { engine: 'deepseek' }],
  ['invalid engine', { engine: 'exa' }],
  ['invalid timeRange', { timeRange: 'foo' }],
  ['invalid searchMode', { searchMode: 'hybrid' }],
]
for (const [label, value] of cases) {
  const failure = validateDraft(rehydrated, value)
  console.log(`validate ${label}:`, failure === undefined ? 'PASS' : `FAIL: ${failure}`)
}