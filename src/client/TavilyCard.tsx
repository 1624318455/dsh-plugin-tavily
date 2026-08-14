/**
 * The Tavily provider's card: the key — written through the credentials
 * domain, never into the settings section, so the literal never rides a
 * response — plus the two numbers a search user changes most often: the
 * default result count and the recency window. The remaining section fields
 * (`baseURL`, `searchDepth`, `topic`, `includeAnswer`, `apiKeyEnv`) are set
 * from the profile configuration and are not rendered here.
 */

import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: the settings shell's SlotMap merge (the 'settings.plugin.item'
// entry) — the card registers into a slot the shell declares.
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { SecretField, ValueField } from './fields.tsx'
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
  return (
    <PluginCard
      t={t}
      titleKey="tavilyTitle"
      descriptionKey="tavilyDescription"
      state={state}
      onSave={props.save}
      onDiscard={props.discard}
    >
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
        id="plugin-config-tavily-days"
        label={t('tavilyDays')}
        hint={t('tavilyDaysHint')}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
        numeric
        disabled={disabled}
        {...state.days}
        onEdit={(text) => { props.edit('days', text) }}
        onReset={() => { props.resetField('days') }}
      />
      <ValueField
        id="plugin-config-tavily-num-results"
        label={t('tavilyNumResults')}
        hint={t('tavilyNumResultsHint')}
        overriddenLabel={t('overridden')}
        resetLabel={t('reset')}
        invalidLabel={t('invalidNumber')}
        numeric
        disabled={disabled}
        {...state.numResults}
        onEdit={(text) => { props.edit('numResults', text) }}
        onReset={() => { props.resetField('numResults') }}
      />
    </PluginCard>
  )
}
