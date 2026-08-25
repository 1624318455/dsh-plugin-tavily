/**
 * `TavilySearchProvider`: a `WebSearchProvider` backed by the Tavily search API (`POST
 * /search`). It maps the `content` field of each flat `results[]` entry to `snippet`,
 * maps `published_date` to `publishedAt`, drops entries without content, and carries
 * Tavily's generated `answer` (when requested) as `content` on the normalized result.
 * @module dsh-plugin-tavily/provider
 */

import { WebError } from '@deepseek-ai/dsh-web'
import type {
  WebFetchBody,
  WebFetchProvider,
  WebFetchRequest,
  WebFetchResult,
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '@deepseek-ai/dsh-web'
import type {
  TavilyError,
  TavilyExtractRequest,
  TavilyExtractResponse,
  TavilyIncludeAnswer,
  TavilyIncludeRawContent,
  TavilyResult,
  TavilySearchDepth,
  TavilySearchResponse,
  TavilyStatus,
  TavilyStatusCodes,
  TavilyTimeRange,
  TavilyUsage,
} from './types'

/** Stable id this provider registers under. */
export const TAVILY_PROVIDER_ID = 'tavily'

/** Stable id the Tavily Extract fetch provider registers under. */
export const TAVILY_EXTRACT_PROVIDER_ID = 'tavily-extract'

/** Default Tavily endpoint; `/search` is the operation. */
export const TAVILY_DEFAULT_BASE_URL = 'https://api.tavily.com'

/** Usage (credit) endpoint appended to the base URL. */
export const TAVILY_DEFAULT_USAGE_PATH = '/usage'

/** Extract (page retrieval) endpoint appended to the base URL. */
export const TAVILY_DEFAULT_EXTRACT_PATH = '/extract'

/** Default search depth: `basic` (balanced cost/latency/relevance). */
export const TAVILY_DEFAULT_SEARCH_DEPTH: TavilySearchDepth = 'basic'

/** Default topic: the general web (not news or finance). */
export const TAVILY_DEFAULT_TOPIC = 'general'

/** Default: request Tavily's generated quick answer and carry it as `content`. */
export const TAVILY_DEFAULT_INCLUDE_ANSWER: TavilyIncludeAnswer = true

/** Default: do not ask Tavily to return raw page content (context-heavy). */
export const TAVILY_DEFAULT_INCLUDE_RAW_CONTENT: TavilyIncludeRawContent = false

/** Default snippet chunks per source (Tavily's own default). */
export const TAVILY_DEFAULT_CHUNKS_PER_SOURCE = 3

/** Default per-request timeout in milliseconds. */
export const TAVILY_DEFAULT_TIMEOUT = 30_000

/** Default result count when a request carries no `maxResults`. */
export const TAVILY_DEFAULT_MAX_RESULTS = 5

/** Default number of extra attempts after a rate-limited (429) response. */
export const TAVILY_DEFAULT_RETRY_MAX_ATTEMPTS = 2

/** Default query cache TTL in ms; `0` disables the result cache. */
export const TAVILY_DEFAULT_CACHE_TTL_MS = 0

/** Default maximum cached search entries; the oldest entry is evicted past this cap. */
export const TAVILY_DEFAULT_CACHE_MAX_ENTRIES = 200

/**
 * Default: skip the result cache for recency-sensitive searches (news/finance
 * topics or any explicit time window), so a cached snapshot never answers a
 * question the user framed as "right now".
 */
export const TAVILY_DEFAULT_CACHE_BYPASS_FRESH = true

/**
 * Consecutive key-level failures (429 / invalid key / insufficient credits)
 * after which a key enters a cooldown so the ring prefers the healthy keys.
 */
const KEY_FAILOVER_THRESHOLD = 3

/** Cooldown (ms) a key sits out after reaching the failover threshold. */
const KEY_COOLDOWN_MS = 60_000

/** Base delay (ms) for the exponential rate-limit backoff before retrying. */
const RETRY_BASE_DELAY_MS = 250

/** Ceiling (ms) for the exponential rate-limit backoff. */
const RETRY_MAX_DELAY_MS = 4_000

/** Credential reference resolved when the section names none. */
export const TAVILY_DEFAULT_API_KEY_ENV = 'TAVILY_API_KEY'

/** Attribution header sent on every request. Bump with the package version. */
const USER_AGENT = 'dsh-plugin-tavily/0.5.0'

/**
 * Resolved provider options. `apply` supplies env-var and constant defaults; the
 * credential itself is resolved once per operation through `resolveApiKey` (or
 * taken literally from `apiKey`), so a settings edit never re-registers the provider.
 */
export interface TavilySearchProviderOptions {
  /** Literal Tavily API key; prefer {@link resolveApiKey} so no secret enters configuration files. */
  apiKey?: string
  /** Resolve the operation's key; returned when the literal is absent. */
  resolveApiKey?: () => Promise<string | undefined>
  /**
   * Ordered list of additional credential references (e.g. `TAVILY_API_KEY_1`,
   * `TAVILY_API_KEY_2`) resolved for the rotation ring. Together with the
   * literal key and {@link apiKeyEnv} they form the multi-key ring a search
   * rotates through on key-level failures (429 / invalid key / insufficient
   * credits). Refs only — keys themselves stay in the credentials store or env.
   */
  apiKeyRefs?: readonly string[]
  /**
   * Resolve a list of credential references in order; one `undefined` per ref
   * when that layer has no value. Used to build the rotation ring per operation.
   */
  resolveKeyRefs?: (refs: readonly string[]) => Promise<ReadonlyArray<string | undefined>>
  /**
   * How the generated answer and sources are formatted for the model:
   * `plain` (default) carries Tavily's answer alone; `footnote` appends a
   * numbered source block (`[1] title — url …`) that the model can cite.
   */
  citeFormat?: 'plain' | 'footnote'
  /**
   * When the Tavily search fails with a Tavily-side problem (timeout, network,
   * or 5xx service error), answer through the official DeepSeek provider as a
   * last resort. `none` (default) never falls back; `deepseek` requires a
   * registered DeepSeek search. Key-level failures (429 / 401) do not trigger
   * this — they are credential problems, not outages.
   */
  fallbackEngine?: 'none' | 'deepseek'
  /**
   * Resolve whether the card's Tavily/DeepSeek switch is on. Defaults to `true`
   * (Tavily) when absent; `false` makes this provider delegate to the official
   * DeepSeek search instead.
   */
  resolveEnabled?: () => Promise<boolean>
  /** Credential reference named in diagnostics; defaults to `TAVILY_API_KEY`. */
  apiKeyEnv?: string
  /** Endpoint base; `/search` is appended. */
  baseURL: string
  /** Search depth sent as Tavily's `search_depth` (basic/advanced/fast/ultra-fast). */
  searchDepth: TavilySearchDepth
  /** Topic sent as Tavily's `topic`. */
  topic: 'general' | 'news' | 'finance'
  /** Answer request: `true`/`basic` (quick) or `advanced` (detailed). */
  includeAnswer: TavilyIncludeAnswer
  /** Raw content request: boolean, `markdown`, or `text`. */
  includeRawContent: TavilyIncludeRawContent
  /** Request timeout in milliseconds. */
  timeout: number
  /** Recency window in days; sent only when set (news/finance topics). */
  days?: number
  /** Snippet chunks per source (1–3, Tavily default 3). */
  chunksPerSource?: number
  /** Recency preset (news/finance topics); e.g. `day`, `week`, `month`. */
  timeRange?: TavilyTimeRange
  /** Include results published/updated after this `YYYY-MM-DD`. */
  startDate?: string
  /** Include results published/updated before this `YYYY-MM-DD`. */
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
  /** Default result count when a request carries no `maxResults`. */
  maxResults?: number
  /** Extra attempts after a rate-limited (429) response; `0` disables retry. */
  retryMaxAttempts?: number
  /** Query-cache TTL in ms; `0` disables the (in-memory) result cache. */
  cacheTtlMs?: number
  /**
   * Maximum cached search entries; the oldest entry is evicted past this cap.
   * Defaults to {@link TAVILY_DEFAULT_CACHE_MAX_ENTRIES}.
   */
  cacheMaxEntries?: number
  /**
   * Skip the result cache for recency-sensitive searches (news/finance topics
   * or any explicit time window). Defaults to {@link TAVILY_DEFAULT_CACHE_BYPASS_FRESH}.
   */
  cacheBypassFresh?: boolean
  /**
   * Concise per-operation debug logging (query excerpt, credits, cache state,
   * duration, error code+message) through {@link log}. Never logs the key or
   * raw response bodies. Defaults to `false`.
   */
  debug?: boolean
  /** Sink for one concise debug line; only called while `debug` is on. */
  log?: (message: string) => void
  /** @deprecated Use {@link maxResults} instead. */
  numResults?: number
}

/**
 * The official DeepSeek search used when the card's engine switch is `deepseek`.
 * Returning `undefined` means no DeepSeek provider is available; the caller then
 * throws a clear error instead of silently degrading.
 */
export type DelegateSearch = (request: WebSearchRequest, signal?: AbortSignal) => Promise<WebSearchResult | undefined>

/**
 * Map one Tavily result to a normalized source, or `undefined` when it carries no
 * portable snippet (an entry with no non-blank `content` is dropped — the seam has no
 * other field to derive a snippet from, and inventing one would lie).
 *
 * @param result - one entry of Tavily's `results[]`.
 * @returns the normalized source, or `undefined` when the entry has no non-blank content.
 */
export function mapTavilyResult(result: TavilyResult): WebSearchSource | undefined {
  const snippet = result.content?.trim()
  if (snippet === undefined || snippet.length === 0) return undefined
  return {
    url: result.url,
    ...result.title != null && result.title.length > 0 ? { title: result.title } : {},
    snippet,
    ...result.published_date != null && result.published_date.length > 0 ? { publishedAt: result.published_date } : {},
  }
}

/**
 * Map a Tavily response envelope to a normalized search result.
 *
 * @param response - the parsed `POST /search` response body.
 * @param citeFormat - `plain` (default) carries the generated answer alone;
 *   `footnote` appends a numbered source block the model can cite, so the
 *   answer text and `[1] title — url` citations travel in one `content`.
 * @returns the normalized result; content-less entries are dropped
 *   ({@link mapTavilyResult}), and the generated answer (when present) becomes
 *   `content`.
 */
export function mapTavilyResponse(
  response: TavilySearchResponse,
  citeFormat: 'plain' | 'footnote' = 'plain',
): WebSearchResult {
  const sources = (response.results ?? [])
    .map(mapTavilyResult)
    .filter((source): source is WebSearchSource => source !== undefined)
  const answer = response.answer
  let content: string | undefined
  if (answer != null && answer.length > 0) {
    content = answer
    if (citeFormat === 'footnote' && sources.length > 0) {
      content += '\n\n' + footnoteBlock(sources)
    }
  } else if (citeFormat === 'footnote' && sources.length > 0) {
    content = footnoteBlock(sources)
  }
  // The generated answer is optional provider text; the seam owns the final
  // `maxResults` truncation, so this provider reports `truncated: false`.
  return {
    ...content !== undefined && content.length > 0 ? { content } : {},
    sources,
    truncated: false,
  }
}

/**
 * Build the numbered citation block footnote mode appends to the answer:
 * one `[N] title — url` line per source with a short snippet excerpt, so the
 * model can reference sources by number.
 * @param sources - the normalized sources.
 * @returns a plain-text numbered block, or nothing when there are no sources.
 */
function footnoteBlock(sources: readonly WebSearchSource[]): string {
  const lines = sources.map((source, index) => {
    const title = source.title !== undefined && source.title.length > 0 ? source.title : source.url
    const line = `[${index + 1}] ${title} — ${source.url}`
    if (source.snippet !== undefined && source.snippet.length > 0) {
      const excerpt = source.snippet.length > 240 ? `${source.snippet.slice(0, 240)}…` : source.snippet
      return `${line}\n   ${excerpt}`
    }
    return line
  })
  return `Sources:\n${lines.join('\n')}`
}

/**
 * Estimated Tavily credits one search at this depth consumes. `advanced`
 * costs 2 credits; `basic`, `fast`, and `ultra-fast` cost 1 each.
 * @param searchDepth - the configured/given search depth.
 * @returns the estimated credit cost.
 */
export function estimateSearchCredits(searchDepth: TavilySearchDepth): number {
  return searchDepth === 'advanced' ? 2 : 1
}

/** One in-memory cached search result with its expiry timestamp. */
interface CacheEntry {
  /** Wall-clock expiry; the entry is ignored once `Date.now()` passes it. */
  expires: number
  /** The normalized result returned on a hit. */
  result: WebSearchResult
}

/** Cache outcome of one search, reported into the debug log line. */
interface SearchStats {
  /** `hit`: served from cache; `miss`: fetched and cached; `bypassed`: fresh-sensitive (not cached); `disabled`: TTL 0. */
  cache: 'hit' | 'miss' | 'bypassed' | 'disabled'
}

/** The Tavily-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export class TavilySearchProvider implements WebSearchProvider {
  readonly id = TAVILY_PROVIDER_ID

  /** Short-lived in-memory result cache, keyed by a request/options fingerprint. */
  private readonly cache = new Map<string, CacheEntry>()

  /** Per-key failover state: consecutive failures and the cooldown expiry. */
  private readonly keyStates = new Map<string, { failures: number; cooldownUntil: number }>()

  /** Ring cursor: the next search starts at this key so failures rotate fairly. */
  private rotationCursor = 0

  /**
   * @param resolveOptions - thunk producing one operation's option snapshot. The
   *   section is re-read per search, so a settings edit applies live without
   *   re-registration; the snapshot also keeps the resolved key and the endpoint
   *   it is sent to from one section.
   * @param deepseekDelegate - thunk returning the official DeepSeek search to
   *   answer when the card's engine switch is `deepseek`. Evaluated per op, so
   *   switching engines takes effect live.
   */
  constructor(
    private readonly resolveOptions: () => TavilySearchProviderOptions,
    private readonly deepseekDelegate?: () => DelegateSearch | undefined,
  ) {}

  available(): boolean {
    const options = this.resolveOptions()
    return ((options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== undefined)
      && isValidBaseUrl(options.baseURL)
      && (options.days === undefined || isPositiveInteger(options.days))
      && (options.chunksPerSource === undefined || isPositiveInteger(options.chunksPerSource))
      && (options.maxResults === undefined || isPositiveInteger(options.maxResults))
      && (options.numResults === undefined || isPositiveInteger(options.numResults))
      && (options.timeout === undefined || options.timeout > 0)
      && (options.retryMaxAttempts === undefined || options.retryMaxAttempts >= 0)
      && (options.cacheTtlMs === undefined || options.cacheTtlMs >= 0)
  }

  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    const options = this.resolveOptions()
    const started = Date.now()
    // The card's engine switch: `tavily` (default) answers through Tavily
    // (keyless if no key); `deepseek` answers through the official DeepSeek
    // provider. One switch, no overlapping modes.
    const enabled = await (options.resolveEnabled?.() ?? Promise.resolve(true))
    if (!enabled) {
      const deepseek = this.deepseekDelegate?.()
      if (deepseek === undefined) {
        throw new WebError(
          'Tavily is switched to the official DeepSeek provider, but no DeepSeek search is available;'
          + ' configure a DeepSeek key or switch back to Tavily',
          'WEB_PROVIDER_ERROR',
        )
      }
      const delegated = await deepseek(request, signal)
      if (delegated === undefined) {
        throw new WebError('official DeepSeek search returned no result', 'WEB_PROVIDER_ERROR')
      }
      debugLog(options, `search "${truncateQuery(request.query)}" -> deepseek engine, ${Date.now() - started}ms, ${delegated.sources.length} sources`)
      return delegated
    }
    // The rotation ring: literal key first, then every configured credential
    // reference. A search rotates through the ring on key-level failures.
    const keys = await requestKeyRing(options, signal)
    const stats: SearchStats = { cache: 'disabled' }
    const startIndex = this.rotationCursor % keys.length
    let lastFailure: WebError | undefined
    for (let i = 0; i < keys.length; i++) {
      const key = keys[(startIndex + i) % keys.length]
      if (this.keyCooldownUntil(key) > Date.now()) continue
      try {
        const result = await this.tavilySearch(request, signal, options, key, stats)
        this.noteKeySuccess(key)
        this.rotationCursor = (startIndex + i + 1) % keys.length
        debugLog(
          options,
          `search "${truncateQuery(request.query)}" depth=${options.searchDepth} `
          + `results=${result.sources.length} credits=${estimateSearchCredits(options.searchDepth)} `
          + `cache=${stats.cache} ${Date.now() - started}ms`,
        )
        return result
      } catch (error: unknown) {
        const code = tavilyCodeOf(error)
        if (code !== undefined && isRotatableCode(code)) {
          // Key-level failure: another key in the ring may still work.
          this.noteKeyFailure(key)
          debugLog(options, `search "${truncateQuery(request.query)}" key rotated (${code}): ${describeSearchError(error)}`)
          lastFailure = error instanceof WebError
            ? error
            : new WebError(String(error), 'WEB_PROVIDER_ERROR')
          continue
        }
        debugLog(options, `search "${truncateQuery(request.query)}" failed: ${describeSearchError(error)}`)
        // Rate-limit/credit faults never trigger the fallback engine (they are
        // credential problems); a Tavily-side outage just might.
        const fallen = await this.tryTavilyFallback(options, request, signal, error)
        if (fallen !== undefined) return fallen
        throw error
      }
    }
    // Every ring entry was failed or in cooldown; surface the last failure
    // (or a clear message when the ring held only cooled-down keys).
    if (lastFailure !== undefined) throw lastFailure
    throw new WebError(
      'Tavily search failed: every API key in the rotation ring is in cooldown after repeated failures',
      'WEB_PROVIDER_ERROR',
    )
  }

  /**
   * When the Tavily call failed with a Tavily-side problem and `fallbackEngine`
   * is `deepseek`, answer through the official DeepSeek provider once.
   * @returns the delegated result, or `undefined` when no fallback applies.
   */
  private async tryTavilyFallback(
    options: TavilySearchProviderOptions,
    request: WebSearchRequest,
    signal: AbortSignal | undefined,
    original: unknown,
  ): Promise<WebSearchResult | undefined> {
    if (options.fallbackEngine !== 'deepseek') return undefined
    const code = tavilyCodeOf(original)
    if (code === undefined || !isFallbackCode(code)) return undefined
    const deepseek = this.deepseekDelegate?.()
    if (deepseek === undefined) return undefined
    try {
      const delegated = await deepseek(request, signal)
      if (delegated === undefined) return undefined
      debugLog(options, `search "${truncateQuery(request.query)}" fell back to DeepSeek (${code})`)
      return delegated
    } catch (_delegateFailure) {
      return undefined
    }
  }

  /** A successful search clears a key's failover marks. */
  private noteKeySuccess(key: string): void {
    this.keyStates.delete(key)
  }

  /** One key-level failure; past the threshold the key enters a cooldown. */
  private noteKeyFailure(key: string): void {
    const state = this.keyStates.get(key) ?? { failures: 0, cooldownUntil: 0 }
    state.failures += 1
    if (state.failures >= KEY_FAILOVER_THRESHOLD) {
      state.cooldownUntil = Date.now() + KEY_COOLDOWN_MS
      state.failures = 0
    }
    this.keyStates.set(key, state)
  }

  /** When the key's cooldown expires; `0` means not in cooldown. */
  private keyCooldownUntil(key: string): number {
    return this.keyStates.get(key)?.cooldownUntil ?? 0
  }

  /**
   * Fetch the current key/account credit usage from Tavily's `/usage` endpoint.
   *
   * Host-side entry point for usage/cost tooling (the card's browser half can
   * only reach Tavily directly with a freshly-typed key; this method runs where
   * the stored key is available). Uses the same per-operation option snapshot,
   * timeout, and abort classification as {@link search}.
   * @param signal - optional cancellation signal.
   * @returns the normalized usage envelope.
   */
  async usage(signal?: AbortSignal): Promise<TavilyUsage> {
    const options = this.resolveOptions()
    const apiKey = await resolveRequestApiKey(options, signal)
    const { signal: requestSignal, timeoutSignal } = makeRequestSignal(signal, options.timeout)
    let response: Response
    try {
      response = await fetch(`${options.baseURL}${TAVILY_DEFAULT_USAGE_PATH}`, {
        method: 'GET',
        redirect: 'error',
        headers: {
          'authorization': `Bearer ${apiKey}`,
          'accept': 'application/json',
          'user-agent': USER_AGENT,
        },
        ...requestSignal !== undefined ? { signal: requestSignal } : {},
      })
    } catch (error: unknown) {
      throw classifiedSearchError(error, signal, timeoutSignal, options.timeout)
    }
    if (!response.ok) {
      let message = `Tavily usage API error (HTTP ${response.status})`
      try {
        const parsed = await response.json() as TavilyError
        const detail = parsed.detail?.error ?? parsed.error ?? parsed.message
        if (detail !== undefined && detail.length > 0) message = detail
      } catch (_errorBodyReadFailure) {
        // Keep the HTTP-status message; a timeout / abort here follows the same rules.
        if (timeoutSignal?.aborted === true) {
          throw new WebError(`Tavily usage timed out after ${options.timeout}ms`, 'WEB_PROVIDER_ERROR')
        }
        if (signal?.aborted === true) throw searchAborted(signal)
      }
      throw new WebError(message, 'WEB_PROVIDER_ERROR')
    }
    try {
      return await response.json() as TavilyUsage
    } catch (error: unknown) {
      throw classifiedSearchError(error, signal, timeoutSignal, options.timeout)
    }
  }

  /**
   * Read the current key/account credit usage for the card's status indicator.
   *
   * Unlike {@link usage} this never throws for a missing/stored-only credential:
   * it resolves the stored key server-side (the card cannot read it), reports
   * `no-key` when none is configured, and always returns a structured outcome
   * the route can serialize directly. Reading `/usage` consumes no search
   * credits.
   * @param signal - optional cancellation signal.
   * @returns a structured status outcome.
   */
  async status(signal?: AbortSignal): Promise<TavilyStatus> {
    const options = this.resolveOptions()
    const checkedAt = Date.now()
    let apiKey: string
    try {
      apiKey = await resolveRequestApiKey(options, signal)
    } catch (error: unknown) {
      if (error instanceof WebError && error.code === 'WEB_PROVIDER_CREDENTIAL_MISSING') {
        return { ok: false, code: 'no-key', checkedAt }
      }
      return { ok: false, code: 'other', error: String(error), checkedAt }
    }
    const { signal: requestSignal, timeoutSignal } = makeRequestSignal(signal, options.timeout)
    let response: Response
    try {
      response = await fetch(`${options.baseURL}${TAVILY_DEFAULT_USAGE_PATH}`, {
        method: 'GET',
        redirect: 'error',
        headers: {
          'authorization': `Bearer ${apiKey}`,
          'accept': 'application/json',
          'user-agent': USER_AGENT,
        },
        ...requestSignal !== undefined ? { signal: requestSignal } : {},
      })
    } catch (error: unknown) {
      if (timeoutSignal?.aborted === true) {
        return { ok: false, code: 'timeout', error: `timed out after ${options.timeout}ms`, checkedAt }
      }
      debugLog(options, `status failed: network ${String(error)}`)
      return { ok: false, code: 'network', error: String(error), checkedAt }
    }
    if (!response.ok) {
      let message = `HTTP ${response.status}`
      try {
        const parsed = await response.json() as TavilyError
        message = parsed.detail?.error ?? parsed.error ?? parsed.message ?? message
      } catch (_errorBodyReadFailure) {
        // Keep the status message.
      }
      const code = classifyTavilyHttpStatus(response.status, message)
      debugLog(options, `status failed: ${code} ${message}`)
      return { ok: false, code, error: message, checkedAt }
    }
    try {
      const usage = await response.json() as TavilyUsage
      const remaining = usage.key?.usage
      const limit = usage.key?.limit ?? null
      const low = remaining !== undefined && limit !== null && typeof limit === 'number'
        && remaining <= Math.max(1, limit * 0.2)
      debugLog(options, `status ok: remaining=${remaining ?? '?'} limit=${limit ?? 'unlimited'} plan=${usage.account?.current_plan ?? '?'}`)
      return {
        ok: true,
        code: low ? 'low' : 'ok',
        remaining,
        limit,
        searchUsed: usage.key?.search_usage,
        plan: usage.account?.current_plan,
        checkedAt,
      }
    } catch (error: unknown) {
      debugLog(options, `status failed: parse ${String(error)}`)
      return { ok: false, code: 'other', error: String(error), checkedAt }
    }
  }

  /**
   * Verify connectivity with the resolved (possibly stored) API key by issuing a
   * minimal `POST /search`. This is the host-side counterpart to the card's
   * browser test — it runs where the stored key is available, whereas the
   * browser cannot read stored secrets back.
   * @param signal - optional cancellation signal.
   * @returns `true` when Tavily accepted the request.
   * @throws {@link WebError} (`WEB_PROVIDER_ERROR` / `WEB_ABORTED`) on failure.
   */
  async connectivityTest(signal?: AbortSignal): Promise<boolean> {
    const options = this.resolveOptions()
    const apiKey = await resolveRequestApiKey(options, signal)
    const { signal: requestSignal, timeoutSignal } = makeRequestSignal(signal, options.timeout)
    let response: Response
    try {
      response = await fetch(`${options.baseURL}/search`, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
          'accept': 'application/json',
          'user-agent': USER_AGENT,
        },
        body: JSON.stringify({
          query: 'connectivity test',
          search_depth: 'basic',
          topic: 'general',
          include_answer: false,
          max_results: 1,
        }),
        ...requestSignal !== undefined ? { signal: requestSignal } : {},
      })
    } catch (error: unknown) {
      throw classifiedSearchError(error, signal, timeoutSignal, options.timeout)
    }
    if (!response.ok) {
      let message = `Tavily connectivity test failed (HTTP ${response.status})`
      try {
        const parsed = await response.json() as TavilyError
        const detail = parsed.detail?.error ?? parsed.error ?? parsed.message
        if (detail !== undefined && detail.length > 0) message = detail
      } catch (error: unknown) {
        if (timeoutSignal?.aborted === true) {
          throw new WebError(`Tavily connectivity test timed out after ${options.timeout}ms`, 'WEB_PROVIDER_ERROR', { cause: error })
        }
        if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
      }
      throw new WebError(message, 'WEB_PROVIDER_ERROR')
    }
    return true
  }

  /**
   * Probe Tavily connectivity for the card's server route. Unlike the browser
   * test (which cannot read a stored key), this runs host-side so it can test a
   * stored key; otherwise it falls back to the currently staged draft, and then
   * to keyless. Returns a structured outcome rather than throwing, so the HTTP
   * route can serialize it directly.
   * @param draft - a staged API key (optional; wins over the stored key).
   * @param clearKey - when true, ignore both the draft and any stored key.
   * @returns `{ ok, mode, code?, error? }`.
   */
  async probe(
    draft?: string,
    clearKey = false,
  ): Promise<{ ok: boolean; mode: 'key' | 'keyless'; code?: string; error?: string }> {
    const options = this.resolveOptions()
    let apiKey = draft?.trim() ?? ''
    if (apiKey === '' && !clearKey) {
      try {
        apiKey = await resolveRequestApiKey(options)
      } catch (_resolveFailure) {
        apiKey = ''
      }
    }
    const mode: 'key' | 'keyless' = apiKey.length > 0 ? 'key' : 'keyless'
    try {
      const { signal: requestSignal, timeoutSignal } = makeRequestSignal(undefined, options.timeout)
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        'accept': 'application/json',
        'user-agent': USER_AGENT,
      }
      let response: Response
      try {
        response = await fetch(`${options.baseURL}/search`, {
          method: 'POST',
          redirect: 'error',
          headers: apiKey.length > 0
            ? { ...headers, 'authorization': `Bearer ${apiKey}` }
            : headers,
          body: JSON.stringify({
            query: 'tavily',
            search_depth: 'basic',
            topic: 'general',
            include_answer: false,
            max_results: 1,
          }),
          ...requestSignal !== undefined ? { signal: requestSignal } : {},
        })
      } catch (error: unknown) {
        if (timeoutSignal?.aborted === true) {
          return { ok: false, mode, code: 'timeout', error: `timed out after ${options.timeout}ms` }
        }
        return { ok: false, mode, code: 'network', error: String(error) }
      }
      if (!response.ok) {
        let message = `HTTP ${response.status}`
        try {
          const parsed = await response.json() as TavilyError
          message = parsed.detail?.error ?? parsed.error ?? parsed.message ?? message
        } catch (_bodyFailure) {
          // keep status message
        }
        const code = classifyTavilyHttpStatus(response.status, message)
        return { ok: false, mode, code, error: message }
      }
      return { ok: true, mode }
    } catch (error: unknown) {
      return { ok: false, mode, code: 'other', error: String(error) }
    }
  }

  /**
   * Build the request fingerprint identifying a cacheable search. Every
   * parameter that can change the result (plus the resolved key, so one key's
   * results are never served to another) contributes to the key.
   */
  private cacheFingerprint(
    request: WebSearchRequest,
    options: TavilySearchProviderOptions,
    maxResults: number | undefined,
    apiKey: string,
  ): string {
    return JSON.stringify({
      query: request.query,
      maxResults,
      searchDepth: options.searchDepth,
      topic: options.topic,
      includeAnswer: options.includeAnswer,
      includeRawContent: options.includeRawContent,
      days: options.days,
      chunksPerSource: options.chunksPerSource,
      timeRange: options.timeRange,
      startDate: options.startDate,
      endDate: options.endDate,
      includeImages: options.includeImages,
      includeImageDescriptions: options.includeImageDescriptions,
      includeFavicon: options.includeFavicon,
      includeDomains: options.includeDomains,
      excludeDomains: options.excludeDomains,
      country: options.country,
      baseURL: options.baseURL,
      apiKey,
    })
  }

  /** Run the Tavily request itself with an already-resolved API key. */
  private async tavilySearch(
    request: WebSearchRequest,
    signal: AbortSignal | undefined,
    options: TavilySearchProviderOptions,
    apiKey: string,
    stats: SearchStats,
  ): Promise<WebSearchResult> {
    // A per-request bound wins over the configured default; either may be absent.
    const maxResults = request.maxResults ?? options.maxResults ?? options.numResults
    const cacheTtl = options.cacheTtlMs ?? TAVILY_DEFAULT_CACHE_TTL_MS
    // Recency-sensitive searches never touch the cache: a snapshot from
    // seconds ago would betray a "right now" question.
    const freshSensitive = options.cacheBypassFresh !== false && isFreshSensitive(options)
    const cacheEnabled = cacheTtl > 0 && !freshSensitive
    stats.cache = freshSensitive ? 'bypassed' : 'disabled'
    const cacheKey = cacheEnabled
      ? this.cacheFingerprint(request, options, maxResults, apiKey)
      : undefined
    if (cacheKey !== undefined) {
      const hit = this.cache.get(cacheKey)
      if (hit !== undefined && hit.expires > Date.now()) {
        // Move-to-front so the LRU eviction below drops the truly oldest entry.
        this.cache.delete(cacheKey)
        this.cache.set(cacheKey, hit)
        stats.cache = 'hit'
        return hit.result
      }
    }

    const { signal: requestSignal, timeoutSignal } = makeRequestSignal(signal, options.timeout)
    const maxAttempts = options.retryMaxAttempts ?? TAVILY_DEFAULT_RETRY_MAX_ATTEMPTS
    let attempt = 0
    const requestBody = requestBodyOf(request, options, maxResults)

    for (;;) {
      let response: Response
      try {
        response = await fetch(`${options.baseURL}/search`, {
          method: 'POST',
          redirect: 'error',
          headers: {
            'authorization': `Bearer ${apiKey}`,
            'content-type': 'application/json',
            'accept': 'application/json',
            'user-agent': USER_AGENT,
          },
          body: requestBody,
          ...requestSignal !== undefined ? { signal: requestSignal } : {},
        })
      } catch (error: unknown) {
        throw classifiedSearchError(error, signal, timeoutSignal, options.timeout)
      }

      // Honor a rate-limited response with a bounded backoff before retrying.
      if (response.status === 429 && attempt < maxAttempts) {
        attempt += 1
        await abortableDelay(
          retryDelayMs(response.headers.get('retry-after'), attempt),
          requestSignal,
          timeoutSignal,
          options.timeout,
        )
        continue
      }

      if (!response.ok) {
        const status = response.status
        let message = `Tavily API error (HTTP ${status})`
        try {
          const parsed = await response.json() as TavilyError
          const detail = parsed.detail?.error ?? parsed.error ?? parsed.message
          if (detail !== undefined && detail.length > 0) message = detail
        } catch (error: unknown) {
          // An abort fired mid-body must surface as WEB_ABORTED, not be swallowed
          // into a generic HTTP-error message — cancellation is not a provider
          // error (the seam's cancellation contract). A timeout is a provider error.
          if (timeoutSignal?.aborted === true) {
            throw new WebError(`Tavily search timed out after ${options.timeout}ms`, 'WEB_PROVIDER_ERROR', { cause: error })
          }
          if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
          // Otherwise: the HTTP status is already captured in `message` above; a
          // malformed/non-JSON error body (normal for gateway 5xx/429s) can only
          // cost a richer provider message, never the real error.
        }
        // A finer code travels on the error so the ring can rotate and the
        // debug log can name the class ("invalid key" vs "insufficient
        // credits" vs "rate limit" vs "service down").
        const code = classifyTavilyHttpStatus(status, message)
        throw tavilyWebError(code, message)
      }

      try {
        const payload = await response.json() as TavilySearchResponse
        const result = mapTavilyResponse(payload, options.citeFormat ?? 'plain')
        if (cacheEnabled && cacheKey !== undefined) {
          this.cache.set(cacheKey, { expires: Date.now() + cacheTtl, result })
          this.evictCacheTo(options)
          stats.cache = 'miss'
        }
        return result
      } catch (error: unknown) {
        throw classifiedSearchError(error, signal, timeoutSignal, options.timeout)
      }
    }
  }

  /** Evict the oldest cached entries until the cache sits at or under its cap. */
  private evictCacheTo(options: TavilySearchProviderOptions): void {
    const max = Math.max(1, options.cacheMaxEntries ?? TAVILY_DEFAULT_CACHE_MAX_ENTRIES)
    while (this.cache.size > max) {
      const oldest = this.cache.keys().next().value
      if (oldest === undefined) break
      this.cache.delete(oldest)
    }
  }
}

