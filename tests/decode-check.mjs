// Reproduce the client decode path (rehydrateSchema + validateDraft) for the
// Tavily Config schema, using the same schemastery the harness ships.
import Schema from '@deepseek-ai/schemastery'
import z from '@deepseek-ai/schemastery'

// --- plugin/src/index.ts Config, mirrored verbatim ---
const TAVILY_DEFAULT_API_KEY_ENV = 'TAVILY_API_KEY'
const TAVILY_DEFAULT_BASE_URL = 'https://api.tavily.com'
const TAVILY_DEFAULT_SEARCH_DEPTH = 'basic'
const TAVILY_DEFAULT_TOPIC = 'general'
const TAVILY_DEFAULT_DAYS = 7
const TAVILY_DEFAULT_INCLUDE_ANSWER = true
const TAVILY_DEFAULT_NUM_RESULTS = 5

const Config = z.object({
  apiKey: z.string().role('secret'),
  apiKeyEnv: z.string().role('credential-ref').default(TAVILY_DEFAULT_API_KEY_ENV),
  baseURL: z.string().default(TAVILY_DEFAULT_BASE_URL),
  searchDepth: z.union(['basic', 'advanced']).default(TAVILY_DEFAULT_SEARCH_DEPTH),
  topic: z.union(['general', 'news', 'finance']).default(TAVILY_DEFAULT_TOPIC),
  days: z.number().step(1).min(1).default(TAVILY_DEFAULT_DAYS),
  includeAnswer: z.boolean().default(TAVILY_DEFAULT_INCLUDE_ANSWER),
  numResults: z.number().step(1).min(1).default(TAVILY_DEFAULT_NUM_RESULTS),
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
  ['resolved defaults', {
    apiKeyEnv: 'TAVILY_API_KEY', baseURL: 'https://api.tavily.com',
    searchDepth: 'basic', topic: 'general', days: 7,
    includeAnswer: true, numResults: 5,
  }],
  ['user overrides', {
    apiKeyEnv: 'MY_KEY', baseURL: 'https://x', searchDepth: 'advanced',
    topic: 'news', days: 3, includeAnswer: false, numResults: 10,
  }],
  ['string where number', { days: '7' }],
]
for (const [label, value] of cases) {
  const failure = validateDraft(rehydrated, value)
  console.log(`validate ${label}:`, failure === undefined ? 'PASS' : `FAIL: ${failure}`)
}
