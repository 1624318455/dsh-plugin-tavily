/**
 * Real-profile boot smoke for the built dsh-plugin-tavily.
 *
 * Installs the packed plugin into a fresh dsh web profile, boots `dsh web`
 * headless, and asserts the server comes up, the plugin's client bundle is
 * served with the current card registration (`id` + `order` into the
 * `plugins.item` slot), and no plugin-load failure markers appear in the boot
 * log. This is the install→serve wiring check; the slot-contract semantics of
 * the served registration are pinned separately by
 * `tests/slot-contract-compat.mjs` (run per `@deepseek-ai/dsh-client-ui-slots`
 * version).
 *
 * Env:
 *   PLUGIN_TGZ       path to the packed plugin tarball (required)
 *   DSH_CMD          dsh CLI invocation (default `dsh`)
 *   SMOKE_DSH_HOME   profile root (default: a fresh temp dir; the ambient
 *                    DSH_HOME is deliberately NEVER used, so a developer's
 *                    real profile can't be touched by accident)
 *   PORT             fixed listen port (default 46999)
 *
 * Usage:
 *   pnpm build && pnpm pack --pack-destination /tmp
 *   PLUGIN_TGZ=/tmp/memef1f1y-dsh-plugin-tavily-*.tgz node tests/profile-boot-smoke.mjs
 */
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { connect } from 'node:net'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PLUGIN_TGZ = process.env.PLUGIN_TGZ
assert.ok(PLUGIN_TGZ, 'PLUGIN_TGZ must point at the packed plugin tarball')
const DSH_CMD = process.env.DSH_CMD ?? 'dsh'
const explicitHome = process.env.SMOKE_DSH_HOME
const DSH_HOME = explicitHome ?? mkdtempSync(join(tmpdir(), 'dsh-profile-smoke-'))
const HOME_CREATED = !explicitHome
const PORT = Number(process.env.PORT ?? 46999)
// The client module registry serves BATCHED bundle URLs (`/plugins/??a,b,c`)
// and answers only the exact URLs it preloaded — a single-package URL is a
// 404 on 0.2.x. The batch that carries this plugin is discovered from the
// served index page, which preloads every bundle batch it composes.
const PACKAGE_NAME = '@memef1f1y/dsh-plugin-tavily'
const FAILURE_MARKERS = [
  /Failed to load plugins/i,
  /requires options\.(id|key)/,
  /unhandled|ECONNREFUSED/i,
]

/**
 * Find the served bundle batch that carries this plugin's client half.
 * @param html - the served index page.
 * @returns the batch's path (relative to the server root), or undefined.
 */
function batchPathFor(html) {
  // The batch URL ends at the closing quote of the preload link's href. It
  // carries a `&rev=` parameter, which the HTML escapes as `&amp;` — capture
  // through the quote and unescape before the request.
  for (const match of html.matchAll(/plugins\/\?\?[^"']+/g)) {
    if (match[0].includes(`${PACKAGE_NAME}/client.js`)) {
      return match[0].replaceAll('&amp;', '&')
    }
  }
  return undefined
}

function run(cmd, args, opts = {}) {
  // DSH_CMD may itself be a compound command (e.g. `npx --package … dsh`), so
  // the child runs through a shell; args are joined into the command line and
  // are either fixed literals or the required tarball path.
  const res = spawnSync([cmd, ...args].join(' '), { encoding: 'utf8', shell: true, env: { ...process.env, DSH_HOME }, ...opts })
  if (res.error) throw res.error
  return res
}

function waitForPort(port, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      if (Date.now() > deadline) return reject(new Error(`port ${port} never opened within ${timeoutMs}ms`))
      const sock = connect(port, '127.0.0.1')
      sock.once('connect', () => { sock.destroy(); resolve() })
      sock.once('error', () => { sock.destroy(); setTimeout(tryOnce, 500) })
    }
    tryOnce()
  })
}