/**
 * A `WebFetchProvider` backed by Tavily's `POST /extract` endpoint: given one
 * URL it returns the cleaned page content classified as text or html. It shares
 * the Tavily credential/options resolution with the search provider, and
 * registers under a distinct fetch-provider id (`tavily-extract`) so selecting
 * the fetch provider never interferes with the search provider.
 */
export class TavilyExtractProvider implements WebFetchProvider {
  readonly id = TAVILY_EXTRACT_PROVIDER_ID

  /**
   * @param resolveOptions - thunk producing the shared Tavily option snapshot
   *   (endpoint base, timeout, credential reference).
   */
  constructor(private readonly resolveOptions: () => TavilySearchProviderOptions) {}

  available(): boolean {
    const options = this.resolveOptions()
    return ((options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== undefined)
      && isValidBaseUrl(options.baseURL)
      && (options.timeout === undefined || options.timeout > 0)
  }

  async fetch(request: WebFetchRequest, signal?: AbortSignal): Promise<WebFetchResult> {
    const options = this.resolveOptions()
    const started = Date.now()
    const apiKey = await resolveRequestApiKey(options, signal)
    const { signal: requestSignal, timeoutSignal } = makeRequestSignal(signal, options.timeout)

    let response: Response
    try {
      response = await fetch(`${options.baseURL}${TAVILY_DEFAULT_EXTRACT_PATH}`, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
          'accept': 'application/json',
          'user-agent': USER_AGENT,
        },
        body: JSON.stringify({ urls: [request.url] } satisfies TavilyExtractRequest),
        ...requestSignal !== undefined ? { signal: requestSignal } : {},
      })
    } catch (error: unknown) {
      debugLog(options, `extract ${request.url} failed: ${describeSearchError(error)}`)
      throw classifiedSearchError(error, signal, timeoutSignal, options.timeout)
    }

