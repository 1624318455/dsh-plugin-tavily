/**
 * Tavily plugin card, browser half — one card registered into the Plugins
 * page's `plugins.item` slot, bound to the `web-search-tavily` config namespace
 * that the Host plugin's profile entry declares.
 *
 * The key is the one control that does not live in the section: the card
 * learns only whether one is configured and writes it through the credentials
 * domain, addressed by the reference the section names.
 *
 * dsh 0.2.x notes (all of these changed from the 0.1.x API this plugin was
 * first written against):
 *   - the settings scope service is `ctx.configForms`, not `settingsScope`;
 *   - a plugin's form is addressed by its profile entry id;
 *   - the Plugins page slot is `plugins.item`, not `settings.plugin.item`;
 *   - a card's registration follows whether the Host serves its namespace via
 *     `configForms.whileServed`, so a deployment without the plugin shows no
 *     trace of the card;
 *   - credential invalidations arrive as `credentials/reference-updated`.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale) and the
// slots service's Context merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: the Plugins page's `plugins.item` slot declaration and the
// `ctx.configForms` Context merge. Cross-plugin collaboration goes through the
// service, never a value import (client bundle purity gate).
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { TavilyCard } from './TavilyCard.tsx'
import {
  TAVILY_NS,
  TavilyCardController,
  type TavilyCardContext,
} from './tavily-card-controller.ts'
import { en, zh } from './locales.ts'
import { injectCardStyles } from './styles.ts'

/** Dictionary namespace owned by this plugin's card. */
const NS = 'settings.plugins.tavily'

/** Card identity inside the Plugins page's official-plugin list. */
const CARD_ID = 'web-search-tavily'

/** Display order: one card past the built-in web-search card. */
const CARD_ORDER = 41

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'remote', 'remote.credentials', 'configForms']

/**
 * The slots service as this plugin uses it.
 *
 * Spelled structurally rather than imported: the `ctx.slots` Context merge is
 * contributed by the client runtime shell (`dsh-client-ui-renderer`), which a
 * third-party bundle does not depend on — the shipped reference cards are
 * compiled against it, not typechecked through it.
 */
interface SlotsService {
  /**
   * Declare that this plugin contributes to a slot, then register an entry.
   * @param name - the slot to gate on.
   * @param register - registers the entry once the slot exists; returns its disposer.
   * @returns the disposer ending the gate and any live registration.
   */
  inject(name: string, register: () => () => void): () => void
  /**
   * Register one entry into a slot.
   * @param options - slot name plus the entry's identity and inject face.
   * @param component - the component the slot renders.
   * @returns the disposer removing this entry.
   */
  register(options: Record<string, unknown>, component: unknown): () => void
}

/**
 * Mount the Tavily plugin card into the Plugins page.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)
  const slots = (ctx as unknown as { slots: SlotsService }).slots
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'web-search-tavily: card dictionaries')
  ctx.effect(() => injectCardStyles(), 'web-search-tavily: card styles')

  const controller = new TavilyCardController(
    ctx.configForms.get(TAVILY_NS),
    ctx as unknown as TavilyCardContext,
  )
  ctx.effect(() => () => { controller.dispose() }, 'web-search-tavily: form subscription')

  // The credential a card reports is not part of any settings section, so the
  // scope publishes nothing when one is written. This is the only signal that
  // a key written on another surface reached the Host.
  ctx.effect(
    () => ctx.remote.$on('credentials/reference-updated', (ref: string) => { controller.refreshCredential(ref) }),
    'web-search-tavily: credential invalidations',
  )

  // `whileServed` keeps the card registered only while the Host actually serves
  // the `web-search-tavily` config namespace, so uninstalling or disabling the
  // Host half removes the card instead of leaving a dead tab behind.
  ctx.effect(
    () => ctx.configForms.whileServed([TAVILY_NS], () => slots.inject('plugins.item', () => slots.register({
      name: 'plugins.item',
      id: CARD_ID,
      order: CARD_ORDER,
      label: () => t('tavilyTitle'),
      locale: NS,
      inject: () => controller.inject(),
    }, TavilyCard))),
    'web-search-tavily: settings card',
  )
}
