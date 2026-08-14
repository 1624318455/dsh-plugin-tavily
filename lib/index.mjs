import z from "@deepseek-ai/schemastery";
import { WebError } from "@deepseek-ai/dsh-web";
//#region src/provider.ts
/**
* `TavilySearchProvider`: a `WebSearchProvider` backed by the Tavily search API (`POST
* /search`). It maps the `content` field of each flat `results[]` entry to `snippet`,
* maps `published_date` to `publishedAt`, drops entries without content, and carries
* Tavily's generated `answer` (when requested) as `content` on the normalized result.
* @module dsh-plugin-tavily/provider
*/
/** Stable id this provider registers under. */
const TAVILY_PROVIDER_ID = "tavily";
/** Default Tavily endpoint; `/search` is the operation. */
const TAVILY_DEFAULT_BASE_URL = "https://api.tavily.com";
/** Default search depth: `basic` (faster, cheaper) rather than `advanced`. */
const TAVILY_DEFAULT_SEARCH_DEPTH = "basic";
/** Default topic: the general web (not news or finance). */
const TAVILY_DEFAULT_TOPIC = "general";
/** Default: request Tavily's generated answer and carry it as `content`. */
const TAVILY_DEFAULT_INCLUDE_ANSWER = true;
/** Attribution header sent on every request. Bump with the package version. */
const USER_AGENT = "dsh-plugin-tavily/0.1.0";
/**
* Map one Tavily result to a normalized source, or `undefined` when it carries no
* portable snippet (an entry with no non-blank `content` is dropped — the seam has no
* other field to derive a snippet from, and inventing one would lie).
*
* @param result - one entry of Tavily's `results[]`.
* @returns the normalized source, or `undefined` when the entry has no non-blank content.
*/
function mapTavilyResult(result) {
	const snippet = result.content?.trim();
	if (snippet === void 0 || snippet.length === 0) return void 0;
	return {
		url: result.url,
		...result.title != null && result.title.length > 0 ? { title: result.title } : {},
		snippet,
		...result.published_date != null && result.published_date.length > 0 ? { publishedAt: result.published_date } : {}
	};
}
/**
* Map a Tavily response envelope to a normalized search result.
*
* @param response - the parsed `POST /search` response body.
* @returns the normalized result; content-less entries are dropped
*   ({@link mapTavilyResult}), and the generated answer (when present) becomes
*   `content`.
*/
function mapTavilyResponse(response) {
	const sources = (response.results ?? []).map(mapTavilyResult).filter((source) => source !== void 0);
	const answer = response.answer;
	return {
		...answer != null && answer.length > 0 ? { content: answer } : {},
		sources,
		truncated: false
	};
}
/** The Tavily-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
var TavilySearchProvider = class {
	options;
	id = TAVILY_PROVIDER_ID;
	constructor(options) {
		this.options = options;
	}
	available() {
		return this.options.apiKey.length > 0 && isValidBaseUrl(this.options.baseURL) && (this.options.days === void 0 || isPositiveInteger(this.options.days)) && (this.options.numResults === void 0 || isPositiveInteger(this.options.numResults));
	}
	async search(request, signal) {
		const maxResults = request.maxResults ?? this.options.numResults;
		let response;
		try {
			response = await fetch(`${this.options.baseURL}/search`, {
				method: "POST",
				redirect: "error",
				headers: {
					"authorization": `Bearer ${this.options.apiKey}`,
					"content-type": "application/json",
					"accept": "application/json",
					"user-agent": USER_AGENT
				},
				body: JSON.stringify({
					query: request.query,
					search_depth: this.options.searchDepth,
					topic: this.options.topic,
					include_answer: this.options.includeAnswer,
					...maxResults !== void 0 ? { max_results: maxResults } : {},
					...this.options.days !== void 0 ? { days: this.options.days } : {}
				}),
				...signal !== void 0 ? { signal } : {}
			});
		} catch (error) {
			if (isAbortError(error)) throw new WebError("Tavily search aborted", "WEB_ABORTED", { cause: error });
			throw new WebError(`Tavily search request failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
		}
		if (!response.ok) {
			let message = `Tavily API error (HTTP ${response.status})`;
			try {
				const parsed = await response.json();
				const detail = parsed.detail?.error ?? parsed.error ?? parsed.message;
				if (detail !== void 0 && detail.length > 0) message = detail;
			} catch (error) {
				if (isAbortError(error)) throw new WebError("Tavily search aborted", "WEB_ABORTED", { cause: error });
			}
			throw new WebError(message, "WEB_PROVIDER_ERROR");
		}
		try {
			return mapTavilyResponse(await response.json());
		} catch (error) {
			if (isAbortError(error)) throw new WebError("Tavily search aborted", "WEB_ABORTED", { cause: error });
			throw new WebError(`Tavily returned an unprocessable response body: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
		}
	}
};
/** True when `baseURL` parses as an absolute URL (a cheap local config check). */
function isValidBaseUrl(baseURL) {
	return URL.canParse(baseURL);
}
/** True for a request limit that can be sent to Tavily (a positive whole number). */
function isPositiveInteger(value) {
	return Number.isInteger(value) && value > 0;
}
/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
function isAbortError(error) {
	return error instanceof DOMException && error.name === "AbortError";
}
//#endregion
//#region src/index.ts
/** Cordis plugin name used by loader diagnostics. */
const name = "web-search-tavily";
/** The web seam this provider registers into. */
const inject = ["web"];
const Config = z.object({
	apiKey: z.string(),
	baseURL: z.string(),
	searchDepth: z.union(["basic", "advanced"]),
	topic: z.union([
		"general",
		"news",
		"finance"
	]),
	days: z.number().step(1).min(1),
	includeAnswer: z.boolean(),
	numResults: z.number().step(1).min(1)
});
/** Register the Tavily search provider with `ctx.web`. */
function apply(ctx, config) {
	ctx.web.registerSearchProvider(new TavilySearchProvider({
		apiKey: config.apiKey ?? process.env.TAVILY_API_KEY ?? "",
		baseURL: config.baseURL ?? "https://api.tavily.com",
		searchDepth: config.searchDepth ?? "basic",
		topic: config.topic ?? "general",
		includeAnswer: config.includeAnswer ?? true,
		...config.days !== void 0 ? { days: config.days } : {},
		...config.numResults !== void 0 ? { numResults: config.numResults } : {}
	}));
}
//#endregion
export { Config, TAVILY_DEFAULT_BASE_URL, TAVILY_DEFAULT_INCLUDE_ANSWER, TAVILY_DEFAULT_SEARCH_DEPTH, TAVILY_DEFAULT_TOPIC, TAVILY_PROVIDER_ID, TavilySearchProvider, apply, inject, name };
