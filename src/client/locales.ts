/** Locale bundles for the Tavily plugin card. */

/**
 * Locale keys the Tavily card renders. The namespace is merged into the
 * framework's {@link LocaleNamespaceMap} below so the renderer's typed `t`
 * seat accepts exactly these keys (plus the shared common vocabulary).
 */
export type TavilyCardLocaleKey =
  | 'tavilyTitle' | 'tavilyDescription'
  | 'tavilyApiKey' | 'tavilyApiKeyHint' | 'tavilyApiKeySet' | 'tavilyApiKeyUnset'
  | 'tavilyBaseUrl' | 'tavilyBaseUrlHint'
  | 'tavilyMaxResults' | 'tavilyMaxResultsHint'
  | 'tavilySearchDepth' | 'tavilySearchDepthHint'
  | 'tavilyTopic' | 'tavilyTopicHint'
  | 'tavilyIncludeAnswer' | 'tavilyIncludeAnswerHint'
  | 'tavilyIncludeRawContent' | 'tavilyIncludeRawContentHint'
  | 'tavilyTimeout' | 'tavilyTimeoutHint'
  | 'tavilyDays' | 'tavilyDaysHint'
  | 'tavilySearchMode' | 'tavilySearchModeHint'
  | 'searchModeTavilyOnly' | 'searchModeDeepseekFirst'
  | 'advancedTitle'
  | 'searchDepthBasic' | 'searchDepthAdvanced'
  | 'topicGeneral' | 'topicNews' | 'topicFinance'
  | 'testApi' | 'testingApi' | 'testApiHint' | 'testApiNeedKey' | 'testApiKeyConfiguredNeedReentry' | 'testApiSuccess' | 'testApiFailed'
  | 'overridden' | 'configCovered' | 'reset' | 'readOnly' | 'expand' | 'collapse'
  | 'save' | 'saving' | 'discard' | 'unsaved' | 'saveFailed' | 'invalidNumber'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Tavily plugin card copy (the `web-search-tavily` settings namespace). */
    'settings.plugins.tavily': TavilyCardLocaleKey
  }
}

/** English copy. */
export const en: Record<TavilyCardLocaleKey, string> = {
  tavilyTitle: 'Web search (Tavily)',
  tavilyDescription: 'The Tavily search provider.',
  tavilyApiKey: 'API key',
  tavilyApiKeyHint: 'Stored outside the settings file. Leave blank to keep the current key.',
  tavilyApiKeySet: 'A key is configured.',
  tavilyApiKeyUnset: 'No key is configured; search is unavailable until one is.',
  tavilyBaseUrl: 'API Base URL',
  tavilyBaseUrlHint: 'Custom proxy/endpoint base; leave blank for https://api.tavily.com.',
  tavilyMaxResults: 'Max results',
  tavilyMaxResultsHint: 'Number of web results per search (1–20); blank uses 5.',
  tavilySearchDepth: 'Search depth',
  tavilySearchDepthHint: 'basic is fast/cheap; advanced performs deeper retrieval and costs more tokens.',
  tavilyTopic: 'Topic',
  tavilyTopicHint: 'general is the whole web; news prioritizes recency; finance targets market content.',
  tavilyIncludeAnswer: 'Include generated answer',
  tavilyIncludeAnswerHint: 'Ask Tavily to generate a direct answer summary returned to the agent.',
  tavilyIncludeRawContent: 'Include raw page content',
  tavilyIncludeRawContentHint: 'Return each result’s raw HTML/content; greatly increases context token usage.',
  tavilyTimeout: 'Request timeout (ms)',
  tavilyTimeoutHint: 'Milliseconds before a search request is abandoned; blank uses 30000.',
  tavilyDays: 'Recency window (days)',
  tavilyDaysHint: 'Only results from the last N days; leave blank to disable.',
  tavilySearchMode: 'Search mode',
  tavilySearchModeHint: 'tavily-only: direct Tavily (DeepSeek is not consulted). deepseek-first: run DeepSeek first, merge its results with Tavily; requires the web config to select searchProvider: tavily.',
  searchModeTavilyOnly: 'Tavily only (skip DeepSeek)',
  searchModeDeepseekFirst: 'DeepSeek first, then Tavily (combined)',
  advancedTitle: '🔧 Advanced Tavily request parameters',
  searchDepthBasic: 'basic (fast)',
  searchDepthAdvanced: 'advanced (deep)',
  topicGeneral: 'general',
  topicNews: 'news',
  topicFinance: 'finance',
  testApi: 'Test API connection',
  testingApi: 'Testing…',
  testApiHint: 'Testing consumes one Tavily search credit.',
  testApiNeedKey: 'Enter an API key in the field above to test.',
  testApiKeyConfiguredNeedReentry: 'A key is configured, but browsers cannot read stored secrets. Re-enter the key above once to test it (it will not be saved again).',
  testApiSuccess: 'Connection successful — Tavily accepted the request.',
  testApiFailed: 'Connection failed:',
  overridden: 'Overridden',
  configCovered: 'Covered by config file; edit the yaml to change.',
  reset: 'Reset to default',
  readOnly: 'This deployment stores settings read-only.',
  expand: 'Show settings',
  collapse: 'Hide settings',
  save: 'Save',
  saving: 'Saving…',
  discard: 'Discard',
  unsaved: 'Unsaved',
  saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  invalidNumber: 'Enter a valid number, or leave blank to use the default.',
}

