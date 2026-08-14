/** Locale bundles for the Tavily plugin card. */

/**
 * Locale keys the Tavily card renders. The namespace is merged into the
 * framework's {@link LocaleNamespaceMap} below so the renderer's typed `t`
 * seat accepts exactly these keys (plus the shared common vocabulary).
 */
export type TavilyCardLocaleKey =
  | 'tavilyTitle' | 'tavilyDescription'
  | 'tavilyApiKey' | 'tavilyApiKeyHint' | 'tavilyApiKeySet' | 'tavilyApiKeyUnset'
  | 'tavilyDays' | 'tavilyDaysHint'
  | 'tavilyNumResults' | 'tavilyNumResultsHint'
  | 'overridden' | 'reset' | 'readOnly' | 'expand' | 'collapse'
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
  tavilyDays: 'Recency window (days)',
  tavilyDaysHint: 'Only results from the last N days; leave blank to disable.',
  tavilyNumResults: 'Default result count',
  tavilyNumResultsHint: 'Used when a request carries no explicit limit; leave blank to omit.',
  overridden: 'Overridden',
  reset: 'Reset to default',
  readOnly: 'This deployment stores settings read-only.',
  expand: 'Show settings',
  collapse: 'Hide settings',
  save: 'Save',
  saving: 'Saving…',
  discard: 'Discard',
  unsaved: 'Unsaved',
  saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  invalidNumber: 'Enter a number, or leave blank to use the default.',
}

/** Simplified Chinese copy. */
export const zh: Record<TavilyCardLocaleKey, string> = {
  tavilyTitle: '网页搜索（Tavily）',
  tavilyDescription: 'Tavily 搜索提供方。',
  tavilyApiKey: 'API Key',
  tavilyApiKeyHint: '不写入设置文件。留空表示保持当前密钥。',
  tavilyApiKeySet: '已配置密钥。',
  tavilyApiKeyUnset: '未配置密钥；配置之前搜索不可用。',
  tavilyDays: '时间窗口（天）',
  tavilyDaysHint: '只返回最近 N 天的结果；留空表示不限制。',
  tavilyNumResults: '默认结果数量',
  tavilyNumResultsHint: '请求未指定上限时使用；留空表示不设置。',
  overridden: '已覆盖',
  reset: '恢复默认',
  readOnly: '本部署的设置为只读。',
  expand: '展开设置',
  collapse: '收起设置',
  save: '保存',
  saving: '保存中…',
  discard: '放弃修改',
  unsaved: '未保存',
  saveFailed: '本部署没有接受这些值，已保留供你修改。',
  invalidNumber: '请填数字；留空表示使用默认值。',
}
