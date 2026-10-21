/**
 * `@memef1f1y/dsh-plugin-tavily`: a DeepSeek Harness bundle plugin that registers a
 * Tavily-backed `WebSearchProvider` into the `ctx.web` seam and exposes its configurable
 * section to the web settings surface (`设置 → 插件 → 网页搜索`, card `web-search-tavily`).
 *
 * A function/namespace plugin (`inject: ['web']`) — it registers INTO the seam's
 * provider registry and does not own the `ctx.web` key. Once installed, select the
 * provider with `searchProvider: tavily` (web config) or `DSH_WEB_SEARCH_PROVIDER=tavily`.
 *
 * The API key never needs to enter a configuration file: the section names a credential
 * reference (`apiKeyEnv`, default `TAVILY_API_KEY`), the provider resolves it per search
 * through the credentials seam (or the launching environment), and the settings card
 * writes it through the credentials domain, never into the section.
 *
 * @module dsh-plugin-tavily
 */

import type { Context, Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { WebSearchProvider, WebSearchRequest, WebSearchResult } from '@deepseek-ai/dsh-web'
// Type-only: pulls the ctx.webServer Context merge so the probe route is typed.
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  FirecrawlFetchProvider,
  TavilySearchProvider,
  TavilyExtractProvider,
  TAVILY_DEFAULT_API_KEY_ENV,
  TAVILY_DEFAULT_BASE_URL,
  TAVILY_DEFAULT_CACHE_BYPASS_FRESH,
  TAVILY_DEFAULT_CACHE_MAX_ENTRIES,
  TAVILY_DEFAULT_INCLUDE_ANSWER,
  TAVILY_DEFAULT_INCLUDE_RAW_CONTENT,
  TAVILY_DEFAULT_MAX_RESULTS,
  TAVILY_DEFAULT_SEARCH_DEPTH,
  TAVILY_DEFAULT_TIMEOUT,
  TAVILY_DEFAULT_TOPIC,
  TAVILY_EXTRACT_PROVIDER_ID,
  TAVILY_PROVIDER_ID,
  FIRECRAWL_DEFAULT_API_KEY_ENV,
  FIRECRAWL_DEFAULT_BASE_URL,
  FIRECRAWL_PROVIDER_ID,
} from './provider'
import type { DelegateSearch, FirecrawlProviderOptions, TavilySearchProviderOptions } from './provider'

export {
  TAVILY_DEFAULT_API_KEY_ENV,
  TAVILY_DEFAULT_BASE_URL,
  TAVILY_DEFAULT_CACHE_BYPASS_FRESH,
  TAVILY_DEFAULT_CACHE_MAX_ENTRIES,
  TAVILY_DEFAULT_INCLUDE_ANSWER,
  TAVILY_DEFAULT_INCLUDE_RAW_CONTENT,
  TAVILY_DEFAULT_MAX_RESULTS,
  TAVILY_DEFAULT_SEARCH_DEPTH,
  TAVILY_DEFAULT_TIMEOUT,
  TAVILY_DEFAULT_TOPIC,
  TAVILY_DEFAULT_EXTRACT_PATH,
  TAVILY_DEFAULT_USAGE_PATH,
  TAVILY_EXTRACT_PROVIDER_ID,
  TAVILY_PROVIDER_ID,
  FIRECRAWL_DEFAULT_API_KEY_ENV,
  FIRECRAWL_DEFAULT_BASE_URL,
  FIRECRAWL_PROVIDER_ID,
  TavilySearchProvider,
  TavilyExtractProvider,
  FirecrawlFetchProvider,
  estimateSearchCredits,
} from './provider'
export type { FirecrawlProviderOptions, TavilySearchProviderOptions } from './provider'
export type { TavilyStatus, TavilyStatusCodes } from './types'
export type { TavilyUsage } from './types'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-tavily'

/** The seams this plugin registers into: web providers + an HTTP probe route. */
export const inject = ['web', 'webServer']

/**
 * Plugin config as the resolver reads it: a plain, fully-unwrapped section with
 * every field optional.
 *
 * The schema below is declared `.volatile()` on every field (see {@link Config}),
 * so the object the framework hands `apply` is {@link ParsedConfig}, not this
 * shape. `readConfig` unwraps one into the other.
 */
