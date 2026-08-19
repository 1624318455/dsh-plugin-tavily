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

/** Base delay (ms) for the exponential rate-limit backoff before retrying. */
const RETRY_BASE_DELAY_MS = 250

/** Ceiling (ms) for the exponential rate-limit backoff. */
const RETRY_MAX_DELAY_MS = 4_000

/** Credential reference resolved when the section names none. */
export const TAVILY_DEFAULT_API_KEY_ENV = 'TAVILY_API_KEY'

/** Attribution header sent on every request. Bump with the package version. */
const USER_AGENT = 'dsh-plugin-tavily/0.3.1'

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
  /** @deprecated Use {@link maxResults} instead. */
  numResults?: number
}

/**
 * Optional secondary search consulted alongside Tavily (the DeepSeek provider).
 * Returning `undefined` means the secondary provider is absent/unavailable and
 * the Tavily result stands alone.
 */
export type HybridSearch = (request: WebSearchRequest, signal?: AbortSignal) => Promise<WebSearchResult | undefined>

/**
 * A configured hybrid composition: the secondary search to run and how its
 * sources merge. `secondaryFirst: true` (DeepSeek-first) leads with the
 * secondary sources; `false` (Tavily-first) leads with Tavily's.
 */
export interface HybridSearchConfig {
  /** The secondary (DeepSeek) search to run alongside Tavily. */
  run: HybridSearch
  /** When true, secondary sources precede Tavily's; when false, Tavily leads. */
  secondaryFirst: boolean
}

/** Builder returning the active hybrid composition, or `undefined` for Tavily-only. */
export type HybridSearchBuilder = () => HybridSearchConfig | undefined

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
 * @returns the normalized result; content-less entries are dropped
 *   ({@link mapTavilyResult}), and the generated answer (when present) becomes
 *   `content`.
 */
