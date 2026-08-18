/**
 * `TavilySearchProvider`: a `WebSearchProvider` backed by the Tavily search API (`POST
 * /search`). It maps the `content` field of each flat `results[]` entry to `snippet`,
 * maps `published_date` to `publishedAt`, drops entries without content, and carries
 * Tavily's generated `answer` (when requested) as `content` on the normalized result.
 * @module dsh-plugin-tavily/provider
 */

import { WebError } from '@deepseek-ai/dsh-web'
import type {
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '@deepseek-ai/dsh-web'
import type { TavilyError, TavilyResult, TavilySearchResponse } from './types'

/** Stable id this provider registers under. */
export const TAVILY_PROVIDER_ID = 'tavily'

/** Default Tavily endpoint; `/search` is the operation. */
export const TAVILY_DEFAULT_BASE_URL = 'https://api.tavily.com'

/** Default search depth: `basic` (faster, cheaper) rather than `advanced`. */
export const TAVILY_DEFAULT_SEARCH_DEPTH = 'basic'

/** Default topic: the general web (not news or finance). */
export const TAVILY_DEFAULT_TOPIC = 'general'

/** Default: request Tavily's generated answer and carry it as `content`. */
export const TAVILY_DEFAULT_INCLUDE_ANSWER = true

/** Default: do not ask Tavily to return raw page content (context-heavy). */
export const TAVILY_DEFAULT_INCLUDE_RAW_CONTENT = false

/** Default per-request timeout in milliseconds. */
export const TAVILY_DEFAULT_TIMEOUT = 30_000

/** Default result count when a request carries no `maxResults`. */
export const TAVILY_DEFAULT_MAX_RESULTS = 5

/** Credential reference resolved when the section names none. */
export const TAVILY_DEFAULT_API_KEY_ENV = 'TAVILY_API_KEY'

/** Attribution header sent on every request. Bump with the package version. */
const USER_AGENT = 'dsh-plugin-tavily/0.2.0'

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
  /** Search depth sent as Tavily's `search_depth`. */
  searchDepth: 'basic' | 'advanced'
  /** Topic sent as Tavily's `topic`. */
  topic: 'general' | 'news' | 'finance'
  /** Whether to request Tavily's generated answer (`include_answer`). */
  includeAnswer: boolean
  /** Whether to request Tavily's raw HTML content (`include_raw_content`). */
  includeRawContent: boolean
  /** Request timeout in milliseconds. */
  timeout: number
  /** Recency window in days; sent only when set (news/finance topics). */
  days?: number
  /** Default result count when a request carries no `maxResults`. */
  maxResults?: number
  /** @deprecated Use {@link maxResults} instead. */
  numResults?: number
}

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

/** The Tavily-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export class TavilySearchProvider implements WebSearchProvider {
  readonly id = TAVILY_PROVIDER_ID

  /**
   * @param resolveOptions - thunk producing one operation's option snapshot. The
   *   section is re-read per search, so a settings edit applies live without
   *   re-registration; the snapshot also keeps the resolved key and the endpoint
   *   it is sent to from one section.
   */
  constructor(private readonly resolveOptions: () => TavilySearchProviderOptions) {}

  available(): boolean {
    const options = this.resolveOptions()
    return ((options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== undefined)
      && isValidBaseUrl(options.baseURL)
      && (options.days === undefined || isPositiveInteger(options.days))
      && (options.maxResults === undefined || isPositiveInteger(options.maxResults))
      && (options.numResults === undefined || isPositiveInteger(options.numResults))
      && (options.timeout === undefined || options.timeout > 0)
  }

  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    const options = this.resolveOptions()
    const apiKey = await this.apiKey(options, signal)
    // A per-request bound wins over the configured default; either may be absent.
    const maxResults = request.maxResults ?? options.maxResults ?? options.numResults
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
          query: request.query,
          search_depth: options.searchDepth,
          topic: options.topic,
          include_answer: options.includeAnswer,
          include_raw_content: options.includeRawContent,
          ...maxResults !== undefined ? { max_results: maxResults } : {},
          ...options.days !== undefined ? { days: options.days } : {},
        }),
        ...requestSignal !== undefined ? { signal: requestSignal } : {},
      })
    } catch (error: unknown) {
      throw classifiedSearchError(error, signal, timeoutSignal, options.timeout)
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
      return mapTavilyResponse(payload)
    } catch (error: unknown) {
      throw classifiedSearchError(error, signal, timeoutSignal, options.timeout)
    }
  }

  /**
   * Resolve one operation's credential without retaining it on the provider.
   * @param options - the caller's snapshot, so the key and the endpoint it is sent to come from one section.
   * @param signal - abort signal for the surrounding search.
   * @returns the resolved key.
   */
  private async apiKey(options: TavilySearchProviderOptions, signal?: AbortSignal): Promise<string> {
    throwIfSearchAborted(signal)
    if (options.apiKey !== undefined && options.apiKey.length > 0) return options.apiKey
    let resolved: string | undefined
    try {
      resolved = await abortable(options.resolveApiKey?.() ?? Promise.resolve(undefined), signal)
    } catch (error: unknown) {
      if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error)
      throw new WebError(
        `Tavily search credential resolution failed: ${String(error)}`,
        'WEB_PROVIDER_ERROR',
        { cause: error },
      )
    }
    if (resolved !== undefined && resolved.length > 0) return resolved
    const ref = options.apiKeyEnv ?? TAVILY_DEFAULT_API_KEY_ENV
    throw new WebError(
      `Tavily search has no API key for "${ref}"; store it through the credentials service`
      + ' (the web Plugins page writes it), export it in the launching environment, or set a literal'
      + ' "apiKey" in the web-search-tavily config',
      'WEB_PROVIDER_CREDENTIAL_MISSING',
    )
  }
}

/** True when `baseURL` parses as an absolute URL (a cheap local config check). */
function isValidBaseUrl(baseURL: string): boolean {
  return URL.canParse(baseURL)
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