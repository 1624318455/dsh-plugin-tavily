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
/** Stable id the Tavily Extract fetch provider registers under. */
const TAVILY_EXTRACT_PROVIDER_ID = "tavily-extract";
/** Default Tavily endpoint; `/search` is the operation. */
const TAVILY_DEFAULT_BASE_URL = "https://api.tavily.com";
/** Usage (credit) endpoint appended to the base URL. */
const TAVILY_DEFAULT_USAGE_PATH = "/usage";
/** Extract (page retrieval) endpoint appended to the base URL. */
const TAVILY_DEFAULT_EXTRACT_PATH = "/extract";
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
/** Base delay (ms) for the exponential rate-limit backoff before retrying. */
const RETRY_BASE_DELAY_MS = 250;
/** Ceiling (ms) for the exponential rate-limit backoff. */
const RETRY_MAX_DELAY_MS = 4e3;
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
/**
* Estimated Tavily credits one search at this depth consumes. `advanced`
* costs 2 credits; `basic`, `fast`, and `ultra-fast` cost 1 each.
* @param searchDepth - the configured/given search depth.
* @returns the estimated credit cost.
*/
function estimateSearchCredits(searchDepth) {
	return searchDepth === "advanced" ? 2 : 1;
}
/** The Tavily-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
var TavilySearchProvider = class {
	resolveOptions;
	deepseekDelegate;
	id = TAVILY_PROVIDER_ID;
	/** Short-lived in-memory result cache, keyed by a request/options fingerprint. */
	cache = /* @__PURE__ */ new Map();
	/**
	* @param resolveOptions - thunk producing one operation's option snapshot. The
	*   section is re-read per search, so a settings edit applies live without
	*   re-registration; the snapshot also keeps the resolved key and the endpoint
	*   it is sent to from one section.
	* @param deepseekDelegate - thunk returning the official DeepSeek search to
	*   answer when the card's engine switch is `deepseek`. Evaluated per op, so
	*   switching engines takes effect live.
	*/
	constructor(resolveOptions, deepseekDelegate) {
		this.resolveOptions = resolveOptions;
		this.deepseekDelegate = deepseekDelegate;
	}
	available() {
		const options = this.resolveOptions();
		return ((options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== void 0) && isValidBaseUrl(options.baseURL) && (options.days === void 0 || isPositiveInteger(options.days)) && (options.chunksPerSource === void 0 || isPositiveInteger(options.chunksPerSource)) && (options.maxResults === void 0 || isPositiveInteger(options.maxResults)) && (options.numResults === void 0 || isPositiveInteger(options.numResults)) && (options.timeout === void 0 || options.timeout > 0) && (options.retryMaxAttempts === void 0 || options.retryMaxAttempts >= 0) && (options.cacheTtlMs === void 0 || options.cacheTtlMs >= 0);
	}
	async search(request, signal) {
		const options = this.resolveOptions();
		if (!await (options.resolveEnabled?.() ?? Promise.resolve(true))) {
			const deepseek = this.deepseekDelegate?.();
			if (deepseek === void 0) throw new WebError("Tavily is switched to the official DeepSeek provider, but no DeepSeek search is available; configure a DeepSeek key or switch back to Tavily", "WEB_PROVIDER_ERROR");
			const delegated = await deepseek(request, signal);
			if (delegated === void 0) throw new WebError("official DeepSeek search returned no result", "WEB_PROVIDER_ERROR");
			return delegated;
		}
		const apiKey = await resolveRequestApiKey(options, signal);
		return this.tavilySearch(request, signal, options, apiKey);
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
	async usage(signal) {
		const options = this.resolveOptions();
		const apiKey = await resolveRequestApiKey(options, signal);
		const { signal: requestSignal, timeoutSignal } = makeRequestSignal(signal, options.timeout);
		let response;
		try {
			response = await fetch(`${options.baseURL}${TAVILY_DEFAULT_USAGE_PATH}`, {
				method: "GET",
				redirect: "error",
				headers: {
					"authorization": `Bearer ${apiKey}`,
					"accept": "application/json",
					"user-agent": USER_AGENT
				},
				...requestSignal !== void 0 ? { signal: requestSignal } : {}
			});
		} catch (error) {
			throw classifiedSearchError(error, signal, timeoutSignal, options.timeout);
		}
		if (!response.ok) {
			let message = `Tavily usage API error (HTTP ${response.status})`;
			try {
				const parsed = await response.json();
				const detail = parsed.detail?.error ?? parsed.error ?? parsed.message;
				if (detail !== void 0 && detail.length > 0) message = detail;
			} catch (_errorBodyReadFailure) {
				if (timeoutSignal?.aborted === true) throw new WebError(`Tavily usage timed out after ${options.timeout}ms`, "WEB_PROVIDER_ERROR");
				if (signal?.aborted === true) throw searchAborted(signal);
			}
			throw new WebError(message, "WEB_PROVIDER_ERROR");
		}
		try {
			return await response.json();
		} catch (error) {
			throw classifiedSearchError(error, signal, timeoutSignal, options.timeout);
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
	async connectivityTest(signal) {
		const options = this.resolveOptions();
		const apiKey = await resolveRequestApiKey(options, signal);
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
					query: "connectivity test",
					search_depth: "basic",
					topic: "general",
					include_answer: false,
					max_results: 1
				}),
				...requestSignal !== void 0 ? { signal: requestSignal } : {}
			});
		} catch (error) {
			throw classifiedSearchError(error, signal, timeoutSignal, options.timeout);
		}
		if (!response.ok) {
			let message = `Tavily connectivity test failed (HTTP ${response.status})`;
			try {
				const parsed = await response.json();
				const detail = parsed.detail?.error ?? parsed.error ?? parsed.message;
				if (detail !== void 0 && detail.length > 0) message = detail;
			} catch (error) {
				if (timeoutSignal?.aborted === true) throw new WebError(`Tavily connectivity test timed out after ${options.timeout}ms`, "WEB_PROVIDER_ERROR", { cause: error });
				if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
			}
			throw new WebError(message, "WEB_PROVIDER_ERROR");
		}
		return true;
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
	async probe(draft, clearKey = false) {
		const options = this.resolveOptions();
		let apiKey = draft?.trim() ?? "";
		if (apiKey === "" && !clearKey) try {
			apiKey = await resolveRequestApiKey(options);
		} catch (_resolveFailure) {
			apiKey = "";
		}
		const mode = apiKey.length > 0 ? "key" : "keyless";
		try {
			const { signal: requestSignal, timeoutSignal } = makeRequestSignal(void 0, options.timeout);
			const headers = {
				"content-type": "application/json",
				"accept": "application/json",
				"user-agent": USER_AGENT
			};
			let response;
			try {
				response = await fetch(`${options.baseURL}/search`, {
					method: "POST",
					redirect: "error",
					headers: apiKey.length > 0 ? {
						...headers,
						"authorization": `Bearer ${apiKey}`
					} : headers,
					body: JSON.stringify({
						query: "tavily",
						search_depth: "basic",
						topic: "general",
						include_answer: false,
						max_results: 1
					}),
					...requestSignal !== void 0 ? { signal: requestSignal } : {}
				});
			} catch (error) {
				if (timeoutSignal?.aborted === true) return {
					ok: false,
					mode,
					code: "timeout",
					error: `timed out after ${options.timeout}ms`
				};
				return {
					ok: false,
					mode,
					code: "network",
					error: String(error)
				};
			}
			if (!response.ok) {
				let message = `HTTP ${response.status}`;
				try {
					const parsed = await response.json();
					message = parsed.detail?.error ?? parsed.error ?? parsed.message ?? message;
				} catch (_bodyFailure) {}
				return {
					ok: false,
					mode,
					code: response.status === 401 || response.status === 403 ? "invalid_key" : "http",
					error: message
				};
			}
			return {
				ok: true,
				mode
			};
		} catch (error) {
			return {
				ok: false,
				mode,
				code: "other",
				error: String(error)
			};
		}
	}
	/**
	* Build the request fingerprint identifying a cacheable search. Every
	* parameter that can change the result (plus the resolved key, so one key's
	* results are never served to another) contributes to the key.
	*/
	cacheFingerprint(request, options, maxResults, apiKey) {
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
			apiKey
		});
	}
	/** Run the Tavily request itself with an already-resolved API key. */
	async tavilySearch(request, signal, options, apiKey) {
		const maxResults = request.maxResults ?? options.maxResults ?? options.numResults;
		const cacheTtl = options.cacheTtlMs ?? 0;
		const cacheKey = cacheTtl > 0 ? this.cacheFingerprint(request, options, maxResults, apiKey) : void 0;
		if (cacheKey !== void 0) {
			const hit = this.cache.get(cacheKey);
			if (hit !== void 0 && hit.expires > Date.now()) return hit.result;
		}
		const { signal: requestSignal, timeoutSignal } = makeRequestSignal(signal, options.timeout);
		const maxAttempts = options.retryMaxAttempts ?? 2;
		let attempt = 0;
		const requestBody = requestBodyOf(request, options, maxResults);
		for (;;) {
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
					body: requestBody,
					...requestSignal !== void 0 ? { signal: requestSignal } : {}
				});
			} catch (error) {
				throw classifiedSearchError(error, signal, timeoutSignal, options.timeout);
			}
			if (response.status === 429 && attempt < maxAttempts) {
				attempt += 1;
				await abortableDelay(retryDelayMs(response.headers.get("retry-after"), attempt), requestSignal, timeoutSignal, options.timeout);
				continue;
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
				const result = mapTavilyResponse(await response.json());
				if (cacheKey !== void 0) this.cache.set(cacheKey, {
					expires: Date.now() + cacheTtl,
					result
				});
				return result;
			} catch (error) {
				throw classifiedSearchError(error, signal, timeoutSignal, options.timeout);
			}
		}
	}
};
/**
* A `WebFetchProvider` backed by Tavily's `POST /extract` endpoint: given one
* URL it returns the cleaned page content classified as text or html. It shares
* the Tavily credential/options resolution with the search provider, and
* registers under a distinct fetch-provider id (`tavily-extract`) so selecting
* the fetch provider never interferes with the search provider.
*/
var TavilyExtractProvider = class {
	resolveOptions;
	id = TAVILY_EXTRACT_PROVIDER_ID;
	/**
	* @param resolveOptions - thunk producing the shared Tavily option snapshot
	*   (endpoint base, timeout, credential reference).
	*/
	constructor(resolveOptions) {
		this.resolveOptions = resolveOptions;
	}
	available() {
		const options = this.resolveOptions();
		return ((options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== void 0) && isValidBaseUrl(options.baseURL) && (options.timeout === void 0 || options.timeout > 0);
	}
	async fetch(request, signal) {
		const options = this.resolveOptions();
		const apiKey = await resolveRequestApiKey(options, signal);
		const { signal: requestSignal, timeoutSignal } = makeRequestSignal(signal, options.timeout);
		let response;
		try {
			response = await fetch(`${options.baseURL}${TAVILY_DEFAULT_EXTRACT_PATH}`, {
				method: "POST",
				redirect: "error",
				headers: {
					"authorization": `Bearer ${apiKey}`,
					"content-type": "application/json",
					"accept": "application/json",
					"user-agent": USER_AGENT
				},
				body: JSON.stringify({ urls: [request.url] }),
				...requestSignal !== void 0 ? { signal: requestSignal } : {}
			});
		} catch (error) {
			throw classifiedSearchError(error, signal, timeoutSignal, options.timeout);
		}
		if (!response.ok) {
			let message = `Tavily extract API error (HTTP ${response.status})`;
			try {
				const parsed = await response.json();
				const detail = parsed.detail?.error ?? parsed.error ?? parsed.message;
				if (detail !== void 0 && detail.length > 0) message = detail;
			} catch (error) {
				if (timeoutSignal?.aborted === true) throw new WebError(`Tavily extract timed out after ${options.timeout}ms`, "WEB_PROVIDER_ERROR", { cause: error });
				if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
			}
			throw new WebError(message, "WEB_PROVIDER_ERROR");
		}
		try {
			const payload = await response.json();
			const content = ((payload.results ?? []).find((item) => item.url === request.url) ?? (payload.results ?? [])[0])?.raw_content ?? "";
			return {
				url: response.url === "" ? request.url : response.url,
				statusCode: response.status,
				body: classifyFetchBody(content),
				truncated: false
			};
		} catch (error) {
			throw classifiedSearchError(error, signal, timeoutSignal, options.timeout);
		}
	}
};
/**
* Classify Tavily's extracted content as `html` when it clearly contains markup
* or `text` otherwise (Tavily typically returns cleaned, LLM-ready text).
*/
function classifyFetchBody(content) {
	return /<\/?[a-z][\s\S]*?>/i.test(content) ? {
		kind: "html",
		content
	} : {
		kind: "text",
		content
	};
}
/**
* Resolve one operation's credential without retaining it on the provider.
* @param options - the caller's snapshot, so the key and the endpoint it is sent to come from one section.
* @param signal - abort signal for the surrounding operation.
* @returns the resolved key.
*/
function resolveRequestApiKey(options, signal) {
	throwIfSearchAborted(signal);
	if (options.apiKey !== void 0 && options.apiKey.length > 0) return Promise.resolve(options.apiKey);
	return abortable(options.resolveApiKey?.() ?? Promise.resolve(void 0), signal).then((resolved) => {
		if (resolved !== void 0 && resolved.length > 0) return resolved;
		const ref = options.apiKeyEnv ?? "TAVILY_API_KEY";
		throw new WebError(`Tavily search has no API key for "${ref}"; store it through the credentials service (the web Plugins page writes it), export it in the launching environment, or set a literal "apiKey" in the web-search-tavily config`, "WEB_PROVIDER_CREDENTIAL_MISSING");
	}, (error) => {
		if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
		throw new WebError(`Tavily search credential resolution failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
	});
}
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
/**
* Serialize the Tavily request body once per search so every retry attempt
* sends exactly the same payload (the request parameters do not change between
* attempts).
*/
function requestBodyOf(request, options, maxResults) {
	return JSON.stringify({
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
	});
}
/** Parse a `retry-after` header into seconds (`undefined` when unparsable). */
function retryAfterSeconds(value) {
	if (value === null) return void 0;
	const trimmed = value.trim();
	if (trimmed === "") return void 0;
	const seconds = Number(trimmed);
	if (Number.isFinite(seconds)) return seconds >= 0 ? seconds : void 0;
	const date = Date.parse(trimmed);
	if (Number.isNaN(date)) return void 0;
	return Math.max(0, (date - Date.now()) / 1e3);
}
/**
* Choose the delay before the next rate-limit retry. The explicit `retry-after`
* header wins when present; otherwise apply exponential backoff. The result is
* clamped so a single search never blocks for an unbounded time.
*/
function retryDelayMs(retryAfter, attempt) {
	const explicit = retryAfterSeconds(retryAfter);
	const backoff = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
	const millis = explicit !== void 0 ? explicit * 1e3 : backoff;
	return Math.min(Math.max(millis, 100), RETRY_MAX_DELAY_MS);
}
/**
* Sleep for `ms`, rejecting early when the request (or its timeout) aborts.
* A timeout during the wait is a provider error; an external cancellation is
* `WEB_ABORTED`.
*/
function abortableDelay(ms, signal, timeoutSignal, timeoutMs) {
	return new Promise((resolve, reject) => {
		let timer;
		const finish = () => {
			if (timer !== void 0) clearTimeout(timer);
			if (signal !== void 0) signal.removeEventListener("abort", onAbort);
		};
		function onAbort() {
			finish();
			reject(timeoutSignal?.aborted === true ? new WebError(`Tavily search timed out after ${timeoutMs}ms`, "WEB_PROVIDER_ERROR") : searchAborted());
		}
		if (signal !== void 0) {
			if (signal.aborted) return onAbort();
			signal.addEventListener("abort", onAbort, { once: true });
		}
		timer = setTimeout(() => {
			finish();
			resolve();
		}, ms);
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
/** The seams this plugin registers into: web providers + an HTTP probe route. */
const inject = ["web", "webServer"];
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
	retryMaxAttempts: z.number().step(1).min(0).max(5).description("Extra attempts after a rate-limited (429) response."),
	cacheTtlSeconds: z.number().step(1).min(0).max(3600).description("Query-cache TTL in seconds (0 disables the cache)."),
	numResults: z.number().step(1).min(1).max(20).description("Legacy alias for maxResults; prefer maxResults."),
	engine: z.union(["tavily", "deepseek"]).description("Answer web_search with Tavily (keyless if no key) or the official DeepSeek provider.")
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
		resolveEnabled: async () => (effective.engine ?? "tavily") === "tavily",
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
		...effective.country !== void 0 ? { country: effective.country } : {},
		...effective.retryMaxAttempts !== void 0 ? { retryMaxAttempts: effective.retryMaxAttempts } : {},
		...effective.cacheTtlSeconds !== void 0 ? { cacheTtlMs: effective.cacheTtlSeconds * 1e3 } : {}
	};
}
/**
* Build the official DeepSeek search used when the card's engine switch is
* `deepseek`. The web seam deliberately exposes no public provider-lookup API,
* so this reads the registry through the runtime's internal map (guarded: an
* absent map yields no delegate). It looks for a registered provider whose id
* is `deepseek` (or contains `deepseek`) and is `available()`. If none exists,
* the provider throws a clear error instead of silently degrading.
*/
function deepseekSearch(ctx) {
	return async (request, signal) => {
		const providers = ctx.web.searchProviders;
		if (providers === void 0) return void 0;
		const secondary = providers.get("deepseek") ?? [...providers.values()].find((provider) => provider.id !== "tavily" && provider.id.includes("deepseek") && provider.available());
		if (secondary === void 0 || !secondary.available()) return void 0;
		return secondary.search(request, signal);
	};
}
/**
* Resolve the web seam's configured search-provider id (`config.searchProvider`
* ?? `DSH_WEB_SEARCH_PROVIDER`), or `undefined` when selection is left to the
* seam's auto-selection rules.
*
* This is an informational read of a runtime-internal field; it never mutates
* anything and is only used to warn when the active provider is not Tavily.
*/
function configuredSearchProviderId(ctx) {
	return ctx.web.searchProviderId;
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
	const provider = new TavilySearchProvider(() => resolveOptions(ctx, current(), entry), () => deepseekSearch(ctx));
	ctx.web.registerSearchProvider(provider);
	ctx.web.registerFetchProvider(new TavilyExtractProvider(() => resolveOptions(ctx, current(), entry)));
	ctx.webServer.register({
		kind: "exact",
		path: "/api/tavily-probe",
		handler: async (req, res) => {
			if (req.method !== "POST") {
				sendJson(res, 405, {
					ok: false,
					code: "other",
					error: "method not allowed"
				});
				return;
			}
			try {
				const body = await readJsonBody(req);
				const draft = typeof body.apiKey === "string" ? body.apiKey : void 0;
				const clearKey = body.clearKey === true;
				res.writeHead(200, {
					"content-type": "application/json; charset=utf-8",
					"cache-control": "no-store"
				});
				res.end(JSON.stringify(await provider.probe(draft, clearKey)));
			} catch (error) {
				const detail = error instanceof Error ? error.message : String(error);
				if (detail === "invalid JSON body" || detail === "body too large") {
					sendJson(res, 400, {
						ok: false,
						code: "other",
						error: detail
					});
					return;
				}
				sendJson(res, 200, {
					ok: false,
					code: "other",
					error: detail
				});
			}
		}
	});
	warnIfNotActiveSearchProvider(ctx);
}
/** Serialize a JSON response. */
function sendJson(res, status, payload) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(JSON.stringify(payload));
}
/** Read and parse a small JSON request body. */
function readJsonBody(req, limit = 4096) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > limit) {
				reject(/* @__PURE__ */ new Error("body too large"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			const text = Buffer.concat(chunks).toString("utf8").trim();
			if (text === "") {
				resolve({});
				return;
			}
			try {
				const json = JSON.parse(text);
				resolve(json !== null && typeof json === "object" && !Array.isArray(json) ? json : {});
			} catch {
				reject(/* @__PURE__ */ new Error("invalid JSON body"));
			}
		});
		req.on("error", reject);
	});
}
/**
* Warn when another provider is elected for `web_search` instead of this
* plugin's `tavily`. Because the bundle now elects `tavily` itself
* (`web.searchProvider: tavily`), a fresh install should not hit this; it fires
* only if a later `web` patch overrides the provider. `engine` (the card switch)
* selects between Tavily and official DeepSeek underneath the single provider.
*/
function warnIfNotActiveSearchProvider(ctx) {
	const logger = ctx.logger("dsh-plugin-tavily");
	const active = configuredSearchProviderId(ctx);
	const FIX = "ensure web.config.searchProvider: tavily in cordis.patch.yml (the plugin already sets it), then restart dsh.";
	if (active !== void 0 && active !== "tavily") logger.warn(`web_search is currently configured to the "${active}" search provider, NOT Tavily. To use this plugin, ${FIX}`);
	else if (active === void 0) logger.warn(`no web search provider is explicitly selected; the seam auto-selects. If web_search is answered by another provider (e.g. deepseek) and reports a missing DeepSeek key, ${FIX}`);
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
export { Config, TAVILY_DEFAULT_API_KEY_ENV, TAVILY_DEFAULT_BASE_URL, TAVILY_DEFAULT_EXTRACT_PATH, TAVILY_DEFAULT_INCLUDE_ANSWER, TAVILY_DEFAULT_INCLUDE_RAW_CONTENT, TAVILY_DEFAULT_MAX_RESULTS, TAVILY_DEFAULT_SEARCH_DEPTH, TAVILY_DEFAULT_TIMEOUT, TAVILY_DEFAULT_TOPIC, TAVILY_DEFAULT_USAGE_PATH, TAVILY_EXTRACT_PROVIDER_ID, TAVILY_PROVIDER_ID, TavilyExtractProvider, TavilySearchProvider, WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE, apply, estimateSearchCredits, inject, name };
