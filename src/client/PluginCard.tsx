/**
 * One plugin's card: a header naming the plugin and what its settings govern,
 * disclosing that plugin's controls in place, with the save that writes them.
 *
 * The header is its own button rather than a shared disclosure row because a
 * card stacks its name over its description, while that row lays the two side
 * by side — the layout, not the behavior, is what differs. Disclosure is
 * card-local state: which card a user has open is a reading gesture, not
 * something the Host or the section has any stake in. Staged edits outlive
 * collapsing, so the header marks a card holding unsaved edits.
 *
 * A card renders nothing while its namespace is unavailable: a deployment that
 * does not compose the owning plugin should show no trace of it, rather than a
 * disabled card the user cannot act on.
 */

import { useState, type ReactNode } from 'react'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { CardShell } from './card-form.ts'
import type { TavilyCardLocaleKey } from './locales.ts'

/** Card chrome shared by every plugin card this plugin ships. */
export interface PluginCardProps {
  /** Locale reader for this card's copy. */
  t: (key: TavilyCardLocaleKey) => string
  /** Locale key of the plugin's name. */
  titleKey: TavilyCardLocaleKey
  /** Locale key of the line describing what this plugin's settings govern. */
  descriptionKey: TavilyCardLocaleKey
  /** The card's form state: availability, writability, and what a save would do. */
  state: CardShell
  /** Write every staged edit. */
  onSave: () => void
  /** Drop every staged edit. */
  onDiscard: () => void
  /** The plugin's controls. */
  children: ReactNode
}

/**
 * Render one plugin card.
 * @param props - the plugin's copy keys, its form state, and its controls.
 * @returns the card, or nothing when the namespace is unavailable.
 */
export function PluginCard(props: PluginCardProps) {
  const [open, setOpen] = useState(false)
  const { state } = props
  if (!state.available) return null
  const title = props.t(props.titleKey)
  const blocked = !state.dirty || state.invalid || state.saving
  return (
    <li className={open ? 'dsh-tavily-card dsh-tavily-open' : 'dsh-tavily-card'}>
      <button
        type="button"
        className="dsh-tavily-header"
        aria-expanded={open}
        aria-label={`${props.t(open ? 'collapse' : 'expand')}: ${title}`}
        onClick={() => { setOpen(!open) }}
      >
        <span className="dsh-tavily-head-text">
          <span className="dsh-tavily-name">{title}</span>
          <span className="dsh-tavily-description">{props.t(props.descriptionKey)}</span>
        </span>
        {state.dirty ? <span className="dsh-tavily-pending">{props.t('unsaved')}</span> : null}
        <IconChevronDownOutline14 className={open ? 'dsh-tavily-chevron dsh-tavily-open' : 'dsh-tavily-chevron'} />
      </button>
      {open
        ? (
          <div className="dsh-tavily-body">
            {!state.writable ? <p className="dsh-tavily-read-only" role="status">{props.t('readOnly')}</p> : null}
            {props.children}
            <div className="dsh-tavily-footer">
              {state.failed ? <p className="dsh-tavily-failed" role="status">{props.t('saveFailed')}</p> : null}
              <button
                type="button"
                className="dsh-tavily-discard"
                disabled={!state.dirty || state.saving}
                onClick={props.onDiscard}
              >
                {props.t('discard')}
              </button>
              <button
                type="button"
                className="dsh-tavily-save"
                disabled={blocked}
                onClick={props.onSave}
              >
                {props.t(state.saving ? 'saving' : 'save')}
              </button>
            </div>
          </div>
        )
        : null}
    </li>
  )
}
