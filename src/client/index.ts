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
// Type-only: the settings shell's ctx.settingsScope Context merge. Cross-plugin
// collaboration goes through the service, never a value import (client bundle
// purity gate). The `settings.plugin.item` contract is pinned in
// ./slot-contract.ts (the published rc.6 settings-plugins types describe the
// superseded list shape; the runtime kind is version-dependent — see there).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: the ctx.remote Context merge and the forwarded-event key face.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import './slot-contract.ts'
import { TavilyCard } from './TavilyCard.tsx'

import { TAVILY_NS, TavilyCardController } from './tavily-card-controller.ts'
import { en, zh } from './locales.ts'
import { injectCardStyles } from './styles.ts'

/** Dictionary namespace owned by this plugin's card. */
const NS = 'settings.plugins.tavily'

/** Card cell identity the `settings.plugin.item` runtime reads: `id` on list slots, `key` on keyed slots. */
const CARD_KEY = 'web-search-tavily'

/** List-side display order: one card past the built-in web-search card (20). */
const CARD_ORDER = 21

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

  // One registration, both slot contracts. `settings.plugin.item` shipped as a
  // LIST slot in the published rc.6 runtime (register requires `id`; built-ins
  // use id: 'bash' / 'agent-loop' / 'web-search'); later runs (0.1.1-rc.x, what
  // `^0.1.0-rc.6` resolves to on a fresh install) declare it KEYED (register
  // requires `key`; built-ins use key: 'shell' / 'agent-loop' /
  // 'web-search-deepseek'). Both SlotCore.register generations validate only
  // their own field, never cross-check the other, and store whichever of
  // `key`/`id` are present — so supplying BOTH (plus the list-side `order`) is
  // the single registration every released runtime accepts.
  // `as const` keeps `name` narrowed to the slot key so the register overload
  // resolves; the extra `id`/`order` fields ride along structurally because
  // this named const is not a fresh literal, so the typechecker admits them
  // (the local keyed declaration in slot-contract.ts types the `key` half).
  const cardOptions = {
    name: 'settings.plugin.item',
    key: CARD_KEY,
    id: CARD_KEY,
    order: CARD_ORDER,
    locale: NS,
    inject: () => controller.inject(),
  } as const
  ctx.effect(
    () =>
      ctx.slots.inject('settings.plugin.item', function* () {
        yield ctx.slots.register(cardOptions, TavilyCard)
      }),
    'web-search-tavily: settings card',
  )
}
