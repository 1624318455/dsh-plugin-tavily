/**
 * Contract regression test for the `settings.plugin.item` card registration.
 *
 * Pins the version-skew bridge in src/client/index.ts: the slot shipped LIST
 * in `dsh-client-ui-settings-plugins@0.1.0-rc.6` (registration REQUIRES
 * `options.id`, built-ins register by id) and became KEYED in `0.1.1-rc.x`
 * (registration REQUIRES `options.key`, built-ins register by key). The card
 * registers with BOTH fields so a single registration satisfies every
 * released runtime — this test proves that against the real `SlotCore` this
 * repo depends on, and documents why neither single-field "fix" (key-only nor
 * id-only) survives across the range. Runs without network or API keys.
 *
 * Usage:
 *   node tests/slot-contract-compat.mjs
 */
import assert from 'node:assert/strict'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'

const CARD = { key: 'web-search-tavily', id: 'web-search-tavily', order: 21 }

/** Fresh core whose `root` entry declares `test.slot` with the given kind. */
function coreWith(kind) {
  const core = new SlotCore()
  const dispose = core.register(
    { name: 'root', children: { 'test.slot': { kind, scope: 'root' } } },
    () => {},
  )
  assert.equal(typeof dispose, 'function', 'slot declaration disposer should be returned')
  return core
}

// --- rc.6 contract: list slot, registration requires options.id ---
{
  const core = coreWith('list')

  // The bug from issue #1, pinned verbatim: a key-only registration on a list
  // slot throws the exact loader error (`list slot "…" requires options.id`).
  assert.throws(
    () => core.register({ name: 'test.slot', key: CARD.key }, () => {}),
    /list slot "test\.slot" requires options\.id/,
    'key-only registration must throw on the list (rc.6) runtime',
  )

  // The bridge: key + id + order registers without error on the list runtime.
  assert.doesNotThrow(
    () => core.register({ name: 'test.slot', ...CARD }, () => {}),
    'dual-field registration must be accepted by the list (rc.6) runtime',
  )
  const [entry] = core.entriesOfSlot('test.slot')
  assert.equal(entry.options.id, CARD.id, 'list cell identity must come from options.id')
  assert.equal(entry.options.order, CARD.order, 'list display order must be preserved')
  assert.equal(entry.options.key, CARD.key, 'options.key must be stored alongside options.id')
}

// --- 0.1.1-rc.x contract: keyed slot, registration requires options.key ---
{
  const core = coreWith('keyed')

  // The mirror failure: an id-only registration on a keyed slot throws
  // (`keyed slot "…" requires options.key`) — why a naive key→id revert
  // would just move the crash to the newer runtime.
  assert.throws(
    () => core.register({ name: 'test.slot', id: CARD.id, order: CARD.order }, () => {}),
    /keyed slot "test\.slot" requires options\.key/,
    'id-only registration must throw on the keyed (0.1.1-rc.x) runtime',
  )

  // The bridge: the same dual-field registration registers cleanly, and the
  // keyed cell identity comes from options.key.
  assert.doesNotThrow(
    () => core.register({ name: 'test.slot', ...CARD }, () => {}),
    'dual-field registration must be accepted by the keyed (0.1.1-rc.x) runtime',
  )
  const [entry] = core.entriesOfSlot('test.slot')
  assert.equal(entry.options.key, CARD.key, 'keyed cell identity must come from options.key')
  assert.equal(entry.options.id, CARD.id, 'options.id must be stored alongside options.key')
}

console.log('slot-contract-compat: ok — dual-field card registration accepted by both list (rc.6) and keyed (0.1.1-rc.x) runtimes')