export interface Config {
  /** Literal Tavily API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
  apiKey?: string
  /** Credential reference resolved for each search; defaults to `TAVILY_API_KEY`. */
  apiKeyEnv?: string
  /** Endpoint base; `/search` is appended. Defaults to the public API. */
  baseURL?: string
  /** Search depth sent as Tavily's `search_depth`. Defaults to `basic`. */
  searchDepth?: 'basic' | 'advanced' | 'fast' | 'ultra-fast'
  /** Topic sent as Tavily's `topic`. Defaults to `general`. */
  topic?: 'general' | 'news' | 'finance'
  /** Recency window in days; sent only when set (news/finance topics). */
  days?: number
  /** Answer request: quick (`true`/`basic`) or detailed (`advanced`). Defaults to `true`. */
  includeAnswer?: boolean | 'basic' | 'advanced'
  /** Raw content request: boolean, `markdown`, or `text`. Defaults to `false`. */
  includeRawContent?: boolean | 'markdown' | 'text'
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeout?: number
  /** Snippet chunks per source (1–3). Defaults to 3. */
  chunksPerSource?: number
  /** Recency preset for news/finance topics (e.g. `day`, `week`, `month`). */
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'd' | 'w' | 'm' | 'y'
  /** Include only results published/updated after this `YYYY-MM-DD`. */
  startDate?: string
  /** Include only results published/updated before this `YYYY-MM-DD`. */
  endDate?: string
  /** Collect query-related and per-source images. */
  includeImages?: boolean
  /** With `includeImages`, add a description per image. */
  includeImageDescriptions?: boolean
  /** Include the favicon URL for each result. */
  includeFavicon?: boolean
  /** Only include these domains in results. */
  includeDomains?: string[]
  /** Exclude these domains from results. */
  excludeDomains?: string[]
  /** Boost results from one country (general topic). */
  country?: string
  /** Default result count when a request carries no `maxResults`. Defaults to 5. */
  maxResults?: number
  /** Extra attempts after a rate-limited (429) response. Defaults to 2. */
  retryMaxAttempts?: number
  /** Query-cache TTL in seconds; `0` disables the in-memory result cache. Defaults to 0. */
  cacheTtlSeconds?: number
  /** Maximum cached search entries (LRU cap); the oldest entry is evicted past it. Defaults to 200. */
  cacheMaxEntries?: number
  /** Skip the result cache for recency-sensitive searches (news/finance topic or a time window). Defaults to true. */
  cacheBypassFresh?: boolean
  /** Optional JSON file the result cache is persisted to (survives restarts); `~/` expands, relative = cwd. Defaults to unset (disabled). */
  cacheFile?: string
  /** Concise per-search debug logging (never the key or raw response bodies). Defaults to false. */
  debug?: boolean
  /**
   * Ordered list of additional credential references (e.g. `TAVILY_API_KEY_1`,
   * `TAVILY_API_KEY_2`) forming the multi-key rotation ring together with
   * {@link apiKey} and {@link apiKeyEnv}. Refs only — keys stay in the
   * credentials store / environment. A search rotates through the ring on
   * key-level failures (429 / invalid key / insufficient credits).
   */
  apiKeyRefs?: string[]
  /** How the answer and sources are formatted for the model: `plain` (default) or `footnote` (numbered citations). */
  citeFormat?: 'plain' | 'footnote'
  /** On a Tavily-side failure (timeout / network / 5xx), answer via the official DeepSeek search. `none` (default) or `deepseek`. */
  fallbackEngine?: 'none' | 'deepseek'
  /** Optional Firecrawl fetch provider: endpoint base; `/scrape` appended. Defaults to https://api.firecrawl.dev/v1. */
  firecrawlBaseURL?: string
  /** Optional Firecrawl literal API key; prefer {@link firecrawlApiKeyEnv}. */
  firecrawlApiKey?: string
  /** Firecrawl credential reference resolved for each fetch; defaults to `FIRECRAWL_API_KEY`. */
  firecrawlApiKeyEnv?: string
  /** @deprecated Use {@link maxResults} instead. */
  numResults?: number
  /**
   * Which engine answers `web_search`. `tavily` (default): this provider; if a
   * key is set, Tavily with that key, else keyless. `deepseek`: the official
   * DeepSeek search (useful to switch back without uninstalling). This is the
   * card's engine switch — the single, non-overlapping provider selector.
   */
  engine?: 'tavily' | 'deepseek'
}

