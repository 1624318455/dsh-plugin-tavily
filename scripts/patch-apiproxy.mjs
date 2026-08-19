#!/usr/bin/env node
/**
 * dsh-plugin-tavily — apiproxy allowlist patcher.
 *
 * The web GUI only serves a plugin's settings section to the browser when its
 * namespace is on the apiproxy allowlist (`WEB_SETTINGS_NAMESPACES` in
 * `@deepseek-ai/dsh-host-apiproxy`). Until the host lets a plugin expose its own
 * configuration, the card is filtered out unless `"web-search-tavily"` is added
 * to that array. This script detects every installed copy and applies that
 * addition idempotently (it never removes anything and never patches an
 * already-patched file).
 *
 * Usage:
 *   node scripts/patch-apiproxy.mjs            # patch all installed copies (writes)
 *   node scripts/patch-apiproxy.mjs --check    # only report, never write
 *   node scripts/patch-apiproxy.mjs --profile web   # target one profile
 *
 * The patch is overwritten by `pnpm install --force` and by harness upgrades, so
 * re-run this script after re-installing dependencies.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const NS = 'web-search-tavily'
const ANCHOR = 'web-search-deepseek'

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const profileArgIndex = args.indexOf('--profile')
const profileOnly = profileArgIndex !== -1 && args[profileArgIndex + 1]
  ? args[profileArgIndex + 1].trim()
  : undefined

/**
 * Candidates: every installed profile's apiproxy `lib/index.js`. A single
 * profile (`--profile web`) narrows the search to that one profile.
 */
function candidateFiles() {
  const out = []
  if (profileOnly !== undefined) {
    const file = join(homedir(), '.dsh', 'profiles', profileOnly, 'node_modules', '@deepseek-ai', 'dsh-host-apiproxy', 'lib', 'index.js')
    if (existsSync(file)) out.push(resolve(file))
    return out
  }
  const base = join(homedir(), '.dsh', 'profiles')
  if (!existsSync(base) || !_isDirectory(base)) return out
  for (const entry of _readdir(base)) {
    if (!_isDirectory(join(base, entry))) continue
    const file = join(base, entry, 'node_modules', '@deepseek-ai', 'dsh-host-apiproxy', 'lib', 'index.js')
    if (existsSync(file)) out.push(resolve(file))
  }
  return out
}

/** Apply the namespace to one file's source; returns the new source or undefined when unchanged. */
function patchSource(source) {
  if (source.includes(`"${NS}"`)) return undefined
  const lines = source.split('\n')
  const anchor = lines.findIndex(line => line.includes(`"${ANCHOR}"`))
  const anyNs = lines.findIndex(line => /"web-search-/.test(line))
  const index = anchor !== -1 ? anchor : anyNs
  if (index === -1) {
    throw new Error(
      `could not locate WEB_SETTINGS_NAMESPACES entries ("${ANCHOR}") — the host layout may have changed;`
      + ' add the namespace manually or report the new layout',
    )
  }
  const indent = lines[index].match(/^\s*/u)?.[0] ?? '  '
  lines.splice(index + 1, 0, `${indent}"${NS}",`)
  return lines.join('\n')
}

function main() {
  const files = candidateFiles()
  if (files.length === 0) {
    if (profileOnly !== undefined && !existsSync(join(homedir(), '.dsh', 'profiles', profileOnly))) {
      console.error(`profile "${profileOnly}" not found under ~/.dsh/profiles — nothing to patch.`)
      process.exit(1)
    }
    console.error('no @deepseek-ai/dsh-host-apiproxy installation found under ~/.dsh/profiles — nothing to patch.')
    process.exit(1)
  }

  let changed = 0
  let needed = 0
  let skipped = 0
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    let next
    try {
      next = patchSource(source)
    } catch (error) {
      console.error(`[skip] ${file}: ${error.message}`)
      skipped += 1
      continue
    }
    if (next === undefined) {
      if (!checkOnly) console.log(`[ok]   ${file}: already allowlisted`)
      else console.log(`[check] ${file}: already allowlisted`)
      continue
    }
    needed += 1
    if (checkOnly) {
      console.log(`[check] ${file}: would add "${NS}" (not written)`)
      continue
    }
    writeFileSync(file, next, 'utf8')
    changed += 1
    console.log(`[patched] ${file}: added "${NS}" to WEB_SETTINGS_NAMESPACES`)
  }

  if (checkOnly) {
    console.log(`\n${needed === 0 ? 'No patch needed' : 'Patch needed'} — run without --check to apply.`)
    process.exit(needed === 0 ? 0 : 1)
  }
  if (changed === 0) {
    console.log('\nnothing to patch — all copies are already allowlisted (re-run after harness upgrades).')
  } else {
    console.log(`\npatched ${changed} file(s). Restart dsh for the card to render.`)
  }
  if (skipped > 0) process.exitCode = 2
}

// --- tiny fs helpers to keep this dependency-free ---
import { statSync, readdirSync } from 'node:fs'
function _isDirectory(p) { try { return statSync(p).isDirectory() } catch { return false } }
function _readdir(p) { try { return readdirSync(p) } catch { return [] } }

if (import.meta.url === `file://${process.argv[1]}`) main()
