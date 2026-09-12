/**
 * Contract regression test for the `settings.plugin.item` card registration.
 *
 * Pins the version-skew bridge in src/client/index.ts: the slot shipped LIST
 * in `dsh-client-ui-settings-plugins@0.1.0-rc.6` (registration REQUIRES
 * `options.id`, built-ins register by id) and became KEYED in `0.1.1-rc.x`
 * (registration REQUIRES `options.key`, built-ins register by key). The card
 * registers with BOTH fields so a single registration satisfies every
 * released runtime.
 *
 * The test has two halves:
 *  1. It parses the SHIPPED bundle (lib/client.cjs) and asserts the actual
 *     card registration exposes `key` + `id` (+ `order`) — the regression
 *     that catches a future naive revert to a single-field registration.
 *  2. It feeds that shape into the REAL `SlotCore` under both the list and
 *     the keyed declaration, proving the registration is accepted by both
 *     runtime contracts — and pins the one-field failure modes on each side
 *     (the exact loader errors from issue #1 and its mirror).
 *
 * The SlotCore under test is the repo's installed copy by default; point
 * `SLOTS_PACKAGE_DIR` at another install (e.g. a matrix leg with a different
 * `@deepseek-ai/dsh-client-ui-slots` version, installed with
 * `npm install --prefix <dir> @deepseek-ai/dsh-client-ui-slots@<ver>`).
 *
 * Usage:
 *   pnpm build && node tests/slot-contract-compat.mjs
 *   pnpm build && SLOTS_PACKAGE_DIR=/tmp/slots/node_modules node tests/slot-contract-compat.mjs
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

// Resolve SlotCore from SLOTS_PACKAGE_DIR when given, else from this repo's
// own node_modules (the rc.6 core the plugin is developed against).
const slotRoot = process.env.SLOTS_PACKAGE_DIR
  ? join(process.env.SLOTS_PACKAGE_DIR, '__probe__.mjs')
  : join(here, '__probe__.mjs')
const requireFrom = createRequire(pathToFileURL(slotRoot))
const { SlotCore } = requireFrom('@deepseek-ai/dsh-client-ui-slots')

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

// ---------------------------------------------------------------------------
// 1. The shipped bundle must carry the dual-field registration. This is the
//    artifact-level guard: it would have caught the key-only revert at the
//    source, before any runtime is involved.
// ---------------------------------------------------------------------------
const bundlePath = join(here, '..', 'lib', 'client.cjs')
let bundle
try {
  bundle = readFileSync(bundlePath, 'utf8')
} catch {
  throw new Error(`lib/client.cjs not found at ${bundlePath} — run \`pnpm build\` before this test`)
}

function shipped(field) {
  const match = new RegExp(`const ${field} = "([^"]+)"`).exec(bundle)
  assert.ok(match, `shipped bundle must define const ${field}`)
  return match[1]
}

const shippedKey = shipped('CARD_KEY')
assert.equal(shippedKey, 'web-search-tavily', 'shipped card key must be the tavily namespace')

for (const field of ['key', 'id', 'order']) {
  assert.match(
    bundle,
    new RegExp(`\\b${field}: CARD_${field === 'order' ? 'ORDER' : 'KEY'}`),
    `shipped cardOptions must carry the \`${field}\` field`,
  )
}
const orderMatch = /const CARD_ORDER = (\d+)/.exec(bundle)
assert.ok(orderMatch, 'shipped bundle must define const CARD_ORDER')
const shippedOrder = Number(orderMatch[1])

// Fiber-inject guard (dsh-plugin-tts@a00b357 class): the client runner creates
// the entry as ctx.plugin({ inject, apply }) with inject waiting, so apply
// only runs after the declared services are available. Without the
// declaration, services can be unavailable at apply time and the card
// silently no-ops. The bundle must export inject including "slots" and fail
// loud when a service is missing (never `if (!slots) return`).
assert.match(
  bundle,
  /const inject = \[[^\]]*"slots"[^\]]*\]/,
  'shipped bundle must declare fiber inject including "slots"',
)
for (const service of ['slots', 'locale', 'connection', 'remote', 'settingsScope']) {
  assert.ok(
    bundle.includes(`"${service}"`) && bundle.includes(`${service} service unavailable`),
    `shipped bundle must resolve "${service}" with a fail-loud guard`,
  )
}
assert.doesNotMatch(
  bundle,
  /if \(!slots\) return/,
  'shipped bundle must never silently early-return when slots is missing',
)

// The exact dual-field shape the bundle registers with (locale/inject are
// irrelevant to the slot-core contract, so only the cell fields are probed).
const CARD = { key: shippedKey, id: shippedKey, order: shippedOrder }

// ---------------------------------------------------------------------------
// 2. The dual-field registration against the real SlotCore, per declaration
//    kind. Each side also pins its one-field failure mode.
// ---------------------------------------------------------------------------

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

  // The bridge: the shipped key + id + order registers without error.
  assert.doesNotThrow(
    () => core.register({ name: 'test.slot', ...CARD }, () => {}),
    'shipped dual-field registration must be accepted by the list (rc.6) runtime',
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

  // The same shipped shape registers cleanly; cell identity comes from key.
  assert.doesNotThrow(
    () => core.register({ name: 'test.slot', ...CARD }, () => {}),
    'shipped dual-field registration must be accepted by the keyed (0.1.1-rc.x) runtime',
  )
  const [entry] = core.entriesOfSlot('test.slot')
  assert.equal(entry.options.key, CARD.key, 'keyed cell identity must come from options.key')
  assert.equal(entry.options.id, CARD.id, 'options.id must be stored alongside options.key')
}

const slotsVersion = requireFrom('@deepseek-ai/dsh-client-ui-slots/package.json').version
console.log(
  `slot-contract-compat: ok — shipped bundle registers by key+id+order; accepted by both list (rc.6) and keyed (0.1.1-rc.x) runtimes (SlotCore ${slotsVersion})`,
)