    if (!response.ok) {
      let message = `Tavily extract API error (HTTP ${response.status})`
      try {
        const parsed = await response.json() as TavilyError
        const detail = parsed.detail?.error ?? parsed.error ?? parsed.message
        if (detail !== undefined && detail.length > 0) message = detail
      } catch (error: unknown) {
        if (timeoutSignal?.aborted === true) {
          throw new WebError(`Tavily extract timed out after ${options.timeout}ms`, 'WEB_PROVIDER_ERROR', { cause: error })
        }
        if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
      }
      debugLog(options, `extract ${request.url} failed: ${message}`)
      throw new WebError(message, 'WEB_PROVIDER_ERROR')
    }

    // A successful non-2xx is impossible here (we returned above), so a body
    // with no matching entry maps to an empty text body with the HTTP status.
    try {
      const payload = await response.json() as TavilyExtractResponse
      const entry = (payload.results ?? []).find(item => item.url === request.url)
        ?? (payload.results ?? [])[0]
      const content = entry?.raw_content ?? ''
      debugLog(options, `extract ${request.url} ${content.length}b ${Date.now() - started}ms`)
      return {
        url: response.url === '' ? request.url : response.url,
        statusCode: response.status,
        body: classifyFetchBody(content),
        truncated: false,
      }
    } catch (error: unknown) {
      debugLog(options, `extract ${request.url} failed: ${describeSearchError(error)}`)
      throw classifiedSearchError(error, signal, timeoutSignal, options.timeout)
    }
  }
}

