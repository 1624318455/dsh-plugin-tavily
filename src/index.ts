/**
 * `@dsh-external/dsh-plugin-tavily`: a DeepSeek Harness bundle plugin that registers a
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

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import type { WebSearchProvider, WebSearchRequest, WebSearchResult } from '@deepseek-ai/dsh-web'
import {
  TavilySearchProvider,
  TAVILY_DEFAULT_API_KEY_ENV,
  TAVILY_DEFAULT_BASE_URL,
  TAVILY_DEFAULT_INCLUDE_ANSWER,
  TAVILY_DEFAULT_INCLUDE_RAW_CONTENT,
  TAVILY_DEFAULT_MAX_RESULTS,
  TAVILY_DEFAULT_SEARCH_DEPTH,
  TAVILY_DEFAULT_TIMEOUT,
  TAVILY_DEFAULT_TOPIC,
  TAVILY_PROVIDER_ID,
} from './provider'
import type { HybridSearch, TavilySearchProviderOptions } from './provider'

export {
  TAVILY_DEFAULT_API_KEY_ENV,
  TAVILY_DEFAULT_BASE_URL,
  TAVILY_DEFAULT_INCLUDE_ANSWER,
  TAVILY_DEFAULT_INCLUDE_RAW_CONTENT,
  TAVILY_DEFAULT_MAX_RESULTS,
  TAVILY_DEFAULT_SEARCH_DEPTH,
  TAVILY_DEFAULT_TIMEOUT,
  TAVILY_DEFAULT_TOPIC,
  TAVILY_PROVIDER_ID,
  TavilySearchProvider,
} from './provider'
export type { TavilySearchProviderOptions } from './provider'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-tavily'

/** The web seam this provider registers into. */
export const inject = ['web']

/**
 * Plugin config (all optional — `apply` fills env-var and constant defaults).
 *
 * The schema intentionally carries NO `.default()`: the plugin framework
 * validates and normalizes config before `apply`, so a schema default would be
 * baked into the composition `base` seen by the settings card and every field
 * would look "configured from yaml". Code-level defaults live in the provider
 * resolution step, so the card can render placeholders and only mark fields the
 * yaml explicitly set as configuration-covered.
 */
export interface Config {
  /** Literal Tavily API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
  apiKey?: string
  /** Credential reference resolved for each search; defaults to `TAVILY_API_KEY`. */
  apiKeyEnv?: string
  /** Endpoint base; `/search` is appended. Defaults to the public API. */
  baseURL?: string
  /** Search depth sent as Tavily's `search_depth`. Defaults to `basic`. */
  searchDepth?: 'basic' | 'advanced'
  /** Topic sent as Tavily's `topic`. Defaults to `general`. */
  topic?: 'general' | 'news' | 'finance'
  /** Recency window in days; sent only when set (news/finance topics). */
  days?: number
  /** Whether to request Tavily's generated answer. Defaults to `true`. */
  includeAnswer?: boolean
  /** Whether to request Tavily raw page content. Defaults to `false`. */
  includeRawContent?: boolean
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeout?: number
  /** Default result count when a request carries no `maxResults`. Defaults to 5. */
  maxResults?: number
  /** @deprecated Use {@link maxResults} instead. */
  numResults?: number
  /**
   * Search composition mode.
   * - `tavily-only`: the Tavily provider answers directly and does not consult DeepSeek.
   * - `deepseek-first`: the Tavily provider first runs the registered DeepSeek
   *   search provider (when available) and merges its results with Tavily's.
   * Defaults to `tavily-only`.
   */
  searchMode?: 'tavily-only' | 'deepseek-first'
}

export const Config: z<Config> = z.object({
  apiKey: z.string().role('secret').description('Literal Tavily API key. Prefer storing the key through the credentials service instead.'),
  apiKeyEnv: z.string().role('credential-ref').description('Credential reference (environment variable name) resolved for each search.'),
  baseURL: z.string().description('Tavily-compatible endpoint base; `/search` is appended.'),
  searchDepth: z.union(['basic', 'advanced'] as const).description('basic is faster/cheaper; advanced performs deeper retrieval.'),
  topic: z.union(['general', 'news', 'finance'] as const).description('Search topic: general web, news, or finance.'),
  days: z.number().step(1).min(1).max(365).description('Recency window in days; used with news/finance topics.'),
  includeAnswer: z.boolean().description('Request Tavily to generate an answer summary.'),
  includeRawContent: z.boolean().description('Request raw page content; greatly increases context token usage.'),
  timeout: z.number().step(100).min(1000).description('Request timeout in milliseconds.'),
  maxResults: z.number().step(1).min(1).max(20).description('Default number of web results per search.'),
  numResults: z.number().step(1).min(1).max(20).description('Legacy alias for maxResults; prefer maxResults.'),
  searchMode: z.union(['tavily-only', 'deepseek-first'] as const).description('Search composition: Tavily-only or DeepSeek-first with Tavily merge.'),
})

/** Settings namespace carrying this provider's endpoint, depth, topic, and key reference. */
export const WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE = settingsNamespace('web-search-tavily')

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
    apiKeyEnv,
    baseURL: effective.baseURL ?? TAVILY_DEFAULT_BASE_URL,
    searchDepth: effective.searchDepth ?? TAVILY_DEFAULT_SEARCH_DEPTH,
    topic: effective.topic ?? TAVILY_DEFAULT_TOPIC,
    includeAnswer: effective.includeAnswer ?? TAVILY_DEFAULT_INCLUDE_ANSWER,
    includeRawContent: effective.includeRawContent ?? TAVILY_DEFAULT_INCLUDE_RAW_CONTENT,
    timeout: effective.timeout ?? TAVILY_DEFAULT_TIMEOUT,
    maxResults: effective.maxResults ?? effective.numResults ?? TAVILY_DEFAULT_MAX_RESULTS,
    ...effective.days !== undefined ? { days: effective.days } : {},
  }
}

/**
 * Build the optional secondary search used by `deepseek-first` mode.
 *
 * The web seam deliberately exposes no provider lookup API, so this reads the
 * registry through the runtime's internal map. It looks for a provider whose id
 * contains `deepseek` and is available; if none exists the mode degrades to a
 * Tavily-only search (the provider's own catch hides any absence/failure).
 */
function hybridDeepSeekSearch(ctx: Context): HybridSearch {
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

/** Register the Tavily search provider with `ctx.web`. */
export function apply(ctx: Context, config: Config): void {
  const entry = config
  let current: () => Config = () => config
  installSettingsSection(ctx, WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE, Config, config, {
    setSource: (source) => {
      current = source
    },
    // The registration carries no resolved value: the provider projects the
    // section per search, so a committed change needs no re-registration.
    onChange: () => {},
  })
  ctx.web.registerSearchProvider(
    new TavilySearchProvider(
      () => resolveOptions(ctx, current(), entry),
      // Re-evaluate per search so a UI/config switch takes effect live.
      () => current().searchMode === 'deepseek-first' ? hybridDeepSeekSearch(ctx) : undefined,
    ),
  )
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