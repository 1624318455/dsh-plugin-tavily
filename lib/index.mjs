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
/** Default search depth: `basic` (faster, cheaper) rather than `advanced`. */
const TAVILY_DEFAULT_SEARCH_DEPTH = "basic";
/** Default topic: the general web (not news or finance). */
const TAVILY_DEFAULT_TOPIC = "general";
/** Default: request Tavily's generated answer and carry it as `content`. */
const TAVILY_DEFAULT_INCLUDE_ANSWER = true;
/** Credential reference resolved when the section names none. */
const TAVILY_DEFAULT_API_KEY_ENV = "TAVILY_API_KEY";
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
	resolveOptions;
	id = TAVILY_PROVIDER_ID;
	/**
	* @param resolveOptions - thunk producing one operation's option snapshot. The
	*   section is re-read per search, so a settings edit applies live without
	*   re-registration; the snapshot also keeps the resolved key and the endpoint
	*   it is sent to from one section.
	*/
	constructor(resolveOptions) {
		this.resolveOptions = resolveOptions;
	}
	available() {
		const options = this.resolveOptions();
		return ((options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== void 0) && isValidBaseUrl(options.baseURL) && (options.days === void 0 || isPositiveInteger(options.days)) && (options.numResults === void 0 || isPositiveInteger(options.numResults));
	}
	async search(request, signal) {
		const options = this.resolveOptions();
		const apiKey = await this.apiKey(options, signal);
		const maxResults = request.maxResults ?? options.numResults;
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
					...maxResults !== void 0 ? { max_results: maxResults } : {},
					...options.days !== void 0 ? { days: options.days } : {}
				}),
				...signal !== void 0 ? { signal } : {}
			});
		} catch (error) {
			if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
			throw new WebError(`Tavily search request failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
		}
		if (!response.ok) {
			let message = `Tavily API error (HTTP ${response.status})`;
			try {
				const parsed = await response.json();
				const detail = parsed.detail?.error ?? parsed.error ?? parsed.message;
				if (detail !== void 0 && detail.length > 0) message = detail;
			} catch (error) {
				if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
			}
			throw new WebError(message, "WEB_PROVIDER_ERROR");
		}
		try {
			return mapTavilyResponse(await response.json());
		} catch (error) {
			if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
			if (error instanceof WebError) throw error;
			throw new WebError(`Tavily returned an unprocessable response body: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
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
/** True for a request limit that can be sent to Tavily (a positive whole number). */
function isPositiveInteger(value) {
	return Number.isInteger(value) && value > 0;
}
/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
function isAbortError(error) {
	return error instanceof DOMException && error.name === "AbortError";
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
	apiKey: z.string().role("secret"),
	apiKeyEnv: z.string().role("credential-ref").default(TAVILY_DEFAULT_API_KEY_ENV),
	baseURL: z.string(),
	searchDepth: z.union(["basic", "advanced"]).default(TAVILY_DEFAULT_SEARCH_DEPTH),
	topic: z.union([
		"general",
		"news",
		"finance"
	]).default(TAVILY_DEFAULT_TOPIC),
	days: z.number().step(1).min(1),
	includeAnswer: z.boolean().default(true),
	numResults: z.number().step(1).min(1)
});
/** Settings namespace carrying this provider's endpoint, depth, topic, and key reference. */
const WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE = settingsNamespace("web-search-tavily");
/**
* Project one resolved section into the options the provider serves its next
* search with. Environment fallbacks stay here rather than in the provider:
* every value it reads is already fully defaulted.
* @param ctx - plugin context supplying the credential plane.
* @param config - the currently authoritative section.
* @returns options for one search.
*/
function resolveOptions(ctx, config) {
	const apiKeyEnv = credentialRef(config.apiKeyEnv ?? "TAVILY_API_KEY");
	const literalApiKey = config.apiKey !== void 0 && config.apiKey.length > 0 ? config.apiKey : void 0;
	return {
		...literalApiKey === void 0 ? {} : { apiKey: literalApiKey },
		resolveApiKey: async () => {
			const credentials = ctx.get("credentials");
			if (credentials !== void 0) return (await credentials.resolve(apiKeyEnv))?.value;
			const ambient = process.env[apiKeyEnv];
			return ambient !== void 0 && ambient.length > 0 ? ambient : void 0;
		},
		apiKeyEnv,
		baseURL: config.baseURL ?? "https://api.tavily.com",
		searchDepth: config.searchDepth ?? "basic",
		topic: config.topic ?? "general",
		includeAnswer: config.includeAnswer ?? true,
		...config.days !== void 0 ? { days: config.days } : {},
		...config.numResults !== void 0 ? { numResults: config.numResults } : {}
	};
}
/** Register the Tavily search provider with `ctx.web`. */
function apply(ctx, config) {
	let current = () => config;
	installSettingsSection(ctx, WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE, Config, config, {
		setSource: (source) => {
			current = source;
		},
		onChange: () => {}
	});
	ctx.web.registerSearchProvider(new TavilySearchProvider(() => resolveOptions(ctx, current())));
}
//#endregion
export { Config, TAVILY_DEFAULT_API_KEY_ENV, TAVILY_DEFAULT_BASE_URL, TAVILY_DEFAULT_INCLUDE_ANSWER, TAVILY_DEFAULT_SEARCH_DEPTH, TAVILY_DEFAULT_TOPIC, TAVILY_PROVIDER_ID, TavilySearchProvider, WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE, apply, inject, name };