/**
 * Classify Tavily's extracted content as `html` when it clearly contains markup
 * or `text` otherwise (Tavily typically returns cleaned, LLM-ready text).
 */
function classifyFetchBody(content: string): WebFetchBody {
  const looksHtml = /<\/?[a-z][\s\S]*?>/i.test(content)
  return looksHtml ? { kind: 'html', content } : { kind: 'text', content }
}

/**
 * Resolve one operation's rotation ring without retaining keys on the provider:
 * literal `apiKey` first, then every configured credential reference resolved
 * by {@link TavilySearchProviderOptions.resolveKeyRefs} (falling back to
 * {@link TavilySearchProviderOptions.resolveApiKey} when the list resolver is
 * absent). Values are deduplicated; an empty ring throws the credential-missing
 * error so callers can surface it (probe falls back to keyless, status reports
 * `no-key`).
 * @param options - the caller's snapshot, so the keys and the endpoint they are
 *   sent to come from one section.
 * @param signal - abort signal for the surrounding operation.
 * @returns the ordered, non-empty key ring.
 */
async function requestKeyRing(
  options: TavilySearchProviderOptions,
  signal?: AbortSignal,
): Promise<string[]> {
  throwIfSearchAborted(signal)
  const ring: string[] = []
  const literal = options.apiKey
  if (literal !== undefined && literal.length > 0) ring.push(literal)
  if (options.resolveKeyRefs !== undefined) {
    const refs = [...new Set([
      ...(options.apiKeyRefs ?? []),
      options.apiKeyEnv ?? TAVILY_DEFAULT_API_KEY_ENV,
    ])]
    if (refs.length > 0) {
      const resolved = await abortable(options.resolveKeyRefs(refs), signal)
      for (const value of resolved) {
        if (value !== undefined && value.length > 0 && !ring.includes(value)) ring.push(value)
      }
    }
  } else {
    const single = await abortable(options.resolveApiKey?.() ?? Promise.resolve(undefined), signal)
    if (single !== undefined && single.length > 0 && !ring.includes(single)) ring.push(single)
  }
  if (ring.length === 0) throw credentialMissingError(options)
  return ring
}