/**
 * The config object the framework actually hands `apply`: every field wrapped in
 * a cosmokit Volatile reference, because {@link Config} declares all of them
 * `.volatile()`. A field whose schema carries a `.default()` is `Volatile<T>`;
 * one without is `Volatile<T | undefined>`.
 */
export type ParsedConfig = {
  [K in keyof Config]: Volatile<Config[K]>
}

/**
 * Plugin config schema.
 *
 * Every field carries `.volatile()`: in dsh 0.2.x a settings form exists ONLY for
 * volatile fields — `volatileForm()` returns `undefined` for a schema with none,
 * `SettingsForms.describe()` then skips the entry, and no card ever appears. The
 * marker also makes each parsed value a cosmokit Volatile reference, so `apply`
 * reads fields through `.get()` (see {@link readConfig}) — that indirection is
 * what lets a WebUI edit reach the next search without re-registering anything.
 *
 * The schema stays default-free on purpose: the framework bakes schema defaults
 * into the composition `base` the card renders against, which would make every
 * field look "set from yaml". Code-level defaults live in the resolve step.
 */
export const Config = z.object({
  apiKey: z.string().role('secret').description('Literal Tavily API key. Prefer storing the key through the credentials service instead.').volatile(),
  apiKeyEnv: z.string().role('credential-ref').description('Credential reference (environment variable name) resolved for each search.').volatile(),
  baseURL: z.string().description('Tavily-compatible endpoint base; `/search` is appended.').volatile(),
  searchDepth: z.union(['basic', 'advanced', 'fast', 'ultra-fast'] as const).description('Search depth: basic (balanced), advanced (deeper), fast, ultra-fast (lowest latency).').volatile(),
  topic: z.union(['general', 'news', 'finance'] as const).description('Search topic: general web, news, or finance.').volatile(),
  days: z.number().step(1).min(1).max(365).description('Recency window in days; used with news/finance topics.').volatile(),
  includeAnswer: z.union([z.boolean(), z.union(['basic', 'advanced'] as const)]).description('Answer request: true/basic quick, advanced detailed.').volatile(),
  includeRawContent: z.union([z.boolean(), z.union(['markdown', 'text'] as const)]).description('Raw page content: boolean, markdown, or text; greatly increases context token usage.').volatile(),
  timeout: z.number().step(100).min(1000).description('Request timeout in milliseconds.').volatile(),
  chunksPerSource: z.number().step(1).min(1).max(3).description('Snippet chunks per source (1–3); larger is richer, more tokens.').volatile(),
  timeRange: z.union(['day', 'week', 'month', 'year', 'd', 'w', 'm', 'y'] as const).description('Recency preset for news/finance topics.').volatile(),
  startDate: z.string().description('Include only results after this YYYY-MM-DD date.').volatile(),
  endDate: z.string().description('Include only results before this YYYY-MM-DD date.').volatile(),
  includeImages: z.boolean().description('Collect query-related and per-source images.').volatile(),
  includeImageDescriptions: z.boolean().description('With includeImages, add a description per image.').volatile(),
  includeFavicon: z.boolean().description('Include the favicon URL for each result.').volatile(),
  includeDomains: z.array(z.string()).description('Only include these domains in results.').volatile(),
  excludeDomains: z.array(z.string()).description('Exclude these domains from results.').volatile(),
  country: z.string().description('Boost results from one country (general topic).').volatile(),
  maxResults: z.number().step(1).min(1).max(20).description('Default number of web results per search.').volatile(),
  retryMaxAttempts: z.number().step(1).min(0).max(5).description('Extra attempts after a rate-limited (429) response.').volatile(),
  cacheTtlSeconds: z.number().step(1).min(0).max(3600).description('Query-cache TTL in seconds (0 disables the cache).').volatile(),
  cacheMaxEntries: z.number().step(1).min(1).max(10000).description('Maximum cached search entries (LRU cap; the oldest entry is evicted past it).').volatile(),
  cacheBypassFresh: z.boolean().description('Skip the result cache for recency-sensitive searches (news/finance topic or a time window).').volatile(),
  cacheFile: z.string().description('Optional JSON file the result cache is persisted to (`~/` expands; relative paths resolve against the working directory); unset/empty disables persistence.').volatile(),
  debug: z.boolean().description('Concise per-search debug logging (never the key or raw response bodies).').volatile(),
  apiKeyRefs: z.array(z.string().role('credential-ref')).description('Ordered extra credential references forming the multi-key rotation ring (refs only — keys stay in the credentials store / environment).').volatile(),
  citeFormat: z.union(['plain', 'footnote'] as const).description('How the answer and sources are formatted for the model: plain (Tavily answer alone) or footnote (numbered citation block).').volatile(),
  fallbackEngine: z.union(['none', 'deepseek'] as const).description('On a Tavily-side failure (timeout / network / 5xx), answer via the official DeepSeek search instead.').volatile(),
  firecrawlBaseURL: z.string().description('Optional Firecrawl fetch provider endpoint base; `/scrape` is appended.').volatile(),
  firecrawlApiKey: z.string().role('secret').description('Optional Firecrawl literal API key; prefer the firecrawlApiKeyEnv credential reference.').volatile(),
  firecrawlApiKeyEnv: z.string().role('credential-ref').description('Firecrawl credential reference resolved for each fetch (default FIRECRAWL_API_KEY).').volatile(),
  numResults: z.number().step(1).min(1).max(20).description('Legacy alias for maxResults; prefer maxResults.').volatile(),
  engine: z.union(['tavily', 'deepseek'] as const).description('Answer web_search with Tavily (keyless if no key) or the official DeepSeek provider.').volatile(),
})