try {
  // 1. Install the plugin into a fresh web profile (initializes + pnpm add).
  const add = run(DSH_CMD, ['plugin', '--profile', 'web', 'add', PLUGIN_TGZ], { timeout: 180_000 })
  assert.equal(add.status, 0, `dsh plugin add failed:\n${add.stdout}\n${add.stderr}`)

  // 2. Boot `dsh web` headless and wait for the listen port.
  const server = spawn([DSH_CMD, 'web', '--no-open', '--port', String(PORT)].join(' '), {
    env: { ...process.env, DSH_HOME },
    shell: true,
  })
  let bootLog = ''
  server.stdout.on('data', (d) => { bootLog += d })
  server.stderr.on('data', (d) => { bootLog += d })
  const exit = new Promise((resolve) => server.once('exit', (code, sig) => resolve({ code, sig })))
  await waitForPort(PORT)

  // The index page is behind the session token dsh prints at startup. The
  // listen socket opens slightly before that line reaches the pipe, so wait
  // for the announcement rather than racing it.
  let token
  for (let attempt = 0; attempt < 60; attempt++) {
    token = /[?&]token=([A-Za-z0-9_-]+)/.exec(bootLog)?.[1]
    if (token !== undefined) break
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  assert.ok(token !== undefined, `boot log must announce the server URL with a token:\n${bootLog}`)

  // 3. Fetch the served client bundle: 200 + the card registration present.
  //
  // The bundle is served in a batch, and the batch URL is the one the index
  // page preloads — so read that page first, then fetch the batch carrying
  // this plugin.
  //
  // The index page answers a valid launch token with a redirect that mints a
  // session cookie, so follow that redirect BY HAND and keep the cookie jar:
  // an automatic redirect follow swallows the intermediate Set-Cookie, and
  // the bundle route is behind the same browser authentication.
  const jar = new Map()
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  const absorb = (response) => {
    for (const raw of response.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(';')
      const index = pair.indexOf('=')
      if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim())
    }
  }
  const get = async (url) => {
    let response = await fetch(url, {
      redirect: 'manual',
      headers: cookieHeader() === '' ? {} : { cookie: cookieHeader() },
    })
    absorb(response)
    // Follow one redirect by hand so its Set-Cookie reaches the jar.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      assert.ok(location !== null, `index page redirected without a Location header`)
      const target = new URL(location, url).href
      response = await fetch(target, {
        redirect: 'manual',
        headers: cookieHeader() === '' ? {} : { cookie: cookieHeader() },
      })
      absorb(response)
    }
    return response
  }
  const index = await get(`http://127.0.0.1:${PORT}/?token=${token}`)
  assert.equal(index.status, 200, `index page HTTP ${index.status}`)
  const batchPath = batchPathFor(await index.text())
  assert.ok(
    batchPath !== undefined,
    `served index page must preload a bundle batch carrying ${PACKAGE_NAME}/client.js`,
  )
  const res = await get(`http://127.0.0.1:${PORT}/${batchPath}`)
  assert.equal(res.status, 200, `client bundle HTTP ${res.status}`)
  const bundle = await res.text()
  assert.ok(bundle.includes('web-search-tavily'), 'served client bundle must contain the tavily card namespace')
  // dsh 0.2.x moved this card from the `settings.plugin.item` list slot to the
  // Plugins page's `plugins.item` slot, and the registration now carries
  // `id` + `order` + `label` instead of the rc.6 `key`/`id` pair. Assert the
  // contract the current runtime actually accepts.
  assert.ok(
    bundle.includes("'plugins.item'") || bundle.includes('"plugins.item"'),
    'served client bundle must register into the plugins.item slot',
  )
  assert.ok(
    !bundle.includes('settings.plugin.item'),
    'served client bundle must not reference the removed settings.plugin.item slot',
  )
  // The bundler keeps the card's module-scope constants, so the registration
  // is asserted on the constant and the binding that consumes it — the same
  // shape `tests/slot-contract-compat.mjs` pins on the built artifact.
  assert.match(
    bundle,
    /const CARD_ID = "web-search-tavily"/,
    'served client bundle must define the card id',
  )
  assert.match(
    bundle,
    /\bid: CARD_ID\b/,
    'served client bundle must register the card under that id',
  )
  assert.match(
    bundle,
    /const CARD_ORDER = \d+/,
    'served client bundle must define the card display order',
  )
  assert.match(
    bundle,
    /\border: CARD_ORDER\b/,
    'served client bundle must register the card with that order',
  )
  // The card reads its section through `ctx.configForms` and addresses the
  // credential namespace it is served under; both must be present in the
  // shipped bundle for the card to work at runtime.
  assert.ok(bundle.includes('configForms'), 'served client bundle must read its form through configForms')
  assert.ok(
    bundle.includes('credentials/reference-updated'),
    'served client bundle must listen to the current credential invalidation event',
  )

  // The meaningful liveness guarantee is "still serving when the checks above
  // ran" — dsh web shuts down gracefully (exit 0) on SIGTERM, so a post-kill
  // exit code is expected. Only a pre-kill exit is a failure.
  assert.ok(
    server.exitCode === null && server.signalCode === null,
    `dsh web exited before the smoke finished (code=${server.exitCode}, sig=${server.signalCode})`,
  )
  server.kill('SIGTERM')
  await exit

  // 4. Boot log must carry no plugin-load failure markers.
  const hits = FAILURE_MARKERS.filter((m) => m.test(bootLog))
  assert.deepEqual(hits, [], `boot log contains failure markers:\n${bootLog}`)

  console.log(`profile-boot-smoke: ok — ${DSH_HOME} installed, dsh web served the card's client bundle (port ${PORT})`)
} finally {
  if (HOME_CREATED) rmSync(DSH_HOME, { recursive: true, force: true })
}

// dsh web may leave a descendant process holding the stdio pipes after the
// server itself has exited; that would keep this script's event loop alive
// and hang the CI step long past a passed smoke (observed on the 0.1.1-rc.2
// leg: the ok line printed at 16:47:59, the job only ended when its 15-minute
// timeout cancelled it). Exit explicitly so the runner sees a finished step.
// Everything above the try/finally has already run; on an assertion throw the
// finally still cleans up and the uncaught error exits with code 1 first.
process.exit(0)