/**
 * Resolve one operation's primary key — the first entry of the rotation ring —
 * without retaining it on the provider. Used by the single-key host paths
 * (probe, status, connectivity test, extract): they address the ring's first
 * usable key, which preserves the historical single-key behavior when no
 * multi-key ring is configured.
 * @param options - the caller's snapshot.
 * @param signal - abort signal for the surrounding operation.
 * @returns the primary resolved key.
 */
function resolveRequestApiKey(options: TavilySearchProviderOptions, signal?: AbortSignal): Promise<string> {
  return requestKeyRing(options, signal).then(ring => ring[0])
}

/** The provider's stable credential-missing error for an empty ring. */
function credentialMissingError(options: TavilySearchProviderOptions): WebError {
  const ref = options.apiKeyEnv ?? TAVILY_DEFAULT_API_KEY_ENV
  return new WebError(
    `Tavily search has no API key for "${ref}"; store it through the credentials service`
    + ' (the web Plugins page writes it), export it in the launching environment, or set a literal'
    + ' "apiKey" in the web-search-tavily config',
    'WEB_PROVIDER_CREDENTIAL_MISSING',
  )
}

/** True when `baseURL` parses as an absolute URL (a cheap local config check). */
function isValidBaseUrl(baseURL: string): boolean {
  return URL.canParse(baseURL)
}

