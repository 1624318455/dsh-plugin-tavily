# dsh-plugin-tavily

[English](README.md) | 中文

基于 [Tavily](https://tavily.com) 的 **web 搜索提供方插件**，用于 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness)。它把 `tavily` 搜索提供方注册进 harness 的 `ctx.web` seam，让内置的 `web_search` 工具通过 Tavily 联网搜索。

## 安装

```sh
dsh plugin --profile web add "github:<你的用户名>/dsh-plugin-tavily#main"
```

开发期间可用本地路径安装：

```sh
dsh plugin --profile web add "file:/绝对路径/dsh-plugin-tavily"
```

插件**只注册提供方**，不会覆盖 profile 已选的搜索提供方。

## 启用

1. **设置 Tavily API key**（必需）：

   ```sh
   export TAVILY_API_KEY=tvly-...
   ```

2. **选择提供方**。二选一：设置环境变量

   ```sh
   export DSH_WEB_SEARCH_PROVIDER=tavily
   ```

   或在 profile 的 `cordis.patch.yml`（`~/.dsh/profiles/web/cordis.patch.yml`）中加一行：

   ```yaml
   - id: web
     config:
       searchProvider: tavily
   ```

3. 启动 dsh，照常使用 `web_search`。面向模型的工具不变，只有背后的搜索后端换成 Tavily。

## 插件配置

配置可从后续 patch 层的插件行读取（或留空使用环境变量默认值）：

| 配置键 | 默认值 | 含义 |
|---|---|---|
| `apiKey` | `$TAVILY_API_KEY` | Tavily API 密钥；为空则提供方不可用 |
| `baseURL` | `https://api.tavily.com` | 端点基址，追加 `/search` |
| `searchDepth` | `basic` | Tavily `search_depth`：`basic`（更快更省）或 `advanced` |
| `topic` | `general` | Tavily `topic`：`general`、`news` 或 `finance` |
| `days` | （未设） | 时效窗口（天数），用于 news/finance 主题 |
| `includeAnswer` | `true` | 请求 Tavily 生成式答案，作为结果 `content` |
| `numResults` | （未设） | 请求不含 `maxResults` 时的默认结果数 |

```yaml
- id: web-search-tavily
  name: '@dsh-external/dsh-plugin-tavily'
  config:
    searchDepth: advanced
    topic: news
```

## 映射

Tavily 的扁平 `results[]` 映射为规范化的 `WebSearchSource`：`url` ← `url`、`title` ← `title`、`snippet` ← 非空 `content`（无内容的条目被丢弃）、`publishedAt` ← `published_date`（news/finance 主题）。Tavily 生成式 `answer`（`includeAnswer` 开启时）成为结果 `content`。请求的 `maxResults` 优先于 `numResults`，作为 Tavily `max_results` 发送；最终上限由 seam 强制执行。失败以 seam 的 `WebError` 呈现（`WEB_PROVIDER_ERROR` / `WEB_ABORTED`）。

## 开发

```sh
pnpm install
pnpm run build          # tsdown → lib/index.mjs（提交入库）
pnpm test               # 真实 API 冒烟：需要 TAVILY_API_KEY
```

`lib/` 提交入库，插件安装时无需构建步骤（无 `prepare` 脚本，不需要 pnpm 构建脚本白名单）。`@deepseek-ai/*` 的 seam 与框架包**外部化** —— 由 harness 在运行时提供，声明为 `peerDependencies`。`@deepseek-ai/dsh-base` 只是 devDependency，供冒烟测试解析 harness 运行时闭包。

## 许可证

MIT
