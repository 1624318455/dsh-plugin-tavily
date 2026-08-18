# dsh-plugin-tavily

English | [中文](README.zh.md)

A [Tavily](https://tavily.com)-backed **web search provider plugin** for [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness). It is the **professional/pro-user edition**: it exposes the full Tavily request parameter set through the web GUI, while still letting developers pin values from the profile configuration file.

It registers a `tavily` search provider into the harness's `ctx.web` seam, so the built-in `web_search` tool searches the web through Tavily — and ships a **settings card** in the web GUI (`设置 → 插件 → 网页搜索`) where you paste your API key, tune advanced parameters, and test connectivity. One install, both halves.

## Features

- **Drop-in search backend**: select `tavily` and the built-in `web_search` tool (plus the agent's own search) is answered by Tavily — no model-facing changes.
- **Full professional parameter set in the GUI**: API key, API Base URL, `maxResults`, `searchDepth`, `topic`, `includeAnswer`, `includeRawContent`, `timeout`, `searchMode`, and `days` are editable from the card; advanced fields are tucked into a collapsed `<details>` block so ordinary users are not overwhelmed.
- **Configuration-first priority**: `cordis.patch.yml` > WebUI > code defaults. Any field explicitly set in the yaml is shown disabled on the card with a "covered by config file" badge, so a stale UI value can never shadow a developer's pinned config.
- **API connectivity test**: a lightweight `Test API connection` button checks the currently entered key/base URL directly from the browser and reports success or the API error. Stored keys cannot be read back by the browser by design, so testing an already-configured key requires re-entering it once (it is not saved again).
- **Search mode**: choose `tavily-only` (direct Tavily, skip DeepSeek) or `deepseek-first` (run DeepSeek first, then merge Tavily results) from the advanced panel.
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

1. **Select the provider.** Either set the environment variable:

   ```sh
   export DSH_WEB_SEARCH_PROVIDER=tavily
   ```

   or add a row to your profile's `cordis.patch.yml` (`~/.dsh/profiles/web/cordis.patch.yml`):

   ```yaml
   - id: web
     config:
       searchProvider: tavily
   ```

2. **Set the Tavily API key.** Open `设置 → 插件 → 网页搜索`, expand the **Web search (Tavily)** card, and paste the key into the **API key** field. The card shows whether a key is configured. Without a key the provider reports itself unavailable, so searches fail loudly with `WEB_PROVIDER_CREDENTIAL_MISSING` instead of silently returning nothing.

3. **Restart dsh** and use `web_search` as usual. The model-facing tool is unchanged; only the backend answering it is now Tavily.

### Verify the backend is really Tavily

The `web_search` tool's output schema is provider-agnostic — the model never sees a provider name, and the API key intentionally lives outside environment variables, so "check the env" is the wrong probe. To confirm the active backend:

- **Provider selection** — `~/.dsh/profiles/web/cordis.patch.yml` has the `web` row with `searchProvider: tavily`.
- **Plugin loaded** — `~/.dsh/settings.yaml` contains a `web-search-tavily` section (only the plugin's `installSettingsSection` writes it).
- **Credential in place** — `TAVILY_API_KEY` exists in the credentials store (`~/.dsh/.credentials.yaml`), not in the environment.
- **Result fingerprint** — a Tavily result carries a generated-answer summary in `content`; the built-in DeepSeek provider does not produce one.

## 🖥️ GUI usage (recommended for most users)

Open `设置 → 插件 → 网页搜索` and expand the **Web search (Tavily)** card.

- **Basic area (always visible)**:
  - **API key** — paste your Tavily key. It is stored through the credentials service, never in a settings file.
  - **API Base URL** — leave blank for `https://api.tavily.com`, or set a proxy/endpoint base.
  - **Test API connection** — verifies the key/base URL you just entered. Testing consumes one Tavily search credit. If a key is already configured but you have not typed one, the card tells you to re-enter it once; the browser intentionally cannot read stored secrets back.
- **Advanced area (`🔧 Advanced Tavily request parameters`)**:
  - **Search mode** — `tavily-only` (default): direct Tavily, DeepSeek is not consulted; `deepseek-first`: run DeepSeek search first, then merge its results with Tavily. Both modes require the web config to select `searchProvider: tavily`.
  - **Max results** — how many web results per search (1–20, default 5).
  - **Search depth** — `basic` (fast/cheap) or `advanced` (deeper, more tokens).
  - **Topic** — `general`, `news`, or `finance`.
  - **Include generated answer** — default on; Tavily returns a direct answer summary.
  - **Include raw page content** — default off; enabling greatly increases context token usage.
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
    searchMode: deepseek-first
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
| `searchDepth` | `basic` | `basic` (fast) or `advanced` (deep) | ✓ |
| `topic` | `general` | `general`, `news`, or `finance` | ✓ |
| `includeAnswer` | `true` | request Tavily's generated answer | ✓ |
| `includeRawContent` | `false` | raw page content in results (context-heavy) | ✓ |
| `timeout` | `30000` | request timeout in milliseconds | ✓ |
| `searchMode` | `tavily-only` | `tavily-only` (direct Tavily) or `deepseek-first` (DeepSeek + Tavily combined) | ✓ |
| `days` | unset | recency window in days (news/finance topics) | ✓ |
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

## Mapping

Tavily's flat `results[]` maps to normalized `WebSearchSource`s: `url` ← `url`, `title` ← `title`, `snippet` ← the non-blank `content` (entries without content are dropped), `publishedAt` ← `published_date` (news/finance topics). Tavily's generated `answer` (when `includeAnswer`) becomes the result `content`. A request's `maxResults` wins over the configured default and is sent as Tavily's `max_results`; the seam enforces the final bound. `includeRawContent` is sent as Tavily's `include_raw_content`. Failures surface as the seam's `WebError` (`WEB_PROVIDER_ERROR` / `WEB_ABORTED`); request timeouts are reported as `WEB_PROVIDER_ERROR`.

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