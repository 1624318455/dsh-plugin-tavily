# dsh-plugin-tavily

English | [中文](README.zh.md)

A [Tavily](https://tavily.com)-backed **web search provider plugin** for [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness).

It registers a `tavily` search provider into the harness's `ctx.web` seam, so the built-in `web_search` tool searches the web through Tavily — and ships a **settings card** in the web GUI (`设置 → 插件 → 网页搜索`) where you paste your API key. One install, both halves.

## Features

- **Drop-in search backend**: select `tavily` and the built-in `web_search` tool (plus the agent's own search) is answered by Tavily — no model-facing changes.
- **Settings card in the GUI**: edit the API key, the default result count, and the recency window from `设置 → 插件 → 网页搜索`; the key is written through the credentials service, never into a configuration file.
- **Config-file control for the rest**: endpoint, search depth, topic, generated answer, and the credential reference are set in `cordis.patch.yml` and are never overwritten by the card.
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

## Plugin config

The GUI card edits the three values you change most often — the **API key**, the **default result count** (`numResults`), and the **recency window** (`days`). Every other key is set from the profile configuration and is *not* rendered on the card:

| Key | Default | Meaning | GUI |
|---|---|---|---|
| `apiKey` | unset | literal Tavily API key; prefer `apiKeyEnv` so no secret enters configuration files | key field (via credentials) |
| `apiKeyEnv` | `TAVILY_API_KEY` | credential reference (environment key name) the provider resolves per search; the card's API-key field writes this reference | config only |
| `baseURL` | `https://api.tavily.com` | endpoint base, `/search` appended | config only |
| `searchDepth` | `basic` | Tavily `search_depth`: `basic` (faster, cheaper) or `advanced` | config only |
| `topic` | `general` | Tavily `topic`: `general`, `news`, or `finance` | config only |
| `days` | unset | recency window in days (news/finance topics) | ✓ |
| `includeAnswer` | `true` | request Tavily's generated answer, carried as the result `content` | config only |
| `numResults` | unset | default result count when a request omits `maxResults` | ✓ |

Configuration lives in your profile's `cordis.patch.yml` (`~/.dsh/profiles/web/cordis.patch.yml`). Add a `web-search-tavily` row with a `config` block to set any key above:

```yaml
- id: web-search-tavily
  name: '@dsh-external/dsh-plugin-tavily'
  config:
    searchDepth: advanced
    topic: news
```

The card's own saves are layered over this file: a field the card does not render is never written by it, so what you set here stays authoritative. (Values saved from the GUI land in `~/.dsh/settings.yaml`'s `web-search-tavily` section instead; the GUI is the intended editor for the three card fields.)

Settings edits apply live — the provider re-reads the section for every operation, so no restart or re-registration is needed after changing a value from the card or the file.

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

Tavily's flat `results[]` maps to normalized `WebSearchSource`s: `url` ← `url`, `title` ← `title`, `snippet` ← the non-blank `content` (entries without content are dropped), `publishedAt` ← `published_date` (news/finance topics). Tavily's generated `answer` (when `includeAnswer`) becomes the result `content`. A request's `maxResults` wins over `numResults` and is sent as Tavily's `max_results`; the seam enforces the final bound. Failures surface as the seam's `WebError` (`WEB_PROVIDER_ERROR` / `WEB_ABORTED`).

## Development

```sh
pnpm install
pnpm run build          # tsdown → lib/index.mjs (host) + lib/client.js (browser, committed)
pnpm run typecheck      # tsc --noEmit
pnpm test               # real-API smoke: needs TAVILY_API_KEY
```

`lib/` is committed so the plugin installs without a build step (no `prepare` script, no pnpm build-script allowlisting). The `@deepseek-ai/*` seam and framework packages are **externalized** — the harness provides them at runtime, declared as `peerDependencies`. The browser bundle (`lib/client.js`) is a CJS module-loader factory: it `require()`s only the client module table's platform packages and inlines the plugin's own card code, so it needs no extra install-time resolution. `@deepseek-ai/dsh-base` is a devDependency only, so the smoke test can resolve the harness runtime closure.

## License

MIT
