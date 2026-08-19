/**
 * Wire types for the Tavily search API (`POST https://api.tavily.com/search`). Types
 * only — no runtime code. Tavily returns a flat `results[]`; each entry carries a URL,
 * optional title, the `content` snippet, a relevance `score`, and an optional
 * `published_date` (present for `news`/`finance` topics). When the request sets
 * `include_answer`, the response also carries a generated `answer`.
 *
 * @module dsh-plugin-tavily/types
 */

/** Tavily search depth: cost/latency/relevance tradeoff. */
export type TavilySearchDepth = 'basic' | 'advanced' | 'fast' | 'ultra-fast'

/** Tavily recency presets (`time_range`). */
export type TavilyTimeRange = 'day' | 'week' | 'month' | 'year' | 'd' | 'w' | 'm' | 'y'

/** `include_answer` may ask for a quick answer (`true`/`basic`) or a detailed one (`advanced`). */
export type TavilyIncludeAnswer = boolean | 'basic' | 'advanced'

/** `include_raw_content` may ask for markdown or plain text instead of a bare boolean. */
export type TavilyIncludeRawContent = boolean | 'markdown' | 'text'

/** Request body sent to Tavily's search endpoint. */
export interface TavilySearchRequest {
  query: string
  /** Search depth: cost/latency/relevance tradeoff (basic/advanced/fast/ultra-fast). */
  search_depth?: TavilySearchDepth
  /** Search topic: `general`, `news`, or `finance`. */
  topic?: 'general' | 'news' | 'finance'
  /** Recency window in days; meaningful only for `news`/`finance` topics. */
  days?: number
  /** Tavily's result-count control; the seam still enforces the bound on return. */
  max_results?: number
  /** Relevant snippet chunks per source (1–3); larger means richer, more tokens. */
  chunks_per_source?: number
  /** Recency preset for `news`/`finance` topics (e.g. `day`, `week`, `month`). */
  time_range?: TavilyTimeRange
  /** Include only results published/updated after this `YYYY-MM-DD` date. */
  start_date?: string
  /** Include only results published/updated before this `YYYY-MM-DD` date. */
  end_date?: string
  /** Ask Tavily to generate an answer: `true`/`basic` quick, `advanced` detailed. */
  include_answer?: TavilyIncludeAnswer
  /** Include cleaned page content as `markdown`/`text` (or `true` ≈ markdown). */
  include_raw_content?: TavilyIncludeRawContent
  /** Also collect query-related and per-source images. */
  include_images?: boolean
  /** With `include_images`, add a description per image. */
  include_image_descriptions?: boolean
  /** Include the favicon URL for each result. */
  include_favicon?: boolean
  /** Only include these domains (max 300). */
  include_domains?: string[]
  /** Exclude these domains (max 150). */
  exclude_domains?: string[]
  /** Boost results from one country (general topic only). */
  country?: string
}

/** One entry of Tavily's flat `results[]`. */
export interface TavilyResult {
  url: string
  title?: string | null
  content?: string | null
  score?: number
  raw_content?: string | null
  published_date?: string | null
  favicon?: string | null
}

/** Tavily's search response envelope. */
export interface TavilySearchResponse {
  query?: string
  /** Generated answer; present only when the request asked for one. */
  answer?: string | null
  results?: TavilyResult[]
  /** Query-related images; present only when `include_images` is set. */
  images?: unknown[]
}

/** Tavily's error response envelope (best-effort; `detail.error` is the common shape). */
export interface TavilyError {
  detail?: { error?: string }
  error?: string
  message?: string
}

/** Per-key usage from `GET /usage` (limited by the current billing cycle). */
export interface TavilyUsageKey {
  usage?: number
  limit?: number | null
  search_usage?: number
  extract_usage?: number
  crawl_usage?: number
  map_usage?: number
  research_usage?: number
}

/** Per-account usage from `GET /usage`. */
export interface TavilyUsageAccount {
  current_plan?: string
  plan_usage?: number
  plan_limit?: number
  paygo_usage?: number
  paygo_limit?: number
  search_usage?: number
  extract_usage?: number
  crawl_usage?: number
  map_usage?: number
  research_usage?: number
}

/** Normalized `GET /usage` envelope. */
export interface TavilyUsage {
  key?: TavilyUsageKey
  account?: TavilyUsageAccount
}
