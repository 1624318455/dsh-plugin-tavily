# dsh-plugin-tavily

[English](README.md) | 中文

基于 [Tavily](https://tavily.com) 的 **web 搜索提供方插件**，用于 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness)。

它把 `tavily` 搜索提供方注册进 harness 的 `ctx.web` seam，让内置的 `web_search` 工具通过 Tavily 联网搜索；同时提供一张 **设置卡片**（`设置 → 插件 → 网页搜索`），在图形界面里粘贴 API Key。一次安装，两个半部。

## 功能

- **即插即用的搜索后端**：选中 `tavily` 后，内置 `web_search` 工具（以及 agent 自身的搜索）都由 Tavily 应答——面向模型的接口不变。
- **GUI 设置卡片**：在 `设置 → 插件 → 网页搜索` 编辑 API Key、默认结果数量与时效窗口；密钥经凭据服务写入，绝不进入配置文件。
- **其余设置走配置文件**：接口地址、搜索深度、主题、生成式回答、凭据引用都在 `cordis.patch.yml` 中配置，卡片永远不会覆盖它们。
- **凭据优先的密钥解析**：每次搜索按 字面量 `apiKey` → 凭据服务（`apiKeyEnv`）→ `process.env[apiKeyEnv]` 的顺序解析。

## 安装

```sh
dsh plugin --profile web add "github:1624318455/dsh-plugin-tavily#main"
```

开发期间可用本地路径安装：

```sh
dsh plugin --profile web add "file:/绝对路径/dsh-plugin-tavily"
```

插件**只注册提供方和设置卡片**，不会覆盖 profile 已选的搜索提供方。

## 启用

1. **选择提供方**。二选一：设置环境变量

   ```sh
   export DSH_WEB_SEARCH_PROVIDER=tavily
   ```

   或在 profile 的 `cordis.patch.yml`（`~/.dsh/profiles/web/cordis.patch.yml`）中加一行：

   ```yaml
   - id: web
     config:
       searchProvider: tavily
   ```

2. **设置 Tavily API key**。打开 `设置 → 插件 → 网页搜索`，展开 **网页搜索（Tavily）** 卡片，把密钥粘贴进 **API Key** 输入框。卡片会显示是否已配置。没有密钥时提供方自报不可用，搜索会以 `WEB_PROVIDER_CREDENTIAL_MISSING` 明确失败，而不是静默返回空结果。

3. **重启 dsh**，照常使用 `web_search`。面向模型的工具不变，只有背后的搜索后端换成 Tavily。

### 验证后端确实是 Tavily

`web_search` 工具的输出 schema 与提供方无关 —— 模型看不到提供方名称，且 API key 刻意存放在环境变量之外，所以"查环境变量"是错误探测方式。要确认当前后端：

- **提供方选择** —— `~/.dsh/profiles/web/cordis.patch.yml` 中有 `web` 行且 `searchProvider: tavily`。
- **插件已加载** —— `~/.dsh/settings.yaml` 含 `web-search-tavily` 配置节（只有插件的 `installSettingsSection` 会写入它）。
- **凭据在位** —— `TAVILY_API_KEY` 存在于凭据存储（`~/.dsh/.credentials.yaml`），不在环境变量中。
- **结果特征** —— Tavily 结果在 `content` 中携带生成式 answer 摘要；内置 DeepSeek provider 不产生该字段。

## 插件配置

GUI 卡片只编辑你最常改的三个值：**API Key**、**默认结果数量**（`numResults`）和**时效窗口**（`days`）。其余配置键一律写在 profile 配置里，卡片上不渲染：

| 配置键 | 默认值 | 含义 | GUI 可编辑 |
|---|---|---|---|
| `apiKey` | （未设） | Tavily API 密钥字面量；建议用 `apiKeyEnv`，避免密钥进入配置文件 | 密钥输入框（走凭据） |
| `apiKeyEnv` | `TAVILY_API_KEY` | 凭据引用（环境变量名），每次搜索时解析；卡片中的 API Key 输入框写入该引用 | 仅配置 |
| `baseURL` | `https://api.tavily.com` | 端点基址，追加 `/search` | 仅配置 |
| `searchDepth` | `basic` | Tavily `search_depth`：`basic`（更快更省）或 `advanced` | 仅配置 |
| `topic` | `general` | Tavily `topic`：`general`、`news` 或 `finance` | 仅配置 |
| `days` | （未设） | 时效窗口（天数），用于 news/finance 主题 | ✓ |
| `includeAnswer` | `true` | 请求 Tavily 生成式答案，作为结果 `content` | 仅配置 |
| `numResults` | （未设） | 请求不含 `maxResults` 时的默认结果数 | ✓ |

配置文件即 profile 的 `cordis.patch.yml`（`~/.dsh/profiles/web/cordis.patch.yml`）。在 `web-search-tavily` 行加一个 `config` 块即可设置上表任意键：

```yaml
- id: web-search-tavily
  name: '@dsh-external/dsh-plugin-tavily'
  config:
    searchDepth: advanced
    topic: news
```

卡片自身的保存叠加在该文件之上：卡片不渲染的字段绝不会被它写入，你在配置文件里设的值会一直保持权威。（GUI 保存的值落在 `~/.dsh/settings.yaml` 的 `web-search-tavily` 段；三个卡片字段请用 GUI 编辑。）

设置改动即时生效 —— 提供方每次操作都会重读配置段，无论是从卡片还是文件改值，都无需重启或重新注册。

## 平台说明（Web GUI 卡片可见性）

Web GUI 只有在 apiproxy 白名单（`@deepseek-ai/dsh-host-apiproxy` 的 `WEB_SETTINGS_NAMESPACES`）内的设置段才会下发给浏览器。截至 `0.1.0-rc.6`，该列表为硬编码，且"让插件自行暴露其配置"的机制尚未落地，因此第三方插件的卡片即使宿主侧已注册也会被过滤。要让 **网页搜索（Tavily）** 卡片渲染出来，请在已安装副本的白名单数组中加入该命名空间并重启 dsh：

```js
// ~/.dsh/profiles/node_modules/@deepseek-ai/dsh-host-apiproxy/lib/index.js
// 在 WEB_SETTINGS_NAMESPACES 数组中加入：
"web-search-deepseek",
"web-search-tavily",   // ← 添加这一行
```

提供方及全部功能无需此补丁即可工作，只是 GUI 卡片被隐藏。`pnpm install --force` 与 harness 升级都会覆盖此补丁，重装依赖后需重新应用。

## 映射

Tavily 的扁平 `results[]` 映射为规范化的 `WebSearchSource`：`url` ← `url`、`title` ← `title`、`snippet` ← 非空 `content`（无内容的条目被丢弃）、`publishedAt` ← `published_date`（news/finance 主题）。Tavily 生成式 `answer`（`includeAnswer` 开启时）成为结果 `content`。请求的 `maxResults` 优先于 `numResults`，作为 Tavily `max_results` 发送；最终上限由 seam 强制执行。失败以 seam 的 `WebError` 呈现（`WEB_PROVIDER_ERROR` / `WEB_ABORTED`）。

## 开发

```sh
pnpm install
pnpm run build          # tsdown → lib/index.mjs（宿主端）+ lib/client.js（浏览器端，均提交入库）
pnpm run typecheck      # tsc --noEmit
pnpm test               # 真实 API 冒烟：需要 TAVILY_API_KEY
```

`lib/` 提交入库，插件安装时无需构建步骤（无 `prepare` 脚本，不需要 pnpm 构建脚本白名单）。`@deepseek-ai/*` 的 seam 与框架包**外部化** —— 由 harness 在运行时提供，声明为 `peerDependencies`。浏览器 bundle（`lib/client.js`）是 CJS 模块加载器工厂：只 `require()` 客户端模块表中的平台包，插件自身卡片代码内联其中，安装时无需额外解析。`@deepseek-ai/dsh-base` 只是 devDependency，供冒烟测试解析 harness 运行时闭包。

## 许可证

MIT
