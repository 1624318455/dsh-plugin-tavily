# dsh-plugin-tavily

[English](README.md) | 中文

基于 [Tavily](https://tavily.com) 的 **web 搜索提供方插件**，用于 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness)。定位是**面向进阶用户的专业版 Tavily 搜索插件**：完整暴露 Tavily 请求参数，支持 WebUI 可视化调参与配置文件双模式。

它把 `tavily` 搜索提供方注册进 harness 的 `ctx.web` seam，让内置的 `web_search` 工具通过 Tavily 联网搜索；同时提供一张 **设置卡片**（`设置 → 插件 → 网页搜索`），在图形界面里粘贴 API Key、调节高级参数并测试连接。一次安装，两个半部。

## 功能

- **即插即用的搜索后端**：选中 `tavily` 后，内置 `web_search` 工具（以及 agent 自身的搜索）都由 Tavily 应答——面向模型的接口不变。
- **GUI 完整专业参数**：API Key、API Base URL、`maxResults`、`searchDepth`、`topic`、`includeAnswer`、`includeRawContent`、`timeout`、`searchMode`、`days` 全部可在卡片编辑；高级参数收进默认折叠的 `<details>` 面板，普通用户不会被大量选项吓到。
- **配置文件优先**：`cordis.patch.yml` > WebUI > 代码默认值。yaml 显式设置的字段在卡片上置灰并显示「该参数已被配置文件覆盖」，WebUI 无法覆盖。
- **API 连通测试**：基础设置区提供独立「测试API连接」按钮，直接用当前填写的 key/baseUrl 发起轻量搜索并展示成功/报错信息。已保存的密钥因安全设计无法被浏览器读回，测试已配置密钥时需要重新输入一次（不会重复保存）。
- **搜索模式**：可在高级面板选择 `tavily-only`（直接走 Tavily，跳过 DeepSeek）或 `deepseek-first`（先 DeepSeek 后 Tavily，综合结果）。
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

## 🖥️ 图形界面使用（推荐普通用户）

打开 `设置 → 插件 → 网页搜索`，展开 **网页搜索（Tavily）** 卡片。

- **基础设置（默认展开）**：
  - **API Key** —— 粘贴你的 Tavily 密钥。密钥经凭据服务写入，绝不进入设置文件。
  - **API Base URL** —— 留空使用 `https://api.tavily.com`；可填代理/自定义接口地址。
  - **搜索模式** —— `tavily-only`（默认）：直接走 Tavily，不查询 DeepSeek；`deepseek-first`：先走 DeepSeek，再合并 Tavily 结果。两种模式都需要在 web 配置中选择 `searchProvider: tavily`。
  - **测试API连接** —— 验证当前输入的 key/baseUrl；测试会消耗一次 Tavily 搜索额度。如果已配置密钥但输入框为空，会提示重新输入一次（浏览器无法读取已保存的密钥）。
- **高级搜索参数（`🔧 高级 Tavily 请求参数`，默认收起）**：
  - **最大结果数** —— 单次搜索返回网页结果数量（1–20，默认 5）。
  - **搜索深度** —— `basic`（快速省 token）或 `advanced`（深度检索，更耗 token）。
  - **搜索主题** —— `general`、`news` 或 `finance`。
  - **生成摘要答案** —— 默认开启；让 Tavily 直接返回摘要。
  - **返回网页原始内容** —— 默认关闭；开启会大幅增加上下文 token 消耗。
  - **请求超时（毫秒）** —— 默认 30000。
  - **时间窗口（天）** —— 可选，用于 news/finance 的时效过滤。

每个控件都有简短注释和默认值 placeholder。修改后点 **保存** 即时生效，无需重启服务。

> 如果某个字段显示「该参数已被配置文件覆盖，请修改 yaml」，说明它被 `cordis.patch.yml` 钉住，WebUI 故意不允许覆盖。

## ⚙️ 配置文件进阶用法（面向开发者）

配置文件即 profile 的 `cordis.patch.yml`（`~/.dsh/profiles/web/cordis.patch.yml`）。在 `web-search-tavily` 行加一个 `config` 块即可设置任意键：

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

### 优先级

```
cordis.patch.yml 配置  >  WebUI 面板保存值  >  代码内置默认值
```

- yaml `config` 中出现的字段，卡片对应控件会置灰并显示配置覆盖提示。
- yaml 未设置的字段，使用 WebUI 保存的值。
- 两者都没有时，使用代码内置默认值。

### 配置键一览

| 配置键 | 默认值 | 含义 | GUI 可编辑 |
|---|---|---|---|
| `apiKey` | （未设） | Tavily API 密钥字面量；建议用凭据服务 | 密钥输入框（走凭据） |
| `apiKeyEnv` | `TAVILY_API_KEY` | 凭据引用（环境变量名），每次搜索时解析 | 仅配置 |
| `baseURL` | `https://api.tavily.com` | 端点基址，追加 `/search` | ✓ |
| `maxResults` | `5` | 单次搜索默认结果数（1–20） | ✓ |
| `searchDepth` | `basic` | `basic`（快速）或 `advanced`（深度） | ✓ |
| `topic` | `general` | `general`、`news` 或 `finance` | ✓ |
| `includeAnswer` | `true` | 请求 Tavily 生成式答案 | ✓ |
| `includeRawContent` | `false` | 返回网页原始内容（耗上下文） | ✓ |
| `timeout` | `30000` | 请求超时（毫秒） | ✓ |
| `searchMode` | `tavily-only` | `tavily-only`（直接 Tavily）或 `deepseek-first`（DeepSeek + Tavily 综合） | ✓ |
| `days` | （未设） | 时效窗口（天），用于 news/finance | ✓ |
| `numResults` | `5` | **已废弃**：`maxResults` 的旧别名 | 否（请用 `maxResults`） |

`apiKeyEnv` 保持「仅配置」：它属于高级接线细节。GUI 保存的值落在 `~/.dsh/settings.yaml` 的 `web-search-tavily` 段。设置改动即时生效 —— 提供方每次操作都会重读配置段，无需重启或重新注册。

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

Tavily 的扁平 `results[]` 映射为规范化的 `WebSearchSource`：`url` ← `url`、`title` ← `title`、`snippet` ← 非空 `content`（无内容的条目被丢弃）、`publishedAt` ← `published_date`（news/finance 主题）。Tavily 生成式 `answer`（`includeAnswer` 开启时）成为结果 `content`。请求的 `maxResults` 优先于配置默认值，作为 Tavily `max_results` 发送；`includeRawContent` 作为 `include_raw_content` 发送；最终上限由 seam 强制执行。失败以 seam 的 `WebError` 呈现（`WEB_PROVIDER_ERROR` / `WEB_ABORTED`）；请求超时报为 `WEB_PROVIDER_ERROR`。

## 开发

```sh
pnpm install
pnpm run build          # tsdown → lib/index.mjs（宿主端）+ lib/client.cjs（浏览器端，均提交入库）
pnpm run typecheck      # tsc --noEmit
node tests/decode-check.mjs   # schema 往返校验（不需联网）
pnpm test               # 真实 API 冒烟：需要 TAVILY_API_KEY
```

`lib/` 提交入库，插件安装时无需构建步骤（无 `prepare` 脚本，不需要 pnpm 构建脚本白名单）。`@deepseek-ai/*` 的 seam 与框架包**外部化** —— 由 harness 在运行时提供，声明为 `peerDependencies`。浏览器 bundle（`lib/client.cjs`）是 CJS 模块加载器工厂：只 `require()` 客户端模块表中的平台包，插件自身卡片代码内联其中，安装时无需额外解析。`@deepseek-ai/dsh-base` 只是 devDependency，供冒烟测试解析 harness 运行时闭包。

## 许可证

MIT