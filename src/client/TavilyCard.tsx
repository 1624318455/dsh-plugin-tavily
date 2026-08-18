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
                : `${t('testApiFailed')} ${state.apiTest.detail}`}
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
        <CheckField
          id="plugin-config-tavily-include-answer"
          label={t('tavilyIncludeAnswer')}
          hint={t('tavilyIncludeAnswerHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          disabled={disabled}
          {...state.includeAnswer}
          onEdit={(text) => { props.edit('includeAnswer', text) }}
          onReset={() => { props.resetField('includeAnswer') }}
        />
        <CheckField
          id="plugin-config-tavily-include-raw-content"
          label={t('tavilyIncludeRawContent')}
          hint={t('tavilyIncludeRawContentHint')}
          overriddenLabel={t('overridden')}
          configCoveredLabel={t('configCovered')}
          resetLabel={t('reset')}
          disabled={disabled}
          {...state.includeRawContent}
          onEdit={(text) => { props.edit('includeRawContent', text) }}
          onReset={() => { props.resetField('includeRawContent') }}
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