/**
 * Settings namespace this plugin's card addresses. In dsh 0.2.x a plugin's
 * settings namespace IS its profile entry id, so this must match the `id` in
 * cordis.patch.yml — the card resolves the form through
 * `ctx.configForms.get(WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE)`.
 */
export const WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE = 'web-search-tavily'

/**
 * Read one config field, whether the framework handed back a Volatile reference
 * (dsh 0.2.x, every field declared `.volatile()`) or a plain value (unit tests
 * and any caller building a bare config object).
 * @param holder - the parsed config object.
 * @param field - the field to read.
 * @returns the current value, or `undefined` when unset.
 */
function readField<K extends keyof Config>(holder: ParsedConfig, field: K): Config[K] {
  const value = holder[field] as unknown
  if (value !== null && typeof value === 'object' && typeof (value as { get?: unknown }).get === 'function') {
    return (value as { get: () => Config[K] }).get()
  }
  return value as Config[K]
}

/**
 * Snapshot every defined field of a parsed config into a plain object, so the
 * resolve step works on plain values regardless of volatile wrapping.
 *
 * Called per operation, not once at `apply`: the volatile references are live,
 * so a WebUI save is picked up by the very next search without re-registering
 * any provider.
 * @param holder - the parsed config object.
 * @returns a plain partial config holding only the fields that are set.
 */
function readConfig(holder: ParsedConfig): Config {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(holder) as (keyof Config)[]) {
    const value = readField(holder, key)
    if (value !== undefined) result[key] = value
  }
  return result as Config
}

/**
 * Project a resolved section into the options the provider serves its next
 * search with. The plugin framework validates/normalizes the composition entry,
 * but we deliberately keep code-level defaults here so the configuration schema
 * stays default-free (see {@link Config}).
 *
 * Priority order: yaml/composition entry (`entry`) > WebUI section (`config`)
 * > code defaults. Since the settings resolver already layers `base` below
 * `user`, the explicit entry fields are re-applied here so a yaml value can
 * never be silently shadowed by a stale WebUI value.
 *
 * @param ctx - plugin context supplying the credential plane.
 * @param config - the currently authoritative settings-section value.
 * @param entry - the plugin's composition entry (cordis.patch.yml `config` block).
 * @returns options for one search.
 */
