/**
 * Wire types for the Tavily search API (`POST https://api.tavily.com/search`). Types
 * only — no runtime code. Tavily returns a flat `results[]`; each entry carries a URL,
 * optional title, the `content` snippet, a relevance `score`, and an optional
 * `published_date` (present for `news`/`finance` topics). When the request sets
 * `include_answer`, the response also carries a generated `answer`.
 *
 * @module dsh-plugin-tavily/types
 */

/** Request body sent to Tavily's search endpoint. */
export interface TavilySearchRequest {
  query: string
  /** Search depth: `basic` (faster, cheaper) or `advanced` (deeper crawl). */
  search_depth?: 'basic' | 'advanced'
  /** Search topic: `general`, `news`, or `finance`. */
  topic?: 'general' | 'news' | 'finance'
  /** Recency window in days; meaningful only for `news`/`finance` topics. */
  days?: number
  /** Tavily's result-count control; the seam still enforces the bound on return. */
  max_results?: number
  /** Ask Tavily to generate an answer for the query. */
  include_answer?: boolean
}

/** One entry of Tavily's flat `results[]`. */
export interface TavilyResult {
  url: string
  title?: string | null
  content?: string | null
  score?: number
  raw_content?: string | null
  published_date?: string | null
}

/** Tavily's search response envelope. */
export interface TavilySearchResponse {
  query?: string
  /** Generated answer; present only when the request asked for one. */
  answer?: string | null
  results?: TavilyResult[]
}

/** Tavily's error response envelope (best-effort; `detail.error` is the common shape). */
export interface TavilyError {
  detail?: { error?: string }
  error?: string
  message?: string
}