/** Simplified Chinese copy. */
export const zh: Record<TavilyCardLocaleKey, string> = {
  tavilyTitle: '网页搜索（Tavily）',
  tavilyDescription: 'Tavily 搜索提供方。',
  tavilyApiKey: 'API Key',
  tavilyApiKeyHint: '不写入设置文件。留空表示保持当前密钥。',
  tavilyApiKeySet: '已配置密钥。',
  tavilyApiKeyUnset: '未配置密钥；配置之前搜索不可用。',
  tavilyBaseUrl: 'API Base URL',
  tavilyBaseUrlHint: '自定义代理/接口地址；留空使用 https://api.tavily.com。',
  tavilyMaxResults: '最大结果数',
  tavilyMaxResultsHint: '单次搜索返回的网页结果数量（1–20）；留空使用 5。',
  tavilySearchDepth: '搜索深度',
  tavilySearchDepthHint: 'basic 快速省 token；advanced 深度检索，消耗更多 token。',
  tavilyTopic: '搜索主题',
  tavilyTopicHint: 'general 通用搜索；news 新闻时效；finance 财经内容。',
  tavilyIncludeAnswer: '生成摘要答案',
  tavilyIncludeAnswerHint: '让 Tavily 直接生成摘要答案返回给 Agent。',
  tavilyIncludeRawContent: '返回网页原始内容',
  tavilyIncludeRawContentHint: '返回网页原始全文，开启会大幅增加上下文 token 消耗。',
  tavilyTimeout: '请求超时（毫秒）',
  tavilyTimeoutHint: '搜索请求超时毫秒数；留空使用 30000。',
  tavilyDays: '时间窗口（天）',
  tavilyDaysHint: '只返回最近 N 天的结果；留空表示不限制。',
  tavilySearchMode: '搜索模式',
  tavilySearchModeHint: 'tavily-only：直接走 Tavily，不查询 DeepSeek；deepseek-first：先走 DeepSeek，再合并 Tavily 结果。两种模式都需在 web 配置中选择 searchProvider: tavily。',
  searchModeTavilyOnly: '直接使用 Tavily（跳过 DeepSeek）',
  searchModeDeepseekFirst: '先 DeepSeek，再 Tavily（综合结果）',
  advancedTitle: '🔧 高级 Tavily 请求参数',
  searchDepthBasic: 'basic（快速）',
  searchDepthAdvanced: 'advanced（深度）',
  topicGeneral: 'general',
  topicNews: 'news',
  topicFinance: 'finance',
  testApi: '测试API连接',
  testingApi: '测试中…',
  testApiHint: '测试会消耗一次Tavily搜索额度。',
  testApiNeedKey: '请在上方输入 API Key 后再测试。',
  testApiKeyConfiguredNeedReentry: '已检测到配置了密钥，但浏览器出于安全设计无法读取已保存的密钥；请在上方重新输入一次密钥来完成测试（不会重复保存）。',
  testApiSuccess: '连接成功 —— Tavily 已接受请求。',
  testApiFailed: '连接失败：',
  overridden: '已覆盖',
  configCovered: '该参数已被配置文件覆盖，请修改 yaml。',
  reset: '恢复默认',
  readOnly: '本部署的设置为只读。',
  expand: '展开设置',
  collapse: '收起设置',
  save: '保存',
  saving: '保存中…',
  discard: '放弃修改',
  unsaved: '未保存',
  saveFailed: '本部署没有接受这些值，已保留供你修改。',
  invalidNumber: '请填有效数字；留空表示使用默认值。',
}