/** True for a request limit that can be sent to Tavily (a positive whole number). */
function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

/**
 * Classify an HTTP failure into the machine-routable status taxonomy. An
 * auth error (401/403) is refined by the body message: Tavily reports
 * exhausted balances as a message containing credit/quota wording, which the
 * caller must act on differently from an outright invalid key.
 * @param status - the HTTP status.
 * @param message - the best-effort parsed error message.
 * @returns the status code.
 */
function classifyTavilyHttpStatus(status: number, message: string): TavilyStatusCodes {
  if (status === 401 || status === 403) {
    return /credit|balance|insufficient|quota/iu.test(message) ? 'insufficient_credits' : 'invalid_key'
  }
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'server_down'
  if (status === 408) return 'timeout'
  return 'http'
}

/**
 * Build a `WebError` carrying the machine-routable Tavily code on a hidden
 * `tavilyCode` property, so the search ring can rotate, the fallback engine
 * can decide, and the debug log can name the class — without changing the
 * seam-visible message text.
 */
function tavilyWebError(
  code: TavilyStatusCodes,
  message: string,
  options?: { cause?: unknown },
): WebError {
  const error = new WebError(`Tavily API error (${code}): ${message}`, 'WEB_PROVIDER_ERROR', options)
  ;(error as { tavilyCode?: TavilyStatusCodes }).tavilyCode = code
  return error
}

