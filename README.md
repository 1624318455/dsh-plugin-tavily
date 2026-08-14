# dsh-plugin-tavily

English | [中文](README.zh.md)

A [Tavily](https://tavily.com)-backed **web search provider plugin** for [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness). It registers a `tavily` search provider into the harness's `ctx.web` seam, so the built-in `web_search` tool can search the web through Tavily.

## Install

```sh
dsh plugin --profile web add "github:<your-name>/dsh-plugin-tavily#main"
```

During development, install from a local path instead:

```sh
dsh plugin --profile web add "file:/absolute/path/to/dsh-plugin-tavily"
```

The plugin registers the provider only — it does **not** override your profile's chosen search provider.

## Enable

1. **Set the Tavily API key** (required):

   ```sh
   export TAVILY_API_KEY=tvly-...
   ```

2. **Select the provider.** Either set the environment variable:

   ```sh
   export DSH_WEB_SEARCH_PROVIDER=tavily
   ```

   or add a row to your profile's `cordis.patch.yml` (`~/.dsh/profiles/web/cordis.patch.yml`):

   ```yaml
   - id: web
     config:
       searchProvider: tavily
   ```

3. Start dsh and use `web_search` as usual. The model-facing tool is unchanged; only the backend that answers it is now Tavily.

## Plugin config

Configuration is read from the plugin row you can add to a later patch layer (or left to env-var defaults):

| Key | Default | Meaning |
|---|---|---|
| `apiKey` | `$TAVILY_API_KEY` | Tavily API key; empty makes the provider unavailable |
| `baseURL` | `https://api.tavily.com` | endpoint base, `/search` appended |
| `searchDepth` | `basic` | Tavily `search_depth`: `basic` (faster, cheaper) or `advanced` |
| `topic` | `general` | Tavily `topic`: `general`, `news`, or `finance` |
| `days` | unset | recency window in days (news/finance topics) |
| `includeAnswer` | `true` | request Tavily's generated answer, carried as the result `content` |
| `numResults` | unset | default result count when a request omits `maxResults` |

```yaml
- id: web-search-tavily
  name: '@dsh-external/dsh-plugin-tavily'
  config:
    searchDepth: advanced
    topic: news
```

## Mapping

Tavily's flat `results[]` maps to normalized `WebSearchSource`s: `url` ← `url`, `title` ← `title`, `snippet` ← the non-blank `content` (entries without content are dropped), `publishedAt` ← `published_date` (news/finance topics). Tavily's generated `answer` (when `includeAnswer`) becomes the result `content`. A request's `maxResults` wins over `numResults` and is sent as Tavily's `max_results`; the seam enforces the final bound. Failures surface as the seam's `WebError` (`WEB_PROVIDER_ERROR` / `WEB_ABORTED`).

## Development

```sh
pnpm install
pnpm run build          # tsdown → lib/index.mjs (committed)
pnpm test               # real-API smoke: needs TAVILY_API_KEY
```

`lib/` is committed so the plugin installs without a build step (no `prepare` script, no pnpm build-script allowlisting). The `@deepseek-ai/*` seam and framework packages are **externalized** — the harness provides them at runtime, declared as `peerDependencies`. `@deepseek-ai/dsh-base` is a devDependency only, so the smoke test can resolve the harness runtime closure.

## License

MIT
