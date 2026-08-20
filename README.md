# dsh-plugin-tavily

English | [中文](README.zh.md)

A [Tavily](https://tavily.com)-backed **web search provider plugin** for [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness). It is the **professional/pro-user edition**: it exposes the full Tavily request parameter set through the web GUI, while still letting developers pin values from the profile configuration file.

It registers a `tavily` search provider into the harness's `ctx.web` seam, so the built-in `web_search` tool searches the web through Tavily — and ships a **settings card** in the web GUI (`设置 → 插件 → 网页搜索`) where you paste your API key, tune advanced parameters, and test connectivity. One install, both halves.

## Features

- **Install-and-use (no manual config)**: installing this plugin **auto-selects Tavily as the `web_search` provider** via its `cordis.patch.yml`. Paste a key in the card and search — no yaml or `DSH_WEB_SEARCH_PROVIDER` edits required.
- **Tavily/DeepSeek engine switch**: a GUI switch answers `web_search` with Tavily (default; keyless if no key) or falls back to the **official DeepSeek** provider — no uninstall needed. This is a real provider-switch UI, not a config file edit.
- **Server-side connectivity probe**: `POST /api/tavily-probe` lets the card test a **stored** key (browsers cannot read stored secrets), using keyless mode when none is set.
- **Full professional parameter set in the GUI**: API key, API Base URL, `maxResults`, `searchDepth` (basic/advanced/fast/ultra-fast), `topic`, `includeAnswer`, `includeRawContent`, `timeout`, `days`, `chunksPerSource`, `timeRange`, `startDate`/`endDate`, `includeImages`, `includeDomains`/`excludeDomains`, and `country` are editable from the card; advanced fields are tucked into a collapsed `<details>` block so ordinary users are not overwhelmed.
- **Configuration-first priority**: `cordis.patch.yml` > WebUI > code defaults. Any field explicitly set in the yaml is shown disabled on the card with a "covered by config file" badge, so a stale UI value can never shadow a developer's pinned config.
- **API connectivity test**: a lightweight `Test API connection` button checks the currently entered key/base URL directly from the browser and reports success or the API error. Stored keys cannot be read back by the browser by design, so testing an already-configured key requires re-entering it once (it is not saved again).
- **Usage & cost panel**: the card shows a live per-search credit/token estimate for the current settings, plus a `Check usage` button that reads Tavily `GET /usage` (remaining credits, search usage, plan) with the currently entered key. A host-side `usage()` method on the provider exposes the same data where the stored key is available.
- **Page extraction**: a Tavily Extract-backed fetch provider (`tavily-extract`) reads a full page from a URL and returns it as clean text/html — select it once and URL retrieval is answered by Tavily.
- **Rate-limit retry & cache**: extra attempts after a 429 response honor Tavily's `retry-after` with a bounded backoff, and an optional TTL cache serves identical searches to save credits.
- **Credential-first key handling**: per-search resolution order is literal `apiKey` → credentials service (`apiKeyEnv`) → `process.env[apiKeyEnv]`.

## Install

```sh
dsh plugin --profile web add "github:1624318455/dsh-plugin-tavily#main"
```

During development, install from a local path instead:

```sh
dsh plugin --profile web add "file:/absolute/path/to/dsh-plugin-tavily"
```

The plugin registers the provider and its card only — it does **not** override your profile's chosen search provider.

## Enable

1. **Install & restart dsh.** The plugin's `cordis.patch.yml` already sets `web.config.searchProvider: tavily`, so Tavily is elected automatically — **no manual provider selection needed**.

2. **Set the Tavily API key** (optional). Open `设置 → 插件 → 网页搜索`, expand the **Web search (Tavily)** card, and paste the key into the **API key** field. Without a key Tavily runs **keyless** (free, rate-limited); with a key it uses your account tier. Choose the **Web search engine** switch: `tavily` (default) or `official DeepSeek`.

3. Use `web_search` as usual. The model-facing tool is unchanged; only the backend answering it is now Tavily (or DeepSeek, if you switched).

> If you ever override the provider in yaml by hand, this is the row:

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml
- id: web
  config:
    searchProvider: tavily
```

### Enable the fetch (Extract) provider (optional)

The plugin also registers a Tavily Extract-backed **fetch** provider (`tavily-extract`) for reading a full page's content from a URL. It is inert until selected — set the fetch provider the same way as the search provider:

```sh
export DSH_WEB_FETCH_PROVIDER=tavily-extract
```

or, in `cordis.patch.yml`:

```yaml
- id: web
  config:
    searchProvider: tavily
    fetchProvider: tavily-extract
```



### Verify the backend is really Tavily

The `web_search` tool's output schema is provider-agnostic — the model never sees a provider name, and the API key intentionally lives outside environment variables, so "check the env" is the wrong probe. To confirm the active backend:

- **Provider selection** — `~/.dsh/profiles/web/cordis.patch.yml` has the `web` row with `searchProvider: tavily`.
- **Plugin loaded** — `~/.dsh/settings.yaml` contains a `web-search-tavily` section (only the plugin's `installSettingsSection` writes it).
- **Credential in place** — `TAVILY_API_KEY` exists in the credentials store (`~/.dsh/.credentials.yaml`), not in the environment.
- **Result fingerprint** — a Tavily result carries a generated-answer summary in `content`; the built-in DeepSeek provider does not produce one.

### Troubleshooting: "I still get a DeepSeek API key error"

This plugin now **auto-selects Tavily** (`web.searchProvider: tavily`), so a fresh install answers `web_search` with Tavily — no such error in normal use. If you still see a DeepSeek key error:

- **You switched the engine to `official DeepSeek`** without a DeepSeek key. Switch the card's **Web search engine** back to `tavily` (or configure a DeepSeek key).
- **You overrode the provider in yaml.** Make sure no later `web` patch row points `searchProvider` at `deepseek` (the plugin's own row elects `tavily`).
- **It is an agent/assistant harness.** A chat app's own `web_search` is a different `web` seam that has not installed this plugin — it always uses the default DeepSeek backend and is unrelated to your Tavily install.

## 🖥️ GUI usage (recommended for most users)

Open `设置 → 插件 → 网页搜索` and expand the **Web search (Tavily)** card.

- **Basic area (always visible)**:
  - **Web search engine** — `Tavily` (default; keyless if no key) or `official DeepSeek`. This is the real provider switch; the plugin is already elected as the provider.
  - **API key** — paste your Tavily key. It is stored through the credentials service, never in a settings file.
  - **API Base URL** — leave blank for `https://api.tavily.com`, or set a proxy/endpoint base.
  - **Test API connection** — verifies the key/base URL you just entered. Testing consumes one Tavily search credit. If a key is already configured but you have not typed one, the card tells you to re-enter it once; the browser intentionally cannot read stored secrets back.
  - **Estimated cost** — a live line shows the estimated credits and rough token count for the current depth/result/chunk settings.
  - **Check usage** — reads Tavily `GET /usage` with the currently entered key and shows the remaining credits, search usage, and plan. Stored keys must be re-entered once, like the connectivity test.
- **Advanced area (`🔧 Advanced Tavily request parameters`)**:
  - **Max results** — how many web results per search (1–20, default 5).
  - **Search depth** — `basic` (balanced), `advanced` (2 credits, deep), `fast`, or `ultra-fast` (1 credit, lowest latency).
  - **Topic** — `general`, `news`, or `finance`.
  - **Generated answer** — `true`/`basic` (quick) or `advanced` (detailed).
  - **Raw page content** — `false`, `markdown`, or `text`; enabling greatly increases context token usage.
  - **Chunks per source** — snippet chunks per source (1–3).
  - **Time range** — recency preset (`day`/`week`/`month`/`year`/`d`/`w`/`m`/`y`).
  - **Start date / End date** — precise `YYYY-MM-DD` publish windows.
  - **Include images / Image descriptions / Include favicon** — request richer result metadata.
  - **Include domains / Exclude domains** — site allow/deny lists.
  - **Country boost** — bias toward one country (general topic).
  - **Rate-limit retries** — extra attempts (0–5) after a 429; waits honor `retry-after` with a bounded backoff.
  - **Cache TTL (seconds)** — cache identical searches to save credits; 0 disables (0–3600).
  - **Request timeout (ms)** — default 30000.
  - **Recency window (days)** — optional recency filter for news/finance topics.

Every control has a short hint and a placeholder showing the default. Values are saved with the card's **Save** button and apply live; no service restart is needed.

> If a field shows **"Covered by config file; edit the yaml to change"**, it is pinned by `cordis.patch.yml` — the WebUI deliberately does not allow overriding it.

## ⚙️ Config-file usage (developer/pro users)

Configuration lives in your profile's `cordis.patch.yml` (`~/.dsh/profiles/web/cordis.patch.yml`). Add a `web-search-tavily` row with a `config` block:

```yaml
- id: web-search-tavily
  name: '@dsh-external/dsh-plugin-tavily'
  config:
    searchDepth: advanced
    topic: news
    maxResults: 8
    includeRawContent: false
    timeout: 20000
    engine: tavily
```

### Priority

```
cordis.patch.yml config  >  WebUI card values  >  code defaults
```

- If a key is present in the yaml `config` block, the card disables that field and shows the configuration-covered badge.
- If the yaml does not set a field, the WebUI value (if any) is used.
- If neither sets it, the code default applies.

### Settings table

| Key | Default | Meaning | GUI editable |
|---|---|---|---|
| `apiKey` | unset | literal Tavily API key; prefer the credentials store instead | key field (via credentials) |
| `apiKeyEnv` | `TAVILY_API_KEY` | credential reference / environment key the provider resolves per search | config only |
| `baseURL` | `https://api.tavily.com` | endpoint base, `/search` appended | ✓ |
| `maxResults` | `5` | default number of web results per search (1–20) | ✓ |
| `searchDepth` | `basic` | `basic`/`advanced`/`fast`/`ultra-fast` | ✓ |
| `topic` | `general` | `general`, `news`, or `finance` | ✓ |
| `includeAnswer` | `true` | generated answer: `true`/`basic` (quick) or `advanced` (detailed) | ✓ |
| `includeRawContent` | `false` | raw page content: `false`, `markdown`, or `text` (context-heavy) | ✓ |
| `chunksPerSource` | `3` | snippet chunks per source (1–3) | ✓ |
| `timeRange` | unset | recency preset: `day`/`week`/`month`/`year`/`d`/`w`/`m`/`y` | ✓ |
| `timeout` | `30000` | request timeout in milliseconds | ✓ |
| `engine` | `tavily` | engine answering web_search: `tavily` (keyless if no key) or `deepseek` | ✓ |
| `days` | unset | recency window in days (news/finance topics) | ✓ |
| `retryMaxAttempts` | `2` | extra attempts after a 429 (0–5) | ✓ |
| `cacheTtlSeconds` | `0` | query-cache TTL in seconds (0 disables) | ✓ |
| `startDate` | unset | include results after this `YYYY-MM-DD` | ✓ |
| `endDate` | unset | include results before this `YYYY-MM-DD` | ✓ |
| `includeImages` | `false` | collect query-related and per-source images | ✓ |
| `includeImageDescriptions` | `false` | add a description per image | ✓ |
| `includeFavicon` | `false` | include the favicon URL per result | ✓ |
| `includeDomains` | `[]` | only include these domains (allow list) | ✓ |
| `excludeDomains` | `[]` | exclude these domains (deny list) | ✓ |
| `country` | unset | boost results from one country (general topic) | ✓ |
| `numResults` | `5` | **deprecated alias** for `maxResults` | no (use `maxResults`) |

`apiKeyEnv` stays config-only deliberately: it is an advanced wiring detail. Values saved from the GUI land in `~/.dsh/settings.yaml`'s `web-search-tavily` section. Settings edits apply live — the provider re-reads the section for every operation, so no restart or re-registration is needed after changing a value from the card or the file.

## Platform note (web GUI card visibility)

The web GUI serves a plugin's settings section to the browser only when its namespace is on the apiproxy allowlist (`WEB_SETTINGS_NAMESPACES` in `@deepseek-ai/dsh-host-apiproxy`). As of `0.1.0-rc.6` that list is hardcoded and the "let a plugin expose its own configuration" mechanism is deferred, so a freshly installed third-party card is filtered out even though the section is registered host-side. To make the **Web search (Tavily)** card render, add the namespace to the allowlist in your installed copy and restart dsh:

```js
// ~/.dsh/profiles/node_modules/@deepseek-ai/dsh-host-apiproxy/lib/index.js
// in the WEB_SETTINGS_NAMESPACES array:
"web-search-deepseek",
"web-search-tavily",   // ← add this line
```

The provider and all of its functionality work without this patch; only the GUI card is hidden. The patch is overwritten by `pnpm install --force` and by harness upgrades, so re-apply it after re-installing dependencies.

**Apply it with the included script** (idempotent; `--check` only reports):

```sh
node scripts/patch-apiproxy.mjs --check    # report whether a patch is needed
node scripts/patch-apiproxy.mjs            # patch every installed profile copy
node scripts/patch-apiproxy.mjs --profile web   # patch one profile
```

> **Server-side test of a stored key.** This plugin registers a host probe `POST /api/tavily-probe` that can test Tavily with a **stored** key server-side (keyless when none is set); `TavilySearchProvider.connectivityTest()` / `probe()` / `usage()` are the programmatic host-side paths. The browser cannot read stored secrets back, so the card's `Test API connection` button still requires re-entering an already-configured key.

## Mapping

Tavily's flat `results[]` maps to normalized `WebSearchSource`s: `url` ← `url`, `title` ← `title`, `snippet` ← the non-blank `content` (entries without content are dropped), `publishedAt` ← `published_date` (news/finance topics). Tavily's generated `answer` (when `includeAnswer`) becomes the result `content`. A request's `maxResults` wins over the configured default and is sent as Tavily's `max_results`; the seam enforces the final bound. The full professional request set is forwarded: `search_depth` (basic/advanced/fast/ultra-fast), `chunks_per_source`, `topic`, `time_range`, `start_date`/`end_date`, `days`, `include_answer` (boolean or `basic`/`advanced`), `include_raw_content` (boolean or `markdown`/`text`), `include_images`, `include_image_descriptions`, `include_favicon`, `include_domains`/`exclude_domains`, and `country`. Note: `include_images`/`include_favicon` are sent to Tavily but cannot yet be surfaced through the normalized `WebSearchSource` shape (the seam has no image/favicon field); they are exposed so the request can carry them. Failures surface as the seam's `WebError` (`WEB_PROVIDER_ERROR` / `WEB_ABORTED`); request timeouts are reported as `WEB_PROVIDER_ERROR`.

## Roadmap (planned)

High-confidence follow-ups identified in the product analysis:

- ✅ **Usage / cost panel** — `GET /usage` in the card + live credit/token estimate (implemented).
- ✅ **429 retry + short cache** — `retry-after`-aware backoff + optional TTL cache (implemented).
- ✅ **Extract capability** — a Tavily Extract-backed `WebFetchProvider` registered on the existing fetch seam (implemented).
- ✅ **apiproxy allowlist friction** — an idempotent `scripts/patch-apiproxy.mjs` (implemented).

## Development

```sh
pnpm install
pnpm run build          # tsdown → lib/index.mjs (host) + lib/client.cjs (browser, committed)
pnpm run typecheck      # tsc --noEmit
node tests/decode-check.mjs   # schema round-trip check (no network)
pnpm test               # real-API smoke: needs TAVILY_API_KEY
```

`lib/` is committed so the plugin installs without a build step (no `prepare` script, no pnpm build-script allowlisting). The `@deepseek-ai/*` seam and framework packages are **externalized** — the harness provides them at runtime, declared as `peerDependencies`. The browser bundle (`lib/client.cjs`) is a CJS module-loader factory: it `require()`s only the client module table's platform packages and inlines the plugin's own card code, so it needs no extra install-time resolution. `@deepseek-ai/dsh-base` is a devDependency only, so the smoke test can resolve the harness runtime closure.

## License

MIT