export function mapTavilyResponse(response: TavilySearchResponse): WebSearchResult {
  const sources = (response.results ?? [])
    .map(mapTavilyResult)
    .filter((source): source is WebSearchSource => source !== undefined)
  const answer = response.answer
  // The generated answer is optional provider text; the seam owns the final
  // `maxResults` truncation, so this provider reports `truncated: false`.
  return {
    ...answer != null && answer.length > 0 ? { content: answer } : {},
    sources,
    truncated: false,
  }
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

/** The Tavily-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export class TavilySearchProvider implements WebSearchProvider {
  readonly id = TAVILY_PROVIDER_ID

  /** Short-lived in-memory result cache, keyed by a request/options fingerprint. */
  private readonly cache = new Map<string, CacheEntry>()

  /**
   * @param resolveOptions - thunk producing one operation's option snapshot. The
   *   section is re-read per search, so a settings edit applies live without
   *   re-registration; the snapshot also keeps the resolved key and the endpoint
   *   it is sent to from one section.
   * @param hybridSearch - thunk returning the active hybrid composition when
   *   the current search mode calls for one. Re-evaluated per op so a settings
   *   edit can switch modes live.
   */
  constructor(
    private readonly resolveOptions: () => TavilySearchProviderOptions,
    private readonly hybridSearch?: HybridSearchBuilder,
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
    // Hybrid modes run the secondary provider alongside Tavily and merge the
    // results. A failing/absent secondary provider never blocks Tavily.
    const hybrid = this.hybridSearch?.()
    const secondaryResult = hybrid === undefined
      ? undefined
      : await this.runSecondarySearch(hybrid.run, request, signal)
    const apiKey = await resolveRequestApiKey(options, signal)
    const tavilyResult = await this.tavilySearch(request, signal, options, apiKey)
    return mergeSearchResults(secondaryResult, tavilyResult, hybrid?.secondaryFirst ?? true)
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

  /** Best-effort secondary search: absence or failure degrades to Tavily only. */
  private async runSecondarySearch(
    search: HybridSearch,
    request: WebSearchRequest,
    signal?: AbortSignal,
  ): Promise<WebSearchResult | undefined> {
    try {
      return await search(request, signal)
    } catch (_secondarySearchFailure) {
      return undefined
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
  ): Promise<WebSearchResult> {
    // A per-request bound wins over the configured default; either may be absent.
    const maxResults = request.maxResults ?? options.maxResults ?? options.numResults
    const cacheTtl = options.cacheTtlMs ?? TAVILY_DEFAULT_CACHE_TTL_MS
    const cacheKey = cacheTtl > 0
      ? this.cacheFingerprint(request, options, maxResults, apiKey)
      : undefined
    if (cacheKey !== undefined) {
      const hit = this.cache.get(cacheKey)
      if (hit !== undefined && hit.expires > Date.now()) return hit.result
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
        throw new WebError(message, 'WEB_PROVIDER_ERROR')
      }

      try {
        const payload = await response.json() as TavilySearchResponse
        const result = mapTavilyResponse(payload)
        if (cacheKey !== undefined) {
          this.cache.set(cacheKey, { expires: Date.now() + cacheTtl, result })
        }
        return result
      } catch (error: unknown) {
        throw classifiedSearchError(error, signal, timeoutSignal, options.timeout)
      }
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
      throw new WebError(message, 'WEB_PROVIDER_ERROR')
    }

    // A successful non-2xx is impossible here (we returned above), so a body
    // with no matching entry maps to an empty text body with the HTTP status.
    try {
      const payload = await response.json() as TavilyExtractResponse
      const entry = (payload.results ?? []).find(item => item.url === request.url)
        ?? (payload.results ?? [])[0]
      const content = entry?.raw_content ?? ''
      return {
        url: response.url === '' ? request.url : response.url,
        statusCode: response.status,
        body: classifyFetchBody(content),
        truncated: false,
      }
    } catch (error: unknown) {
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
 * Resolve one operation's credential without retaining it on the provider.
 * @param options - the caller's snapshot, so the key and the endpoint it is sent to come from one section.
 * @param signal - abort signal for the surrounding operation.
 * @returns the resolved key.
 */
function resolveRequestApiKey(options: TavilySearchProviderOptions, signal?: AbortSignal): Promise<string> {
  throwIfSearchAborted(signal)
  if (options.apiKey !== undefined && options.apiKey.length > 0) return Promise.resolve(options.apiKey)
  return abortable(options.resolveApiKey?.() ?? Promise.resolve(undefined), signal).then(
    (resolved) => {
      if (resolved !== undefined && resolved.length > 0) return resolved
      const ref = options.apiKeyEnv ?? TAVILY_DEFAULT_API_KEY_ENV
      throw new WebError(
        `Tavily search has no API key for "${ref}"; store it through the credentials service`
        + ' (the web Plugins page writes it), export it in the launching environment, or set a literal'
        + ' "apiKey" in the web-search-tavily config',
        'WEB_PROVIDER_CREDENTIAL_MISSING',
      )
    },
    (error: unknown) => {
      if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
      throw new WebError(
        `Tavily search credential resolution failed: ${String(error)}`,
        'WEB_PROVIDER_ERROR',
        { cause: error },
      )
    },
  )
}

/** True when `baseURL` parses as an absolute URL (a cheap local config check). */
function isValidBaseUrl(baseURL: string): boolean {
  return URL.canParse(baseURL)
}

/**
 * Merge an optional secondary (DeepSeek) result with the Tavily result.
 * Sources are de-duplicated by URL. `secondaryFirst` controls the lead order:
 * `true` (DeepSeek-first) leads with the secondary sources, `false`
 * (Tavily-first) leads with Tavily's. The `content` field joins both providers'
 * answers in the same order.
 */
function mergeSearchResults(
  secondary: WebSearchResult | undefined,
  tavily: WebSearchResult,
  secondaryFirst = true,
): WebSearchResult {
  if (secondary === undefined) return tavily
  const seen = new Set<string>()
  const ordered = secondaryFirst
    ? [...secondary.sources, ...tavily.sources]
    : [...tavily.sources, ...secondary.sources]
  const sources = ordered.filter(source => {
    if (seen.has(source.url)) return false
    seen.add(source.url)
    return true
  })
  const answers = secondaryFirst
    ? [secondary.content, tavily.content]
    : [tavily.content, secondary.content]
  const content = answers
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join('\n\n')
  return {
    ...content.length > 0 ? { content } : {},
    sources,
    truncated: secondary.truncated || tavily.truncated,
  }
}

/** True for a request limit that can be sent to Tavily (a positive whole number). */
function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
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
    return new WebError(`Tavily search timed out after ${timeoutMs}ms`, 'WEB_PROVIDER_ERROR', { cause: error })
  }
  if (signal?.aborted === true || isAbortError(error)) return searchAborted(signal, error)
  return new WebError(`Tavily search request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
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