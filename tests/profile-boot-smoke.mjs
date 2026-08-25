/**
 * Real-profile boot smoke for the built dsh-plugin-tavily.
 *
 * Installs the packed plugin into a fresh dsh web profile, boots `dsh web`
 * headless, and asserts the server comes up, the plugin's client bundle is
 * served with the dual-field card registration (`key` + `id` + `order`), and
 * no plugin-load failure markers appear in the boot log. This is the
 * install→serve wiring check; the slot-contract semantics of the served
 * registration are pinned separately by `tests/slot-contract-compat.mjs`
 * (run per `@deepseek-ai/dsh-client-ui-slots` version).
 *
 * Env:
 *   PLUGIN_TGZ       path to the packed plugin tarball (required)
 *   DSH_CMD          dsh CLI invocation (default `dsh`; e.g.
 *                    `npx --yes --package @deepseek-ai/dsh@0.1.0-rc.6 dsh`)
 *   SMOKE_DSH_HOME   profile root (default: a fresh temp dir; the ambient
 *                    DSH_HOME is deliberately NEVER used, so a developer's
 *                    real profile can't be touched by accident)
 *   PORT             fixed listen port (default 46999)
 *
 * Usage:
 *   pnpm build && pnpm pack --pack-destination /tmp
 *   PLUGIN_TGZ=/tmp/dsh-external-dsh-plugin-tavily-*.tgz node tests/profile-boot-smoke.mjs
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
const CLIENT_URL = `http://127.0.0.1:${PORT}/plugins/@dsh-external/dsh-plugin-tavily/client.js`

const FAILURE_MARKERS = [
  /Failed to load plugins/i,
  /requires options\.(id|key)/,
  /unhandled|ECONNREFUSED/i,
]

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

  // 3. Fetch the served client bundle: 200 + dual-field registration present.
  const res = await fetch(CLIENT_URL)
  assert.equal(res.status, 200, `client bundle HTTP ${res.status}`)
  const bundle = await res.text()
  assert.ok(bundle.includes('web-search-tavily'), 'served client bundle must contain the tavily card namespace')
  for (const [field, constName] of [['key', 'CARD_KEY'], ['id', 'CARD_KEY'], ['order', 'CARD_ORDER']]) {
    assert.ok(
      new RegExp(`\\b${field}: ${constName}`).test(bundle),
      `served client bundle must register with \`${field}\``,
    )
  }

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

  console.log(`profile-boot-smoke: ok — ${DSH_HOME} installed, dsh web served the dual-field client bundle (port ${PORT})`)
} finally {
  if (HOME_CREATED) rmSync(DSH_HOME, { recursive: true, force: true })
}