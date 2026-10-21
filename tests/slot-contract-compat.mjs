/**
 * Contract regression test for the `plugins.item` card registration.
 *
 * Pins the dsh 0.2.x contract this plugin's card is written against:
 *
 *   - the Plugins page's official-plugin list is the `plugins.item` slot
 *     (the rc.6-era `settings.plugin.item` slot no longer exists);
 *   - a list-slot registration carries `id` (the cell identity) + `order`
 *     (the display position) + `label` (registrant-localized title);
 *   - the card reaches its form through `ctx.configForms`, not the removed
 *     `ctx.settingsScope`;
 *   - credential invalidations arrive as `credentials/reference-updated`.
 *
 * The test has two halves:
 *  1. It parses the SHIPPED bundle (lib/client.cjs) and asserts the card
 *     registration actually carries the fields the current runtime requires —
 *     the artifact-level guard that catches a naive revert to the rc.6 shape.
 *  2. It feeds that shape into the REAL `SlotCore` under the list
 *     declaration, proving the registration is accepted, and pins the
 *     one-field failure mode the runtime rejects.
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
// own node_modules (the core the plugin is developed against).
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
// 1. The shipped bundle must carry the current-runtime registration shape.
// ---------------------------------------------------------------------------
const bundlePath = join(here, '..', 'lib', 'client.cjs')
let bundle
try {
  bundle = readFileSync(bundlePath, 'utf8')
} catch {
  throw new Error(`lib/client.cjs not found at ${bundlePath} — run \`pnpm build\` before this test`)
}

// The card registers into the Plugins page's official-plugin list.
assert.ok(
  bundle.includes('plugins.item'),
  'shipped bundle must register into the plugins.item slot',
)
assert.doesNotMatch(
  bundle,
  /settings\.plugin\.item/,
  'shipped bundle must not reference the removed settings.plugin.item slot',
)

// The form is read through the settings domain's `configForms` service.
assert.ok(
  bundle.includes('configForms'),
  'shipped bundle must read its form through configForms',
)
assert.doesNotMatch(
  bundle,
  /settingsScope/,
  'shipped bundle must not reference the removed settingsScope service',
)

// Credential invalidations use the current forwarded event name.
assert.ok(
  bundle.includes('credentials/reference-updated'),
  'shipped bundle must listen to credentials/reference-updated',
)

// The card's own identity and display order. They survive as named constants
// in the bundle (the bundler keeps module-scope bindings), so the contract is
// asserted on the constants AND on the registration that consumes them.
const idMatch = /const CARD_ID = "([^"]+)"/.exec(bundle)
assert.ok(idMatch, 'shipped bundle must define const CARD_ID')
assert.equal(idMatch[1], 'web-search-tavily', 'shipped card id must be the tavily namespace')
const orderMatch = /const CARD_ORDER = (\d+)/.exec(bundle)
assert.ok(orderMatch, 'shipped bundle must define const CARD_ORDER')
const shippedOrder = Number(orderMatch[1])

// The list-slot registration requires `id`; `order` positions the cell; `label`
// is the registrant-localized title the Plugins page renders.
for (const [field, binding] of [['id', 'CARD_ID'], ['order', 'CARD_ORDER']]) {
  assert.ok(
    new RegExp(`\\b${field}: ${binding}\\b`).test(bundle),
    `shipped card registration must carry \`${field}\` from ${binding}`,
  )
}
assert.ok(
  /label: \(\) => t\(/.test(bundle),
  'shipped card registration must carry a localized label',
)

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
for (const service of ['slots', 'locale', 'remote', 'configForms']) {
  assert.ok(
    bundle.includes(`"${service}"`),
    `shipped bundle must declare "${service}" as a required service`,
  )
}
assert.doesNotMatch(
  bundle,
  /if \(!slots\) return/,
  'shipped bundle must never silently early-return when slots is missing',
)

// The exact shape the bundle registers with (locale/inject are irrelevant to
// the slot-core contract, so only the cell fields are probed).
const CARD = { id: 'web-search-tavily', order: shippedOrder }

// ---------------------------------------------------------------------------
// 2. The registration against the real SlotCore, under the list declaration
//    `plugins.item` uses. The one-field failure mode is pinned too.
// ---------------------------------------------------------------------------
{
  const core = coreWith('list')

  // A registration without `id` throws the loader error — why the id must
  // survive any future refactor of the card's options object.
  assert.throws(
    () => core.register({ name: 'test.slot', order: CARD.order }, () => {}),
    /list slot "test\.slot" requires options\.id/,
    'a registration without options.id must throw on the list runtime',
  )

  // The shipped shape registers without error.
  assert.doesNotThrow(
    () => core.register({ name: 'test.slot', ...CARD }, () => {}),
    'shipped registration must be accepted by the list runtime',
  )
  const [entry] = core.entriesOfSlot('test.slot')
  assert.equal(entry.options.id, CARD.id, 'list cell identity must come from options.id')
  assert.equal(entry.options.order, CARD.order, 'list display order must be preserved')
}

const slotsVersion = requireFrom('@deepseek-ai/dsh-client-ui-slots/package.json').version
console.log(
  `slot-contract-compat: ok — shipped bundle registers by id+order into plugins.item; accepted by the list runtime (SlotCore ${slotsVersion})`,
)
