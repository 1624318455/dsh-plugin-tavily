/**
 * The Tavily provider's card: the key and API base URL live in the always-open
 * basic block; every professional Tavily request parameter sits in a collapsed
 * advanced block so ordinary users are not overwhelmed. Fields pinned by the
 * yaml composition layer are rendered disabled with a dedicated badge.
 */

import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// The keyed-slot contract for 'settings.plugin.item' is pinned in
// ./slot-contract.ts — the card registers into a slot the shell declares.
import './slot-contract.ts'
import { CheckField, SecretField, SelectField, ValueField } from './fields.tsx'
import { PluginCard } from './PluginCard.tsx'
import type { TavilyCardFace } from './tavily-card-controller.ts'
import type {} from './locales.ts'

/** Props the renderer binds for the Tavily card. */
export type TavilyCardProps =
  PropsRuntime<'settings.plugin.item'>
  & PropsLocale<'settings.plugins.tavily'>
  & InjectFace<TavilyCardFace>

/**
 * Copyable snippet wiring `web_search` to this provider. `searchMode` above is
 * only how Tavily merges DeepSeek once selected — it does NOT select the
 * provider. Without this `web.searchProvider: tavily` (or
 * `DSH_WEB_SEARCH_PROVIDER=tavily`), `web_search` keeps using the built-in
 * DeepSeek provider, which is where the confusing "no DeepSeek API key" error
 * comes from.
 */
const WIRING_YAML = `# ~/.dsh/profiles/<profile>/cordis.patch.yml
- id: web
  config:
    searchProvider: tavily
    # fetchProvider: tavily-extract   # optional: URL retrieval via Tavily Extract
`

/**
 * Format a rough token count into a short magnitude, e.g. `3.8k` or `1.2M`.
 * @param tokens - the approximate token count.
 * @returns a compact human-readable magnitude.
 */
