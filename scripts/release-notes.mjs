/**
 * Generate GitHub release notes for dsh-plugin-tavily.
 *
 * Usage:
 *   node scripts/release-notes.mjs [since-ref] [current-tag]
 *
 *   since-ref    previous tag (exclusive); omit to include the full history
 *                (first release).
 *   current-tag  the tag this release describes, used in the install hint;
 *                falls back to `main` (i.e. after the first release, the
 *                recommended pin is the new tag, not the previous one).
 *
 * Groups commit subjects by conventional-commit prefix and prints markdown
 * to stdout.
 *
 * Usage (in CI):
 *   PREV=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || true)
 *   node scripts/release-notes.mjs "$PREV" "v$VERSION" > /tmp/notes.md
 */
import { execSync } from 'node:child_process'

const since = process.argv[2]?.trim() || ''
const currentTag = process.argv[3]?.trim() || ''
const range = since ? `${since}..HEAD` : 'HEAD'

const subjects = execSync(`git log --pretty=format:%s ${range}`, { encoding: 'utf8' })
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)

const GROUPS = [
  ['feat', '✨ Features'],
  ['fix', '🐛 Bug fixes'],
  ['perf', '⚡ Performance'],
  ['docs', '📚 Docs'],
  ['ci', '🔧 CI / build'],
  ['refactor', '♻️ Refactor'],
  ['test', '🧪 Tests'],
  ['chore', '🔩 Chores'],
]

const byType = new Map()
const other = []
const breaking = []

for (const subject of subjects) {
  const m = /^([a-z]+)(\([^)]*\))?(!)?:\s+(.*)$/.exec(subject)
  if (m && m[3]) breaking.push(subject)
  if (m) {
    const list = byType.get(m[1]) ?? []
    list.push(subject)
    byType.set(m[1], list)
  } else {
    other.push(subject)
  }
}

const lines = []
if (breaking.length) {
  lines.push('## 💥 Breaking changes', '')
  lines.push(...breaking.map((s) => `- ${s}`), '')
}
for (const [type, label] of GROUPS) {
  const list = byType.get(type)
  if (!list?.length) continue
  lines.push(`## ${label}`, '')
  lines.push(...list.map((s) => `- ${s}`), '')
}
if (other.length) {
  lines.push('## 🔩 Other', '')
  lines.push(...other.map((s) => `- ${s}`), '')
}
if (!lines.length) {
  lines.push('_No notable changes captured._')
}

lines.push(
  '',
  '---',
  '',
  '### Install / update',
  '',
  '```sh',
  `dsh plugin --profile web add "github:1624318455/dsh-plugin-tavily#${currentTag || 'main'}"`,
  '```',
  '',
  '**Have a feature request or hit a bug?** Open an issue: https://github.com/1624318455/dsh-plugin-tavily/issues',
)
if (range !== 'HEAD') {
  lines.push('', `_Commits in this release: \`${range}\`._`)
}

process.stdout.write(lines.join('\n') + '\n')