/** The classified code attached to a Tavily failure, or `undefined`. */
function tavilyCodeOf(error: unknown): TavilyStatusCodes | undefined {
  if (error instanceof WebError) return (error as { tavilyCode?: TavilyStatusCodes }).tavilyCode
  return undefined
}

/**
 * Key-level failures the rotation ring reacts to: another key in the ring can
 * plausibly succeed where this one failed.
 */
function isRotatableCode(code: TavilyStatusCodes): boolean {
  return code === 'rate_limited' || code === 'insufficient_credits' || code === 'invalid_key'
}

/**
 * Tavily-side failures the fallback engine reacts to — timeout, network, or a
 * 5xx service outage. Key-level faults (429 / 401) never trigger a fallback.
 */
function isFallbackCode(code: TavilyStatusCodes): boolean {
  return code === 'timeout' || code === 'network' || code === 'server_down'
}

/**
 * True when the resolved options describe a recency-sensitive search — news or
 * finance topics, or any explicit time window — which the fresh-query bypass
 * keeps out of the result cache.
 * @param options - the operation's option snapshot.
 * @returns whether caching would risk serving a stale "right now" answer.
 */
function isFreshSensitive(options: TavilySearchProviderOptions): boolean {
  return options.topic === 'news'
    || options.topic === 'finance'
    || options.timeRange !== undefined
    || options.days !== undefined
    || options.startDate !== undefined
    || options.endDate !== undefined
}

/** Emit one concise debug line only while the operation's debug flag is on. */
function debugLog(options: TavilySearchProviderOptions, message: string): void {
  if (options.debug === true) options.log?.(message)
}

