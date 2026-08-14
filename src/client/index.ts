/**
 * Tavily plugin card, browser half — one card registered into the settings
 * shell's `settings.plugin.item` slot, bound to the `web-search-tavily`
 * namespace the Host plugin registers through the settings seam.
 *
 * The key is the one control that does not live in the section: the card
 * learns only whether one is configured and writes it through the credentials
 * domain, addressed by the reference the section names.
 */

import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings shell's SlotMap merge (the 'settings.plugin.item'
// entry) and the ctx.settingsScope Context merge. Cross-plugin collaboration
// goes through the service, never a value import (client bundle purity gate).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: the ctx.remote Context merge and the forwarded-event key face.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { TavilyCard } from './TavilyCard.tsx'
import { TAVILY_NS, TavilyCardController } from './tavily-card-controller.ts'
import { en, zh } from './locales.ts'
import { injectCardStyles } from './styles.ts'

/** Dictionary namespace owned by this plugin's card. */
const NS = 'settings.plugins.tavily'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']

/**
 * Mount the Tavily plugin card into the plugin configuration section.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const { api } = ctx.get('connection') as ConnectionHandle
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'web-search-tavily: card dictionaries')
  ctx.effect(() => injectCardStyles(), 'web-search-tavily: card styles')

  const controller = new TavilyCardController(ctx.settingsScope.bind({ namespace: TAVILY_NS }), api)

  // The credential a card reports is not part of any settings section, so its
  // scope publishes nothing when one is written. This is the only signal that
  // a key written on another surface reached the Host.
  ctx.effect(
    () => ctx.remote.$on('credentials/updated', (ref) => { controller.refreshCredential(ref) }),
    'web-search-tavily: credential invalidations',
  )

  // Cards are list entries: the shell stacks them by `order`; this one sits
  // after the built-in web-search card (20), alongside the settings surface.
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    id: 'web-search-tavily',
    order: 21,
    locale: NS,
    inject: () => controller.inject(),
  }, TavilyCard))
}
