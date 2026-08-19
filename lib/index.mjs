import z from "@deepseek-ai/schemastery";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
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
/** Default search depth: `basic` (balanced cost/latency/relevance). */
const TAVILY_DEFAULT_SEARCH_DEPTH = "basic";
/** Default topic: the general web (not news or finance). */
const TAVILY_DEFAULT_TOPIC = "general";
/** Default: request Tavily's generated quick answer and carry it as `content`. */
const TAVILY_DEFAULT_INCLUDE_ANSWER = true;
/** Default: do not ask Tavily to return raw page content (context-heavy). */
const TAVILY_DEFAULT_INCLUDE_RAW_CONTENT = false;
/** Default per-request timeout in milliseconds. */
const TAVILY_DEFAULT_TIMEOUT = 3e4;
/** Default result count when a request carries no `maxResults`. */
const TAVILY_DEFAULT_MAX_RESULTS = 5;
/** Credential reference resolved when the section names none. */
const TAVILY_DEFAULT_API_KEY_ENV = "TAVILY_API_KEY";
/** Attribution header sent on every request. Bump with the package version. */
const USER_AGENT = "dsh-plugin-tavily/0.3.1";
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
	resolveOptions;
	hybridSearch;
	id = TAVILY_PROVIDER_ID;
	/**
	* @param resolveOptions - thunk producing one operation's option snapshot. The
	*   section is re-read per search, so a settings edit applies live without
	*   re-registration; the snapshot also keeps the resolved key and the endpoint
	*   it is sent to from one section.
	* @param hybridSearch - thunk returning the secondary (DeepSeek) search when
	*   the current search mode calls for it. Re-evaluated per op so a settings
	*   edit can switch between Tavily-only and DeepSeek-first live.
	*/
	constructor(resolveOptions, hybridSearch) {
		this.resolveOptions = resolveOptions;
		this.hybridSearch = hybridSearch;
	}
	available() {
		const options = this.resolveOptions();
		return ((options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== void 0) && isValidBaseUrl(options.baseURL) && (options.days === void 0 || isPositiveInteger(options.days)) && (options.chunksPerSource === void 0 || isPositiveInteger(options.chunksPerSource)) && (options.maxResults === void 0 || isPositiveInteger(options.maxResults)) && (options.numResults === void 0 || isPositiveInteger(options.numResults)) && (options.timeout === void 0 || options.timeout > 0);
	}
	async search(request, signal) {
		const options = this.resolveOptions();
		const secondary = this.hybridSearch?.();
		const secondaryResult = secondary === void 0 ? void 0 : await this.runSecondarySearch(secondary, request, signal);
		const apiKey = await this.apiKey(options, signal);
		return mergeSearchResults(secondaryResult, await this.tavilySearch(request, signal, options, apiKey));
	}
	/** Best-effort secondary search: absence or failure degrades to Tavily only. */
	async runSecondarySearch(search, request, signal) {
		try {
			return await search(request, signal);
		} catch (_secondarySearchFailure) {
			return;
		}
	}
	/** Run the Tavily request itself with an already-resolved API key. */
	async tavilySearch(request, signal, options, apiKey) {
		const maxResults = request.maxResults ?? options.maxResults ?? options.numResults;
		const { signal: requestSignal, timeoutSignal } = makeRequestSignal(signal, options.timeout);
		let response;
		try {
			response = await fetch(`${options.baseURL}/search`, {
				method: "POST",
				redirect: "error",
				headers: {
					"authorization": `Bearer ${apiKey}`,
					"content-type": "application/json",
					"accept": "application/json",
					"user-agent": USER_AGENT
				},
				body: JSON.stringify({
					query: request.query,
					search_depth: options.searchDepth,
					topic: options.topic,
					include_answer: options.includeAnswer,
					include_raw_content: options.includeRawContent,
					...maxResults !== void 0 ? { max_results: maxResults } : {},
					...options.days !== void 0 ? { days: options.days } : {},
					...options.chunksPerSource !== void 0 ? { chunks_per_source: options.chunksPerSource } : {},
					...options.timeRange !== void 0 ? { time_range: options.timeRange } : {},
					...options.startDate !== void 0 ? { start_date: options.startDate } : {},
					...options.endDate !== void 0 ? { end_date: options.endDate } : {},
					...options.includeImages !== void 0 ? { include_images: options.includeImages } : {},
					...options.includeImageDescriptions !== void 0 ? { include_image_descriptions: options.includeImageDescriptions } : {},
					...options.includeFavicon !== void 0 ? { include_favicon: options.includeFavicon } : {},
					...options.includeDomains !== void 0 && options.includeDomains.length > 0 ? { include_domains: options.includeDomains } : {},
					...options.excludeDomains !== void 0 && options.excludeDomains.length > 0 ? { exclude_domains: options.excludeDomains } : {},
					...options.country !== void 0 && options.country.length > 0 ? { country: options.country } : {}
				}),
				...requestSignal !== void 0 ? { signal: requestSignal } : {}
			});
		} catch (error) {
			throw classifiedSearchError(error, signal, timeoutSignal, options.timeout);
		}
		if (!response.ok) {
			let message = `Tavily API error (HTTP ${response.status})`;
			try {
				const parsed = await response.json();
				const detail = parsed.detail?.error ?? parsed.error ?? parsed.message;
				if (detail !== void 0 && detail.length > 0) message = detail;
			} catch (error) {
				if (timeoutSignal?.aborted === true) throw new WebError(`Tavily search timed out after ${options.timeout}ms`, "WEB_PROVIDER_ERROR", { cause: error });
				if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
			}
			throw new WebError(message, "WEB_PROVIDER_ERROR");
		}
		try {
			return mapTavilyResponse(await response.json());
		} catch (error) {
			throw classifiedSearchError(error, signal, timeoutSignal, options.timeout);
		}
	}
	/**
	* Resolve one operation's credential without retaining it on the provider.
	* @param options - the caller's snapshot, so the key and the endpoint it is sent to come from one section.
	* @param signal - abort signal for the surrounding search.
	* @returns the resolved key.
	*/
	async apiKey(options, signal) {
		throwIfSearchAborted(signal);
		if (options.apiKey !== void 0 && options.apiKey.length > 0) return options.apiKey;
		let resolved;
		try {
			resolved = await abortable(options.resolveApiKey?.() ?? Promise.resolve(void 0), signal);
		} catch (error) {
			if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
			throw new WebError(`Tavily search credential resolution failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
		}
		if (resolved !== void 0 && resolved.length > 0) return resolved;
		const ref = options.apiKeyEnv ?? "TAVILY_API_KEY";
		throw new WebError(`Tavily search has no API key for "${ref}"; store it through the credentials service (the web Plugins page writes it), export it in the launching environment, or set a literal "apiKey" in the web-search-tavily config`, "WEB_PROVIDER_CREDENTIAL_MISSING");
	}
};
/** True when `baseURL` parses as an absolute URL (a cheap local config check). */
function isValidBaseUrl(baseURL) {
	return URL.canParse(baseURL);
}
/**
* Merge an optional secondary (DeepSeek) result with the Tavily result.
* Sources are de-duplicated by URL with the secondary first. The `content` field
* joins both providers' answers when present.
*/
function mergeSearchResults(secondary, tavily) {
	if (secondary === void 0) return tavily;
	const seen = /* @__PURE__ */ new Set();
	const sources = [...secondary.sources, ...tavily.sources].filter((source) => {
		if (seen.has(source.url)) return false;
		seen.add(source.url);
		return true;
	});
	const content = [secondary.content, tavily.content].filter((value) => typeof value === "string" && value.length > 0).join("\n\n");
	return {
		...content.length > 0 ? { content } : {},
		sources,
		truncated: secondary.truncated || tavily.truncated
	};
}
/** True for a request limit that can be sent to Tavily (a positive whole number). */
function isPositiveInteger(value) {
	return Number.isInteger(value) && value > 0;
}
/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
function isAbortError(error) {
	return error instanceof DOMException && error.name === "AbortError";
}
/**
* Combine an optional caller abort with a per-request timeout signal.
*
* The timeout signal is kept separate from the caller's signal so a timeout can
* be classified as a provider error while an external cancellation still maps to
* `WEB_ABORTED`.
*/
function makeRequestSignal(signal, timeoutMs) {
	if (timeoutMs === void 0 || timeoutMs <= 0) return {
		signal,
		timeoutSignal: void 0
	};
	const timeoutSignal = AbortSignal.timeout(timeoutMs);
	if (signal === void 0) return {
		signal: timeoutSignal,
		timeoutSignal
	};
	if (signal.aborted) return {
		signal,
		timeoutSignal
	};
	return {
		signal: AbortSignal.any([signal, timeoutSignal]),
		timeoutSignal
	};
}
/**
* Classify one fetch/JSON failure into the provider's error taxonomy.
* @returns the appropriate WebError; throws it.
*/
function classifiedSearchError(error, signal, timeoutSignal, timeoutMs) {
	if (timeoutSignal?.aborted === true) return new WebError(`Tavily search timed out after ${timeoutMs}ms`, "WEB_PROVIDER_ERROR", { cause: error });
	if (signal?.aborted === true || isAbortError(error)) return searchAborted(signal, error);
	return new WebError(`Tavily search request failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
}
/**
* Race a same-process asynchronous preflight against caller cancellation. The
* attached settlement handlers keep observing an uncooperative operation after
* abort so a later rejection cannot become unhandled.
*/
function abortable(operation, signal) {
	if (signal === void 0) return operation;
	if (signal.aborted) return Promise.reject(searchAborted(signal));
	return new Promise((resolve, reject) => {
		const onAbort = () => {
			reject(searchAborted(signal));
		};
		signal.addEventListener("abort", onAbort, { once: true });
		operation.then((value) => {
			signal.removeEventListener("abort", onAbort);
			resolve(value);
		}, (error) => {
			signal.removeEventListener("abort", onAbort);
			reject(new Error(String(error).replace(/^Error: /u, ""), { cause: error }));
		});
	});
}
/** Throw the provider's stable cancellation error when the caller already aborted. */
function throwIfSearchAborted(signal) {
	if (signal?.aborted === true) throw searchAborted(signal);
}
/** Build the provider's stable cancellation error while retaining the caller's reason. */
function searchAborted(signal, fallback) {
	return new WebError("Tavily search aborted", "WEB_ABORTED", { cause: signal?.aborted === true ? signal.reason : fallback });
}
//#endregion
//#region src/index.ts
/** Cordis plugin name used by loader diagnostics. */
const name = "web-search-tavily";
/** The web seam this provider registers into. */
const inject = ["web"];
const Config = z.object({
	apiKey: z.string().role("secret").description("Literal Tavily API key. Prefer storing the key through the credentials service instead."),
	apiKeyEnv: z.string().role("credential-ref").description("Credential reference (environment variable name) resolved for each search."),
	baseURL: z.string().description("Tavily-compatible endpoint base; `/search` is appended."),
	searchDepth: z.union([
		"basic",
		"advanced",
		"fast",
		"ultra-fast"
	]).description("Search depth: basic (balanced), advanced (deeper), fast, ultra-fast (lowest latency)."),
	topic: z.union([
		"general",
		"news",
		"finance"
	]).description("Search topic: general web, news, or finance."),
	days: z.number().step(1).min(1).max(365).description("Recency window in days; used with news/finance topics."),
	includeAnswer: z.union([z.boolean(), z.union(["basic", "advanced"])]).description("Answer request: true/basic quick, advanced detailed."),
	includeRawContent: z.union([z.boolean(), z.union(["markdown", "text"])]).description("Raw page content: boolean, markdown, or text; greatly increases context token usage."),
	timeout: z.number().step(100).min(1e3).description("Request timeout in milliseconds."),
	chunksPerSource: z.number().step(1).min(1).max(3).description("Snippet chunks per source (1–3); larger is richer, more tokens."),
	timeRange: z.union([
		"day",
		"week",
		"month",
		"year",
		"d",
		"w",
		"m",
		"y"
	]).description("Recency preset for news/finance topics."),
	startDate: z.string().description("Include only results after this YYYY-MM-DD date."),
	endDate: z.string().description("Include only results before this YYYY-MM-DD date."),
	includeImages: z.boolean().description("Collect query-related and per-source images."),
	includeImageDescriptions: z.boolean().description("With includeImages, add a description per image."),
	includeFavicon: z.boolean().description("Include the favicon URL for each result."),
	includeDomains: z.array(z.string()).description("Only include these domains in results."),
	excludeDomains: z.array(z.string()).description("Exclude these domains from results."),
	country: z.string().description("Boost results from one country (general topic)."),
	maxResults: z.number().step(1).min(1).max(20).description("Default number of web results per search."),
	numResults: z.number().step(1).min(1).max(20).description("Legacy alias for maxResults; prefer maxResults."),
	searchMode: z.union(["tavily-only", "deepseek-first"]).description("Search composition: Tavily-only or DeepSeek-first with Tavily merge.")
});
/** Settings namespace carrying this provider's endpoint, depth, topic, and key reference. */
const WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE = settingsNamespace("web-search-tavily");
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
function resolveOptions(ctx, config, entry) {
	const effective = {
		...config,
		...definedConfig(entry)
	};
	const apiKeyEnv = credentialRef(effective.apiKeyEnv ?? "TAVILY_API_KEY");
	const literalApiKey = effective.apiKey !== void 0 && effective.apiKey.length > 0 ? effective.apiKey : void 0;
	return {
		...literalApiKey === void 0 ? {} : { apiKey: literalApiKey },
		resolveApiKey: async () => {
			const credentials = ctx.get("credentials");
			if (credentials !== void 0) return (await credentials.resolve(apiKeyEnv))?.value;
			const ambient = process.env[apiKeyEnv];
			return ambient !== void 0 && ambient.length > 0 ? ambient : void 0;
		},
		apiKeyEnv,
		baseURL: effective.baseURL ?? "https://api.tavily.com",
		searchDepth: effective.searchDepth ?? "basic",
		topic: effective.topic ?? "general",
		includeAnswer: effective.includeAnswer ?? true,
		includeRawContent: effective.includeRawContent ?? false,
		timeout: effective.timeout ?? 3e4,
		maxResults: effective.maxResults ?? effective.numResults ?? 5,
		...effective.days !== void 0 ? { days: effective.days } : {},
		...effective.chunksPerSource !== void 0 ? { chunksPerSource: effective.chunksPerSource } : {},
		...effective.timeRange !== void 0 ? { timeRange: effective.timeRange } : {},
		...effective.startDate !== void 0 ? { startDate: effective.startDate } : {},
		...effective.endDate !== void 0 ? { endDate: effective.endDate } : {},
		...effective.includeImages !== void 0 ? { includeImages: effective.includeImages } : {},
		...effective.includeImageDescriptions !== void 0 ? { includeImageDescriptions: effective.includeImageDescriptions } : {},
		...effective.includeFavicon !== void 0 ? { includeFavicon: effective.includeFavicon } : {},
		...effective.includeDomains !== void 0 ? { includeDomains: effective.includeDomains } : {},
		...effective.excludeDomains !== void 0 ? { excludeDomains: effective.excludeDomains } : {},
		...effective.country !== void 0 ? { country: effective.country } : {}
	};
}
/**
* Build the optional secondary search used by `deepseek-first` mode.
*
* The web seam deliberately exposes no provider lookup API, so this reads the
* registry through the runtime's internal map. It looks for a provider whose id
* contains `deepseek` and is available; if none exists the mode degrades to a
* Tavily-only search (the provider's own catch hides any absence/failure).
*/
function hybridDeepSeekSearch(ctx) {
	return async (request, signal) => {
		const providers = ctx.web.searchProviders;
		if (providers === void 0) return void 0;
		const secondary = providers.get("deepseek") ?? [...providers.values()].find((provider) => provider.id !== "tavily" && provider.id.includes("deepseek") && provider.available());
		if (secondary === void 0 || !secondary.available()) return void 0;
		return secondary.search(request, signal);
	};
}
/** Register the Tavily search provider with `ctx.web`. */
function apply(ctx, config) {
	const entry = config;
	let current = () => config;
	installSettingsSection(ctx, WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE, Config, config, {
		setSource: (source) => {
			current = source;
		},
		onChange: () => {}
	});
	ctx.web.registerSearchProvider(new TavilySearchProvider(() => resolveOptions(ctx, current(), entry), () => current().searchMode === "deepseek-first" ? hybridDeepSeekSearch(ctx) : void 0));
}
/** Copy only explicitly defined entry fields, so validation-added keys never count as yaml overrides. */
function definedConfig(config) {
	const result = {};
	for (const key of Object.keys(config)) {
		const value = config[key];
		if (value !== void 0) result[key] = value;
	}
	return result;
}
//#endregion
export { Config, TAVILY_DEFAULT_API_KEY_ENV, TAVILY_DEFAULT_BASE_URL, TAVILY_DEFAULT_INCLUDE_ANSWER, TAVILY_DEFAULT_INCLUDE_RAW_CONTENT, TAVILY_DEFAULT_MAX_RESULTS, TAVILY_DEFAULT_SEARCH_DEPTH, TAVILY_DEFAULT_TIMEOUT, TAVILY_DEFAULT_TOPIC, TAVILY_PROVIDER_ID, TavilySearchProvider, WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE, apply, inject, name };
