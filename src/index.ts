/**
 * `@dsh-external/dsh-plugin-tavily`: a DeepSeek Harness bundle plugin that registers a
 * Tavily-backed `WebSearchProvider` into the `ctx.web` seam.
 *
 * A function/namespace plugin (`inject: ['web']`) — it registers INTO the seam's
 * provider registry and does not own the `ctx.web` key. Once installed, select the
 * provider with `searchProvider: tavily` (web config) or `DSH_WEB_SEARCH_PROVIDER=tavily`.
 *
 * @module dsh-plugin-tavily
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import {
  TavilySearchProvider,
  TAVILY_DEFAULT_BASE_URL,
  TAVILY_DEFAULT_INCLUDE_ANSWER,
  TAVILY_DEFAULT_SEARCH_DEPTH,
  TAVILY_DEFAULT_TOPIC,
} from './provider'

export {
  TAVILY_DEFAULT_BASE_URL,
  TAVILY_DEFAULT_INCLUDE_ANSWER,
  TAVILY_DEFAULT_SEARCH_DEPTH,
  TAVILY_DEFAULT_TOPIC,
  TAVILY_PROVIDER_ID,
  TavilySearchProvider,
} from './provider'
export type { TavilySearchProviderOptions } from './provider'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-tavily'

/** The web seam this provider registers into. */
export const inject = ['web']

/** Plugin config (all optional — `apply` fills env-var and constant defaults). */
export interface Config {
  /** Tavily API key. Falls back to `$TAVILY_API_KEY`. Empty → provider unavailable. */
  apiKey?: string
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
  /** Default result count when a request carries no `maxResults`. Omitted = none. */
  numResults?: number
}

export const Config: z<Config> = z.object({
  apiKey: z.string(),
  baseURL: z.string(),
  searchDepth: z.union(['basic', 'advanced'] as const),
  topic: z.union(['general', 'news', 'finance'] as const),
  days: z.number().step(1).min(1),
  includeAnswer: z.boolean(),
  numResults: z.number().step(1).min(1),
})

/** Register the Tavily search provider with `ctx.web`. */
export function apply(ctx: Context, config: Config): void {
  ctx.web.registerSearchProvider(new TavilySearchProvider({
    apiKey: config.apiKey ?? process.env.TAVILY_API_KEY ?? '',
    baseURL: config.baseURL ?? TAVILY_DEFAULT_BASE_URL,
    searchDepth: config.searchDepth ?? TAVILY_DEFAULT_SEARCH_DEPTH,
    topic: config.topic ?? TAVILY_DEFAULT_TOPIC,
    includeAnswer: config.includeAnswer ?? TAVILY_DEFAULT_INCLUDE_ANSWER,
    ...config.days !== undefined ? { days: config.days } : {},
    ...config.numResults !== undefined ? { numResults: config.numResults } : {},
  }))
}