/** Truncate a query excerpt for a log line, never the full user text. */
function truncateQuery(query: string, max = 80): string {
  return query.length > max ? `${query.slice(0, max)}…` : query
}

/** One-line description of a search failure for the debug log. */
function describeSearchError(error: unknown): string {
  if (error instanceof WebError) return `${error.code ?? 'WEB_PROVIDER_ERROR'}: ${error.message}`
  return error instanceof Error ? error.message : String(error)
}

/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Combine an optional caller abort with a per-request timeout signal.
 *
 * The timeout signal is kept separate from the caller's signal so a timeout can
 * be classified as a provider error while an external cancellation still maps to
 * `WEB_ABORTED`.
 */
function makeRequestSignal(
  signal: AbortSignal | undefined,
  timeoutMs: number | undefined,
): { signal: AbortSignal | undefined; timeoutSignal: AbortSignal | undefined } {
  if (timeoutMs === undefined || timeoutMs <= 0) return { signal, timeoutSignal: undefined }
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  if (signal === undefined) return { signal: timeoutSignal, timeoutSignal }
  if (signal.aborted) return { signal, timeoutSignal }
  return { signal: AbortSignal.any([signal, timeoutSignal]), timeoutSignal }
}

/**
 * Classify one fetch/JSON failure into the provider's error taxonomy.
 * @returns the appropriate WebError; throws it.
 */
function classifiedSearchError(
  error: unknown,
  signal: AbortSignal | undefined,
  timeoutSignal: AbortSignal | undefined,
  timeoutMs: number | undefined,
): WebError {
  if (timeoutSignal?.aborted === true) {
    return tavilyWebError('timeout', `Tavily search timed out after ${timeoutMs}ms`, { cause: error })
  }
  if (signal?.aborted === true || isAbortError(error)) return searchAborted(signal, error)
  return tavilyWebError('network', `Tavily search request failed: ${String(error)}`, { cause: error })
}

/**
 * Race a same-process asynchronous preflight against caller cancellation. The
 * attached settlement handlers keep observing an uncooperative operation after
 * abort so a later rejection cannot become unhandled.
 */
function abortable<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal === undefined) return operation
  if (signal.aborted) return Promise.reject(searchAborted(signal))
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => { reject(searchAborted(signal)) }
    signal.addEventListener('abort', onAbort, { once: true })
    void operation.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(new Error(String(error).replace(/^Error: /u, ''), { cause: error }))
      },
    )
  })
}

/**
 * Serialize the Tavily request body once per search so every retry attempt
 * sends exactly the same payload (the request parameters do not change between
 * attempts).
 */
function requestBodyOf(
  request: WebSearchRequest,
  options: TavilySearchProviderOptions,
  maxResults: number | undefined,
): string {
  return JSON.stringify({
    query: request.query,
    search_depth: options.searchDepth,
    topic: options.topic,
    include_answer: options.includeAnswer,
    include_raw_content: options.includeRawContent,
    ...maxResults !== undefined ? { max_results: maxResults } : {},
    ...options.days !== undefined ? { days: options.days } : {},
    ...options.chunksPerSource !== undefined ? { chunks_per_source: options.chunksPerSource } : {},
    ...options.timeRange !== undefined ? { time_range: options.timeRange } : {},
    ...options.startDate !== undefined ? { start_date: options.startDate } : {},
    ...options.endDate !== undefined ? { end_date: options.endDate } : {},
    ...options.includeImages !== undefined ? { include_images: options.includeImages } : {},
    ...options.includeImageDescriptions !== undefined ? { include_image_descriptions: options.includeImageDescriptions } : {},
    ...options.includeFavicon !== undefined ? { include_favicon: options.includeFavicon } : {},
    ...options.includeDomains !== undefined && options.includeDomains.length > 0 ? { include_domains: options.includeDomains } : {},
    ...options.excludeDomains !== undefined && options.excludeDomains.length > 0 ? { exclude_domains: options.excludeDomains } : {},
    ...options.country !== undefined && options.country.length > 0 ? { country: options.country } : {},
  })
}

/** Parse a `retry-after` header into seconds (`undefined` when unparsable). */
function retryAfterSeconds(value: string | null): number | undefined {
  if (value === null) return undefined
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const seconds = Number(trimmed)
  if (Number.isFinite(seconds)) return seconds >= 0 ? seconds : undefined
  const date = Date.parse(trimmed)
  if (Number.isNaN(date)) return undefined
  return Math.max(0, (date - Date.now()) / 1000)
}

/**
 * Choose the delay before the next rate-limit retry. The explicit `retry-after`
 * header wins when present; otherwise apply exponential backoff. The result is
 * clamped so a single search never blocks for an unbounded time.
 */
function retryDelayMs(retryAfter: string | null, attempt: number): number {
  const explicit = retryAfterSeconds(retryAfter)
  const backoff = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
  const millis = explicit !== undefined ? explicit * 1000 : backoff
  return Math.min(Math.max(millis, 100), RETRY_MAX_DELAY_MS)
}

/**
 * Sleep for `ms`, rejecting early when the request (or its timeout) aborts.
 * A timeout during the wait is a provider error; an external cancellation is
 * `WEB_ABORTED`.
 */
function abortableDelay(
  ms: number,
  signal: AbortSignal | undefined,
  timeoutSignal: AbortSignal | undefined,
  timeoutMs: number | undefined,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = (): void => {
      if (timer !== undefined) clearTimeout(timer)
      if (signal !== undefined) signal.removeEventListener('abort', onAbort)
    }
    function onAbort(): void {
      finish()
      reject(timeoutSignal?.aborted === true
        ? new WebError(`Tavily search timed out after ${timeoutMs}ms`, 'WEB_PROVIDER_ERROR')
        : searchAborted())
    }
    if (signal !== undefined) {
      if (signal.aborted) return onAbort()
      signal.addEventListener('abort', onAbort, { once: true })
    }
    timer = setTimeout(() => { finish(); resolve() }, ms)
  })
}

/** Throw the provider's stable cancellation error when the caller already aborted. */
function throwIfSearchAborted(signal?: AbortSignal): void {
  if (signal?.aborted === true) throw searchAborted(signal)
}

/** Build the provider's stable cancellation error while retaining the caller's reason. */
function searchAborted(signal?: AbortSignal, fallback?: unknown): WebError {
  return new WebError('Tavily search aborted', 'WEB_ABORTED', {
    cause: signal?.aborted === true ? signal.reason : fallback,
  })
}