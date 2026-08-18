/**
 * Local SlotMap contract for `settings.plugin.item`.
 *
 * DSH rc.6+ changed this slot from a list slot to a keyed slot: every
 * registration MUST supply a unique `key` (the settings namespace the card
 * owns).  The published `@deepseek-ai/dsh-client-ui-settings-plugins@0.1.0-rc.6`
 * type declarations still describe the old list shape, so this module pins the
 * keyed contract instead of importing that stale augmentation.
 */

import type {} from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** One plugin's card inside the configurable-plugins tab, keyed by the settings namespace. */
    'settings.plugin.item': {
      kind: 'keyed'
      scope: 'root'
      owner: {
        /** Marker field: card owner props are intentionally empty. */
        children?: never
      }
    }
  }
}

export {}