function resolveOptions(ctx: Context, config: Config, entry: Config): TavilySearchProviderOptions {
  const effective = { ...config, ...definedConfig(entry) }
  const apiKeyEnv = credentialRef(effective.apiKeyEnv ?? TAVILY_DEFAULT_API_KEY_ENV)
  const literalApiKey = effective.apiKey !== undefined && effective.apiKey.length > 0
    ? effective.apiKey
    : undefined
  return {
    ...literalApiKey === undefined ? {} : { apiKey: literalApiKey },
    resolveApiKey: async () => {
      const credentials = ctx.get('credentials')
      if (credentials !== undefined) return (await credentials.resolve(apiKeyEnv))?.value
      // Without the seam the environment is the whole credential plane.
      const ambient = process.env[apiKeyEnv]
      return ambient !== undefined && ambient.length > 0 ? ambient : undefined
    },
    // The multi-key rotation ring resolves each configured reference in order
    // through the same credential plane the single key uses.
    resolveKeyRefs: async (refs) => {
      const credentials = ctx.get('credentials')
      const out: Array<string | undefined> = []
      for (const ref of refs) {
        const reference = credentialRef(ref)
        if (credentials !== undefined) {
          out.push((await credentials.resolve(reference))?.value)
        } else {
          const ambient = process.env[ref]
          out.push(ambient !== undefined && ambient.length > 0 ? ambient : undefined)
        }
      }
      return out
    },
    // The card's Tavily/DeepSeek switch travels as a normal, readable settings
    // field (`engine`), so the provider just derives it per op.
    resolveEnabled: async () => (effective.engine ?? 'tavily') === 'tavily',
    apiKeyEnv,
    baseURL: effective.baseURL ?? TAVILY_DEFAULT_BASE_URL,
    searchDepth: effective.searchDepth ?? TAVILY_DEFAULT_SEARCH_DEPTH,
    topic: effective.topic ?? TAVILY_DEFAULT_TOPIC,
    includeAnswer: effective.includeAnswer ?? TAVILY_DEFAULT_INCLUDE_ANSWER,
    includeRawContent: effective.includeRawContent ?? TAVILY_DEFAULT_INCLUDE_RAW_CONTENT,
    timeout: effective.timeout ?? TAVILY_DEFAULT_TIMEOUT,
    maxResults: effective.maxResults ?? effective.numResults ?? TAVILY_DEFAULT_MAX_RESULTS,
    ...effective.days !== undefined ? { days: effective.days } : {},
    ...effective.chunksPerSource !== undefined ? { chunksPerSource: effective.chunksPerSource } : {},
    ...effective.timeRange !== undefined ? { timeRange: effective.timeRange } : {},
    ...effective.startDate !== undefined ? { startDate: effective.startDate } : {},
    ...effective.endDate !== undefined ? { endDate: effective.endDate } : {},
    ...effective.includeImages !== undefined ? { includeImages: effective.includeImages } : {},
    ...effective.includeImageDescriptions !== undefined ? { includeImageDescriptions: effective.includeImageDescriptions } : {},
    ...effective.includeFavicon !== undefined ? { includeFavicon: effective.includeFavicon } : {},
    ...effective.includeDomains !== undefined ? { includeDomains: effective.includeDomains } : {},
    ...effective.excludeDomains !== undefined ? { excludeDomains: effective.excludeDomains } : {},
    ...effective.country !== undefined ? { country: effective.country } : {},
    ...effective.retryMaxAttempts !== undefined ? { retryMaxAttempts: effective.retryMaxAttempts } : {},
    ...effective.cacheTtlSeconds !== undefined ? { cacheTtlMs: effective.cacheTtlSeconds * 1000 } : {},
    ...effective.cacheMaxEntries !== undefined ? { cacheMaxEntries: effective.cacheMaxEntries } : {},
    ...effective.cacheBypassFresh !== undefined ? { cacheBypassFresh: effective.cacheBypassFresh } : {},
    ...effective.cacheFile !== undefined ? { cacheFile: effective.cacheFile } : {},
    ...effective.debug !== undefined ? { debug: effective.debug } : {},
    ...effective.apiKeyRefs !== undefined ? { apiKeyRefs: effective.apiKeyRefs } : {},
    ...effective.citeFormat !== undefined ? { citeFormat: effective.citeFormat } : {},
    ...effective.fallbackEngine !== undefined ? { fallbackEngine: effective.fallbackEngine } : {},
    log: (message: string) => { ctx.logger('dsh-plugin-tavily').info(message) },
  }
}