function formatTokenHint(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`
  return String(tokens)
}

/**
 * Render the Tavily card.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the card.
 */
export function TavilyCard(props: TavilyCardProps) {
  const { t } = props
  const state = props.useTavilyCard(snapshot => snapshot)
  const disabled = !state.writable
  const testing = state.apiTest.status === 'testing'
  return (
    <PluginCard
      t={t}
      titleKey="tavilyTitle"
      descriptionKey="tavilyDescription"
      state={state}
      onSave={props.save}
      onDiscard={props.discard}
    >
      {/* ① Basic settings (always visible). */}
      <div className="dsh-tavily-wiring">
        <p className="dsh-tavily-wiring-title" role="note">{t('wiringTitle')}</p>
        <p className="dsh-tavily-wiring-copy">{t('wiringHint')}</p>
        <pre className="dsh-tavily-wiring-code">{WIRING_YAML}</pre>
      </div>
      <SecretField
        id="plugin-config-tavily-key"
        label={t('tavilyApiKey')}
        hint={t('tavilyApiKeyHint')}
        // The credentials domain accepts a key even when the settings document
        // itself is read-only; they are separate stores with separate refusals.
        // Its own writability is what disables this control — a key sourced
        // from the process environment cannot be written from here.
        disabled={!state.apiKeyWritable}
        text={state.apiKey.text}
        configured={state.apiKeyConfigured}
        stateLabel={state.apiKeyConfigured ? t('tavilyApiKeySet') : t('tavilyApiKeyUnset')}
        onEdit={(text) => { props.edit('apiKey', text) }}
      />
      <ValueField
        id="plugin-config-tavily-base-url"
        label={t('tavilyBaseUrl')}
        hint={t('tavilyBaseUrlHint')}
        overriddenLabel={t('overridden')}
        configCoveredLabel={t('configCovered')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
        placeholder="https://api.tavily.com"
        disabled={disabled}
        {...state.baseURL}
        onEdit={(text) => { props.edit('baseURL', text) }}
        onReset={() => { props.resetField('baseURL') }}
      />
      <SelectField
        id="plugin-config-tavily-search-mode"
        label={t('tavilySearchMode')}
        hint={t('tavilySearchModeHint')}
        overriddenLabel={t('overridden')}
        configCoveredLabel={t('configCovered')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
        placeholder="tavily-only"
        disabled={disabled}
        {...state.searchMode}
        options={[
          { value: 'tavily-only', label: t('searchModeTavilyOnly') },
          { value: 'deepseek-first', label: t('searchModeDeepseekFirst') },
          { value: 'tavily-first', label: t('searchModeTavilyFirst') },
        ]}
        onEdit={(text) => { props.edit('searchMode', text) }}
        onReset={() => { props.resetField('searchMode') }}
      />
      <SelectField
        id="plugin-config-tavily-engine"
        label={t('tavilyEngine')}
        hint={t('tavilyEngineHint')}
        overriddenLabel={t('overridden')}
        configCoveredLabel={t('configCovered')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
        placeholder="tavily"
        disabled={disabled}
        {...state.engine}
        options={[
          { value: 'tavily', label: t('engineTavily') },
          { value: 'deepseek', label: t('engineDeepseek') },
        ]}
        onEdit={(text) => { props.edit('engine', text) }}
        onReset={() => { props.resetField('engine') }}
      />

      <div className="dsh-tavily-test-area">
        <button
          type="button"
          className="dsh-tavily-test"
          disabled={testing || !state.apiKeyWritable}
          onClick={props.testApi}
        >
          {testing ? t('testingApi') : t('testApi')}
        </button>
        <p className="dsh-tavily-test-hint">{t('testApiHint')}</p>
        {state.apiTest.status === 'success'
          ? <p className="dsh-tavily-test-success" role="status">{t('testApiSuccess')}</p>
          : null}
        {state.apiTest.status === 'error'
          ? (
            <p className="dsh-tavily-test-error" role="alert">
              {state.apiTest.detail === 'need-key'
                ? t('testApiNeedKey')
                : state.apiTest.detail === 'need-key-configured'
                  ? t('testApiKeyConfiguredNeedReentry')
                  : `${t('testApiFailed')} ${state.apiTest.detail}`}
            </p>
          )
          : null}
      </div>

      <div className="dsh-tavily-usage-area">
        <p className="dsh-tavily-usage-estimate" role="status">
          {t('usageEstimateLabel')}
          {state.estimate.credits} {t('usageEstimateCredits')}, ~{formatTokenHint(state.estimate.tokenHint)}
        </p>
        <button
          type="button"
          className="dsh-tavily-test"
          disabled={state.usage.status === 'checking' || !state.apiKeyWritable}
          onClick={props.checkUsage}
        >
          {state.usage.status === 'checking' ? t('checkingUsage') : t('checkUsage')}
        </button>
        <p className="dsh-tavily-test-hint">{t('checkUsageHint')}</p>
        {state.usage.status === 'success' && state.usage.key
          ? (
            <p className="dsh-tavily-test-success" role="status">
              {t('usageResultLabel')}
              {state.usage.key.used ?? 0}
              {t('usageResultOf')}
              {state.usage.key.limit != null ? String(state.usage.key.limit) : t('usageUnlimited')}
              {t('usageResultSearch')}
              {state.usage.key.searchUsed ?? 0}
              {state.usage.plan != null && state.usage.plan !== '' ? ` (${state.usage.plan})` : ''}
            </p>
          )
          : null}
        {state.usage.status === 'error'
          ? (
            <p className="dsh-tavily-test-error" role="alert">
              {state.usage.detail === 'need-key'
                ? t('testApiNeedKey')
                : state.usage.detail === 'need-key-configured'
                  ? t('testApiKeyConfiguredNeedReentry')
                  : `${t('usageFailed')} ${state.usage.detail}`}
            </p>
          )
          : null}
      </div>

      {/* ② Advanced request parameters (collapsed by default). */}
      <details className="dsh-tavily-advanced">
        <summary>{t('advancedTitle')}</summary>
        <ValueField
          id="plugin-config-tavily-max-results"
          label={t('tavilyMaxResults')}
          hint={t('tavilyMaxResultsHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          numeric
          placeholder="5"
          disabled={disabled}
          {...state.maxResults}
          onEdit={(text) => { props.edit('maxResults', text) }}
          onReset={() => { props.resetField('maxResults') }}
        />
        <SelectField
          id="plugin-config-tavily-search-depth"
          label={t('tavilySearchDepth')}
          hint={t('tavilySearchDepthHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          placeholder="basic"
          disabled={disabled}
          {...state.searchDepth}
          options={[
            { value: 'basic', label: t('searchDepthBasic') },
            { value: 'advanced', label: t('searchDepthAdvanced') },
            { value: 'fast', label: t('searchDepthFast') },
            { value: 'ultra-fast', label: t('searchDepthUltraFast') },
          ]}
          onEdit={(text) => { props.edit('searchDepth', text) }}
          onReset={() => { props.resetField('searchDepth') }}
        />
        <SelectField
          id="plugin-config-tavily-topic"
          label={t('tavilyTopic')}
          hint={t('tavilyTopicHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          placeholder="general"
          disabled={disabled}
          {...state.topic}
          options={[
            { value: 'general', label: t('topicGeneral') },
            { value: 'news', label: t('topicNews') },
            { value: 'finance', label: t('topicFinance') },
          ]}
          onEdit={(text) => { props.edit('topic', text) }}
          onReset={() => { props.resetField('topic') }}
        />
        <SelectField
          id="plugin-config-tavily-include-answer"
          label={t('tavilyIncludeAnswer')}
          hint={t('tavilyIncludeAnswerHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          placeholder={t('includeAnswerRecommended')}
          disabled={disabled}
          {...state.includeAnswer}
          options={[
            { value: 'true', label: t('includeAnswerTrue') },
            { value: 'advanced', label: t('includeAnswerAdvanced') },
            { value: 'false', label: t('includeAnswerFalse') },
          ]}
          onEdit={(text) => { props.edit('includeAnswer', text) }}
          onReset={() => { props.resetField('includeAnswer') }}
        />
        <SelectField
          id="plugin-config-tavily-include-raw-content"
          label={t('tavilyIncludeRawContent')}
          hint={t('tavilyIncludeRawContentHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          placeholder="false"
          disabled={disabled}
          {...state.includeRawContent}
          options={[
            { value: 'false', label: t('rawContentFalse') },
            { value: 'true', label: t('rawContentMarkdown') },
            { value: 'markdown', label: t('rawContentMarkdown') },
            { value: 'text', label: t('rawContentText') },
          ]}
          onEdit={(text) => { props.edit('includeRawContent', text) }}
          onReset={() => { props.resetField('includeRawContent') }}
        />
        <ValueField
          id="plugin-config-tavily-chunks-per-source"
          label={t('tavilyChunksPerSource')}
          hint={t('tavilyChunksPerSourceHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          numeric
          placeholder="3"
          disabled={disabled}
          {...state.chunksPerSource}
          onEdit={(text) => { props.edit('chunksPerSource', text) }}
          onReset={() => { props.resetField('chunksPerSource') }}
        />
        <SelectField
          id="plugin-config-tavily-time-range"
          label={t('tavilyTimeRange')}
          hint={t('tavilyTimeRangeHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          placeholder={t('tavilyDaysHint')}
          disabled={disabled}
          {...state.timeRange}
          options={[
            { value: 'day', label: 'day' },
            { value: 'week', label: 'week' },
            { value: 'month', label: 'month' },
            { value: 'year', label: 'year' },
            { value: 'd', label: 'd' },
            { value: 'w', label: 'w' },
            { value: 'm', label: 'm' },
            { value: 'y', label: 'y' },
          ]}
          onEdit={(text) => { props.edit('timeRange', text) }}
          onReset={() => { props.resetField('timeRange') }}
        />
        <ValueField
          id="plugin-config-tavily-start-date"
          label={t('tavilyStartDate')}
          hint={t('tavilyStartDateHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          placeholder="YYYY-MM-DD"
          disabled={disabled}
          {...state.startDate}
          onEdit={(text) => { props.edit('startDate', text) }}
          onReset={() => { props.resetField('startDate') }}
        />
        <ValueField
          id="plugin-config-tavily-end-date"
          label={t('tavilyEndDate')}
          hint={t('tavilyEndDateHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          placeholder="YYYY-MM-DD"
          disabled={disabled}
          {...state.endDate}
          onEdit={(text) => { props.edit('endDate', text) }}
          onReset={() => { props.resetField('endDate') }}
        />
        <CheckField
          id="plugin-config-tavily-include-images"
          label={t('tavilyIncludeImages')}
          hint={t('tavilyIncludeImagesHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          disabled={disabled}
          {...state.includeImages}
          onEdit={(text) => { props.edit('includeImages', text) }}
          onReset={() => { props.resetField('includeImages') }}
        />
        <CheckField
          id="plugin-config-tavily-include-image-descriptions"
          label={t('tavilyIncludeImageDescriptions')}
          hint={t('tavilyIncludeImageDescriptionsHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          disabled={disabled}
          {...state.includeImageDescriptions}
          onEdit={(text) => { props.edit('includeImageDescriptions', text) }}
          onReset={() => { props.resetField('includeImageDescriptions') }}
        />
        <CheckField
          id="plugin-config-tavily-include-favicon"
          label={t('tavilyIncludeFavicon')}
          hint={t('tavilyIncludeFaviconHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          disabled={disabled}
          {...state.includeFavicon}
          onEdit={(text) => { props.edit('includeFavicon', text) }}
          onReset={() => { props.resetField('includeFavicon') }}
        />
        <ValueField
          id="plugin-config-tavily-include-domains"
          label={t('tavilyIncludeDomains')}
          hint={t('tavilyIncludeDomainsHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidList')}
          placeholder="example.com, docs.example.org"
          disabled={disabled}
          {...state.includeDomains}
          onEdit={(text) => { props.edit('includeDomains', text) }}
          onReset={() => { props.resetField('includeDomains') }}
        />
        <ValueField
          id="plugin-config-tavily-exclude-domains"
          label={t('tavilyExcludeDomains')}
          hint={t('tavilyExcludeDomainsHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidList')}
          placeholder="spam.com, ads.example.org"
          disabled={disabled}
          {...state.excludeDomains}
          onEdit={(text) => { props.edit('excludeDomains', text) }}
          onReset={() => { props.resetField('excludeDomains') }}
        />
        <ValueField
          id="plugin-config-tavily-country"
          label={t('tavilyCountry')}
          hint={t('tavilyCountryHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          placeholder="japan"
          disabled={disabled}
          {...state.country}
          onEdit={(text) => { props.edit('country', text) }}
          onReset={() => { props.resetField('country') }}
        />
        <ValueField
          id="plugin-config-tavily-retry-max-attempts"
          label={t('tavilyRetryMaxAttempts')}
          hint={t('tavilyRetryMaxAttemptsHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          numeric
          placeholder="2"
          disabled={disabled}
          {...state.retryMaxAttempts}
          onEdit={(text) => { props.edit('retryMaxAttempts', text) }}
          onReset={() => { props.resetField('retryMaxAttempts') }}
        />
        <ValueField
          id="plugin-config-tavily-cache-ttl"
          label={t('tavilyCacheTtl')}
          hint={t('tavilyCacheTtlHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          numeric
          placeholder="0"
          disabled={disabled}
          {...state.cacheTtlSeconds}
          onEdit={(text) => { props.edit('cacheTtlSeconds', text) }}
          onReset={() => { props.resetField('cacheTtlSeconds') }}
        />
        <ValueField
          id="plugin-config-tavily-timeout"
          label={t('tavilyTimeout')}
          hint={t('tavilyTimeoutHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          numeric
          placeholder="30000"
          disabled={disabled}
          {...state.timeout}
          onEdit={(text) => { props.edit('timeout', text) }}
          onReset={() => { props.resetField('timeout') }}
        />
        <ValueField
          id="plugin-config-tavily-days"
          label={t('tavilyDays')}
          hint={t('tavilyDaysHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          invalidLabel={t('invalidNumber')}
          numeric
          disabled={disabled}
          {...state.days}
          onEdit={(text) => { props.edit('days', text) }}
          onReset={() => { props.resetField('days') }}
        />
      </details>
    </PluginCard>
  )
}