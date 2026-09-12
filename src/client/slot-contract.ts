/**
 * Local SlotMap contract for `settings.plugin.item`.
 *
 * This slot's cardinality is VERSION-DEPENDENT across the `>=0.1.0-rc.6` range
 * the plugin declares — the contract drifted between releases:
 *
 * - `0.1.0-rc.6` (published when the plugin shipped): the slot is a LIST slot.
 *   `dsh-client-ui-settings-plugins` declares `kind: "list"` and the built-in
 *   cards register by `id` (`bash` / `agent-loop` / `web-search`).
 *   `SlotCore.register` for list slots REQUIRES `options.id` and ignores `key`
 *   — a key-only registration throws `list slot "settings.plugin.item"
 *   requires options.id` and takes the whole plugin down (issue #1).
 * - `0.1.1-rc.x` (the current harness; what `>=0.1.0-rc.6` resolves to on a
 *   fresh install): the slot is KEYED. `dsh-client-ui-settings-plugins`
 *   declares `kind: "keyed"`, built-ins register by `key` (`shell` /
 *   `agent-loop` / `web-search-deepseek`), and `SlotCore.register` REQUIRES
 *   `options.key` (an id-only registration would throw the mirror error).
 *
 * Neither generation cross-checks the other field: `SlotCore.register` reads
 * only its own required field per kind and stores whichever of `key`/`id` are
 * present. The card in ./index.ts therefore registers with BOTH `key` and
 * `id` (plus the list-side `order`) — one registration every released runtime
 * accepts, with zero runtime probing.
 *
 * This module pins the KEYED shape — the current-runtime contract, and the one
 * shipped types in newer `dsh-client-ui-settings-plugins` releases describe —
 * because the published rc.6 type declarations in that package describe the
 * superseded list shape. Module augmentation last-wins lets this local
 * declaration narrow the SlotMap entry for this plugin's own registration,
 * which is the `key` half of the dual-field bridge (the `id`/`order` half is
 * admitted structurally at the register() call site — the options are a named
 * const, so those extra fields are not fresh-literal-excess and pass through).
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