/**
 * Build the official DeepSeek search used when the card's engine switch is
 * `deepseek`. The web seam deliberately exposes no public provider-lookup API,
 * so this reads the registry through the runtime's internal map (guarded: an
 * absent map yields no delegate). It looks for a registered provider whose id
 * is `deepseek` (or contains `deepseek`) and is `available()`. If none exists,
 * the provider throws a clear error instead of silently degrading.
 */
function deepseekSearch(ctx: Context): DelegateSearch {
  return async (request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult | undefined> => {
    const web = ctx.web as unknown as { searchProviders?: Map<string, WebSearchProvider> }
    const providers = web.searchProviders
    if (providers === undefined) return undefined
    const direct = providers.get('deepseek')
    const secondary = direct ?? [...providers.values()].find(provider => (
      provider.id !== TAVILY_PROVIDER_ID && provider.id.includes('deepseek') && provider.available()
    ))
    if (secondary === undefined || !secondary.available()) return undefined
    return secondary.search(request, signal)
  }
}

/**
 * Resolve the web seam's configured search-provider id (`config.searchProvider`
 * ?? `DSH_WEB_SEARCH_PROVIDER`), or `undefined` when selection is left to the
 * seam's auto-selection rules.
 *
 * This is an informational read of a runtime-internal field; it never mutates
 * anything and is only used to warn when the active provider is not Tavily.
 */
function configuredSearchProviderId(ctx: Context): string | undefined {
  const web = ctx.web as unknown as { searchProviderId?: string }
  return web.searchProviderId
}

/**
 * Project the resolved section into options for the optional Firecrawl fetch
 * provider. Same priority contract as {@link resolveOptions}: yaml/composition
 * entry > WebUI section > code defaults. Firecrawl only answers URL retrieval
 * (the fetch seam); search always stays on Tavily.
 * @param ctx - plugin context supplying the credential plane.
 * @param config - the currently authoritative settings-section value.
 * @param entry - the plugin's composition entry.
 * @returns options for one Firecrawl fetch.
 */
function resolveFirecrawlOptions(ctx: Context, config: Config, entry: Config): FirecrawlProviderOptions {
  const effective = { ...config, ...definedConfig(entry) }
  const apiKeyEnv = credentialRef(effective.firecrawlApiKeyEnv ?? FIRECRAWL_DEFAULT_API_KEY_ENV)
  const literalKey = effective.firecrawlApiKey !== undefined && effective.firecrawlApiKey.length > 0
    ? effective.firecrawlApiKey
    : undefined
  return {
    ...literalKey === undefined ? {} : { apiKey: literalKey },
    resolveApiKey: async () => {
      const credentials = ctx.get('credentials')
      if (credentials !== undefined) return (await credentials.resolve(apiKeyEnv))?.value
      const ambient = process.env[apiKeyEnv]
      return ambient !== undefined && ambient.length > 0 ? ambient : undefined
    },
    apiKeyEnv,
    baseURL: effective.firecrawlBaseURL ?? FIRECRAWL_DEFAULT_BASE_URL,
    timeout: effective.timeout ?? TAVILY_DEFAULT_TIMEOUT,
    ...effective.debug !== undefined ? { debug: effective.debug } : {},
    log: (message: string) => { ctx.logger('dsh-plugin-tavily').info(message) },
  }
}

/** Register the Tavily search provider with `ctx.web`. */
export function apply(ctx: Context, config: ParsedConfig): void {
  // The composition entry as yaml declared it: read once, through the volatile
  // wrappers, so the resolve step can let yaml win over a WebUI value for the
  // fields the file actually set.
  const entry = readConfig(config)
  // Every provider below reads the section through this thunk, per operation.
  // In dsh 0.2.x a settings edit mutates the live volatile references in place,
  // so nothing needs re-registering when the user saves: the next search simply
  // sees the new value.
  const current = (): Config => readConfig(config)
  const provider = new TavilySearchProvider(
    () => resolveOptions(ctx, current(), entry),
    // When the card's engine switch is `deepseek`, answer through the official
    // DeepSeek provider (the one registered by dsh-web-search-deepseek).
    () => deepseekSearch(ctx),
  )
  ctx.web.registerSearchProvider(provider)
  // Dual-half: also register a Tavily Extract-backed fetch provider. Selecting
  // it is opt-in via `fetchProvider: tavily-extract` (or DSH_WEB_FETCH_PROVIDER).
  ctx.web.registerFetchProvider(
    new TavilyExtractProvider(() => resolveOptions(ctx, current(), entry)),
  )
  // Optional second fetch provider: Firecrawl-backed page retrieval, inert
  // until `fetchProvider: firecrawl` is selected AND its own key resolves.
  ctx.web.registerFetchProvider(
    new FirecrawlFetchProvider(() => resolveFirecrawlOptions(ctx, current(), entry)),
  )
  // Server-side probe so the card can test a stored key (browsers cannot read
  // stored secrets back). POST /api/tavily-probe { apiKey?, clearKey? }.
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tavily-probe',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, code: 'other', error: 'method not allowed' })
        return
      }
      try {
        const body = await readJsonBody(req)
        const draft = typeof body.apiKey === 'string' ? body.apiKey : undefined
        const clearKey = body.clearKey === true
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        res.end(JSON.stringify(await provider.probe(draft, clearKey)))
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        if (detail === 'invalid JSON body' || detail === 'body too large') {
          sendJson(res, 400, { ok: false, code: 'other', error: detail })
          return
        }
        sendJson(res, 200, { ok: false, code: 'other', error: detail })
      }
    },
  })
  // Server-side status for the card's indicator: GET /api/tavily-status reads
  // the stored key (browsers cannot read it) and Tavily GET /usage — which
  // costs no search credits — then reports ok/low/error in a structured payload.
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tavily-status',
    handler: async (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { ok: false, code: 'other', error: 'method not allowed' })
        return
      }
      try {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        res.end(JSON.stringify(await provider.status()))
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        sendJson(res, 200, { ok: false, code: 'other', error: detail, checkedAt: Date.now() })
      }
    },
  })
  warnIfNotActiveSearchProvider(ctx)
}

