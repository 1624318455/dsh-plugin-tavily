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
  | 'searchDepthBasic' | 'searchDepthAdvanced' | 'searchDepthFast' | 'searchDepthUltraFast'
  | 'topicGeneral' | 'topicNews' | 'topicFinance' | 'tavilyChunksPerSource' | 'tavilyChunksPerSourceHint'
  | 'tavilyTimeRange' | 'tavilyTimeRangeHint' | 'tavilyStartDate' | 'tavilyStartDateHint'
  | 'tavilyEndDate' | 'tavilyEndDateHint' | 'tavilyIncludeImages' | 'tavilyIncludeImagesHint'
  | 'tavilyIncludeImageDescriptions' | 'tavilyIncludeImageDescriptionsHint' | 'tavilyIncludeFavicon' | 'tavilyIncludeFaviconHint'
  | 'tavilyIncludeDomains' | 'tavilyIncludeDomainsHint' | 'tavilyExcludeDomains' | 'tavilyExcludeDomainsHint'
  | 'tavilyCountry' | 'tavilyCountryHint'
  | 'includeAnswerRecommended' | 'includeAnswerTrue' | 'includeAnswerAdvanced' | 'includeAnswerFalse'
  | 'rawContentFalse' | 'rawContentMarkdown' | 'rawContentText'
  | 'testApi' | 'testingApi' | 'testApiHint' | 'testApiNeedKey' | 'testApiKeyConfiguredNeedReentry' | 'testApiSuccess' | 'testApiFailed'
  | 'overridden' | 'configCovered' | 'reset' | 'readOnly' | 'expand' | 'collapse'
  | 'save' | 'saving' | 'discard' | 'unsaved' | 'saveFailed' | 'invalidNumber' | 'invalidList'

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
  tavilySearchDepthHint: 'basic is balanced; advanced performs deeper retrieval; fast/ultra-fast prioritize latency.',
  tavilyTopic: 'Topic',
  tavilyTopicHint: 'general is the whole web; news prioritizes recency; finance targets market content.',
  tavilyIncludeAnswer: 'Generated answer',
  tavilyIncludeAnswerHint: 'Ask Tavily to generate an answer returned to the agent: quick (true/basic) or detailed (advanced).',
  tavilyIncludeRawContent: 'Raw page content',
  tavilyIncludeRawContentHint: 'Include cleaned page content in each result; format markdown/text. Greatly increases context token usage.',
  tavilyTimeout: 'Request timeout (ms)',
  tavilyTimeoutHint: 'Milliseconds before a search request is abandoned; blank uses 30000.',
  tavilyDays: 'Recency window (days)',
  tavilyDaysHint: 'Only results from the last N days; leave blank to disable.',
  tavilySearchMode: 'Search mode',
  tavilySearchModeHint: 'tavily-only: direct Tavily (DeepSeek is not consulted). deepseek-first: run DeepSeek first, merge its results with Tavily; requires the web config to select searchProvider: tavily.',
  searchModeTavilyOnly: 'Tavily only (skip DeepSeek)',
  searchModeDeepseekFirst: 'DeepSeek first, then Tavily (combined)',
  advancedTitle: '🔧 Advanced Tavily request parameters',
  searchDepthBasic: 'basic (balanced)',
  searchDepthAdvanced: 'advanced (deep, 2 credits)',
  searchDepthFast: 'fast (1 credit)',
  searchDepthUltraFast: 'ultra-fast (1 credit, lowest latency)',
  topicGeneral: 'general',
  topicNews: 'news',
  topicFinance: 'finance',
  tavilyChunksPerSource: 'Chunks per source',
  tavilyChunksPerSourceHint: 'Snippet chunks per source (1–3); larger is richer but uses more tokens.',
  tavilyTimeRange: 'Time range',
  tavilyTimeRangeHint: 'Recency preset (news/finance topics); e.g. day, week, month, year.',
  tavilyStartDate: 'Start date',
  tavilyStartDateHint: 'Include only results published/updated after this date (YYYY-MM-DD).',
  tavilyEndDate: 'End date',
  tavilyEndDateHint: 'Include only results published/updated before this date (YYYY-MM-DD).',
  tavilyIncludeImages: 'Include images',
  tavilyIncludeImagesHint: 'Collect query-related and per-source images. Note: the current seam does not yet surface images in results.',
  tavilyIncludeImageDescriptions: 'Image descriptions',
  tavilyIncludeImageDescriptionsHint: 'With “Include images”, add a description per image.',
  tavilyIncludeFavicon: 'Include favicon',
  tavilyIncludeFaviconHint: 'Request the favicon URL per result. Note: the current seam does not yet surface favicons in results.',
  tavilyIncludeDomains: 'Include domains',
  tavilyIncludeDomainsHint: 'Only these domains (comma/space separated), e.g. example.com, docs.example.org.',
  tavilyExcludeDomains: 'Exclude domains',
  tavilyExcludeDomainsHint: 'Skip these domains (comma/space separated), e.g. spam.com.',
  tavilyCountry: 'Country boost',
  tavilyCountryHint: 'Boost results from one country (general topic), e.g. japan, united-states.',
  includeAnswerRecommended: 'true (quick)',
  includeAnswerTrue: 'true (quick)',
  includeAnswerAdvanced: 'advanced (detailed)',
  includeAnswerFalse: 'false (none)',
  rawContentFalse: 'false (off)',
  rawContentMarkdown: 'true / markdown',
  rawContentText: 'text',
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
  invalidList: 'One or more values are not accepted; separate entries with commas or spaces.',
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
  tavilySearchDepthHint: 'basic 均衡；advanced 深度检索；fast/ultra-fast 更低延迟。',
  tavilyTopic: '搜索主题',
  tavilyTopicHint: 'general 通用搜索；news 新闻时效；finance 财经内容。',
  tavilyIncludeAnswer: '生成摘要答案',
  tavilyIncludeAnswerHint: '让 Tavily 直接生成摘要答案返回给 Agent：快速（true/basic）或详细（advanced）。',
  tavilyIncludeRawContent: '返回网页原始内容',
  tavilyIncludeRawContentHint: '返回网页清洗后的内容，格式 markdown/text；开启会大幅增加上下文 token 消耗。',
  tavilyTimeout: '请求超时（毫秒）',
  tavilyTimeoutHint: '搜索请求超时毫秒数；留空使用 30000。',
  tavilyDays: '时间窗口（天）',
  tavilyDaysHint: '只返回最近 N 天的结果；留空表示不限制。',
  tavilySearchMode: '搜索模式',
  tavilySearchModeHint: 'tavily-only：直接走 Tavily，不查询 DeepSeek；deepseek-first：先走 DeepSeek，再合并 Tavily 结果。两种模式都需在 web 配置中选择 searchProvider: tavily。',
  searchModeTavilyOnly: '直接使用 Tavily（跳过 DeepSeek）',
  searchModeDeepseekFirst: '先 DeepSeek，再 Tavily（综合结果）',
  advancedTitle: '🔧 高级 Tavily 请求参数',
  searchDepthBasic: 'basic（均衡）',
  searchDepthAdvanced: 'advanced（深度，2 积分）',
  searchDepthFast: 'fast（1 积分）',
  searchDepthUltraFast: 'ultra-fast（1 积分，最低延迟）',
  topicGeneral: 'general',
  topicNews: 'news',
  topicFinance: 'finance',
  tavilyChunksPerSource: '每个来源的片段数',
  tavilyChunksPerSourceHint: '每个来源返回的相关片段数（1–3）；越大越丰富但更耗 token。',
  tavilyTimeRange: '时间范围',
  tavilyTimeRangeHint: '时效预设（news/finance 主题），如 day、week、month、year。',
  tavilyStartDate: '开始日期',
  tavilyStartDateHint: '只返回该日期（YYYY-MM-DD）之后发布/更新的结果。',
  tavilyEndDate: '结束日期',
  tavilyEndDateHint: '只返回该日期（YYYY-MM-DD）之前发布/更新的结果。',
  tavilyIncludeImages: '包含图片',
  tavilyIncludeImagesHint: '收集与查询相关及每个来源的图片。注：当前 seam 尚未在结果中暴露图片。',
  tavilyIncludeImageDescriptions: '图片描述',
  tavilyIncludeImageDescriptionsHint: '开启“包含图片”后，为每张图片附带描述。',
  tavilyIncludeFavicon: '包含网站图标',
  tavilyIncludeFaviconHint: '请求每个结果的 favicon URL。注：当前 seam 尚未在结果中暴露 favicon。',
  tavilyIncludeDomains: '包含域名',
  tavilyIncludeDomainsHint: '只返回这些域名（逗号/空格分隔），如 example.com, docs.example.org。',
  tavilyExcludeDomains: '排除域名',
  tavilyExcludeDomainsHint: '排除这些域名（逗号/空格分隔），如 spam.com。',
  tavilyCountry: '国家加权',
  tavilyCountryHint: '偏向某一国家的结果（general 主题），如 japan、united-states。',
  includeAnswerRecommended: 'true（快速）',
  includeAnswerTrue: 'true（快速）',
  includeAnswerAdvanced: 'advanced（详细）',
  includeAnswerFalse: 'false（不生成）',
  rawContentFalse: 'false（关闭）',
  rawContentMarkdown: 'true / markdown',
  rawContentText: 'text',
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
  invalidList: '存在无法接受的项；请用逗号或空格分隔各条目。',
}