/** Serialize a JSON response. */
function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(payload))
}

/** Read and parse a small JSON request body. */
function readJsonBody(req: IncomingMessage, limit = 4096): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim()
      if (text === '') {
        resolve({})
        return
      }
      try {
        const json = JSON.parse(text)
        resolve(json !== null && typeof json === 'object' && !Array.isArray(json) ? json as Record<string, unknown> : {})
      } catch {
        reject(new Error('invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

/**
 * Warn when another provider is elected for `web_search` instead of this
 * plugin's `tavily`. Because the bundle now elects `tavily` itself
 * (`web.searchProvider: tavily`), a fresh install should not hit this; it fires
 * only if a later `web` patch overrides the provider. `engine` (the card switch)
 * selects between Tavily and official DeepSeek underneath the single provider.
 */
function warnIfNotActiveSearchProvider(ctx: Context): void {
  const logger = ctx.logger('dsh-plugin-tavily')
  const active = configuredSearchProviderId(ctx)
  const FIX = 'ensure web.config.searchProvider: tavily in cordis.patch.yml (the plugin already sets it), then restart dsh.'
  if (active !== undefined && active !== TAVILY_PROVIDER_ID) {
    logger.warn(
      `web_search is currently configured to the "${active}" search provider, NOT Tavily.`
      + ` To use this plugin, ${FIX}`,
    )
  } else if (active === undefined) {
    logger.warn(
      'no web search provider is explicitly selected; the seam auto-selects.'
      + ` If web_search is answered by another provider (e.g. deepseek) and reports a missing DeepSeek key, ${FIX}`,
    )
  }
}

/** Copy only explicitly defined entry fields, so validation-added keys never count as yaml overrides. */
function definedConfig(config: Config): Partial<Config> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(config) as (keyof Config)[]) {
    const value = config[key]
    if (value !== undefined) result[key] = value
  }
  return result as Partial<Config>
}