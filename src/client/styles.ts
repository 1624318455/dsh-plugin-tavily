/**
 * Tavily card styles. The product card chrome lives in the settings shell,
 * whose CSS-modules helper is not available to this standalone bundle, so the
 * card injects its own `<style>` tag (one per document, removed on dispose).
 * Class names are prefixed `dsh-tavily-` and values use the `--dsw-*` tokens
 * the web theme provides, so the card inherits the active light/dark theme.
 */

/** Stable id carried by the injected tag; re-injection is idempotent. */
const TAG_ID = 'dsh-plugin-tavily-card'

const CSS = `
.dsh-tavily-card {
  list-style: none;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-3);
  transition: border-color .16s, background .16s;
}
.dsh-tavily-card:hover { border-color: var(--dsw-alias-label-dimmed); }
.dsh-tavily-card.dsh-tavily-open {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-label-dimmed);
}
.dsh-tavily-header {
  width: 100%;
  appearance: none;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
}
.dsh-tavily-header:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
.dsh-tavily-head-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.dsh-tavily-name { font-size: 15px; font-weight: 600; line-height: 1.4; color: var(--dsw-alias-label-primary); }
.dsh-tavily-description { font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.dsh-tavily-chevron { flex: none; color: var(--dsw-alias-label-tertiary); transition: transform .16s; }
.dsh-tavily-chevron.dsh-tavily-open { transform: rotate(180deg); }
.dsh-tavily-pending {
  flex: none;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  line-height: 17px;
  font-weight: 500;
  white-space: nowrap;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
}
.dsh-tavily-body { border-top: 1px solid var(--dsw-alias-border-l2); margin: 0 16px; padding-bottom: 8px; }
.dsh-tavily-read-only { margin: 12px 0 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.dsh-tavily-field { display: flex; flex-direction: column; gap: 6px; padding: 12px 0; }
.dsh-tavily-field + .dsh-tavily-field { border-top: 1px solid var(--dsw-alias-border-l2); }
.dsh-tavily-field.dsh-tavily-covered { opacity: .72; }
.dsh-tavily-head { display: flex; align-items: center; gap: 8px; }
.dsh-tavily-label { flex: 1; min-width: 0; font-size: 13px; font-weight: 500; line-height: 1.5; color: var(--dsw-alias-label-primary); }
.dsh-tavily-badges { display: inline-flex; align-items: center; gap: 8px; }
.dsh-tavily-badge {
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  line-height: 17px;
  white-space: nowrap;
  font-weight: 500;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
}
.dsh-tavily-badge-config { background: var(--dsw-alias-bg-module-warning, var(--dsw-alias-bg-module-platform)); color: var(--dsw-alias-label-tertiary); }
.dsh-tavily-badge-muted { border-radius: 999px; padding: 1px 8px; font-size: 11px; line-height: 17px; white-space: nowrap; color: var(--dsw-alias-label-tertiary); }
.dsh-tavily-reset { border: none; background: none; padding: 0; font: inherit; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dsh-tavily-reset:hover:not(:disabled) { color: var(--dsw-alias-label-primary); }
.dsh-tavily-reset:disabled { cursor: default; }
.dsh-tavily-input {
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-3);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary);
}
.dsh-tavily-input:focus-visible { outline: none; border-color: var(--dsw-alias-brand-primary); }
.dsh-tavily-input:disabled { color: var(--dsw-alias-label-tertiary); cursor: default; }
.dsh-tavily-input-invalid { border-color: var(--dsw-alias-label-error); }
.dsh-tavily-select { height: 36px; }
.dsh-tavily-invalid { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-error); }
.dsh-tavily-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.dsh-tavily-config-covered { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); font-style: italic; }
.dsh-tavily-check { display: flex; align-items: flex-start; gap: 8px; }
.dsh-tavily-checkbox { margin: 2px 0 0; accent-color: var(--dsw-alias-brand-primary); }
.dsh-tavily-check-copy { font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.dsh-tavily-advanced {
  margin: 4px 0 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-3);
}
.dsh-tavily-advanced summary {
  cursor: pointer;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
  user-select: none;
}
.dsh-tavily-advanced summary:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; border-radius: 10px; }
.dsh-tavily-advanced[open] summary { border-bottom: 1px solid var(--dsw-alias-border-l2); }
.dsh-tavily-advanced .dsh-tavily-field { padding: 10px 12px; }
.dsh-tavily-test-area { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 12px 0; border-top: 1px solid var(--dsw-alias-border-l2); }
.dsh-tavily-test {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  padding: 5px 14px;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  background: none;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.dsh-tavily-test:hover:not(:disabled) { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-label-dimmed); }
.dsh-tavily-test:disabled { opacity: .4; cursor: default; }
.dsh-tavily-test:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dsh-tavily-test-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.dsh-tavily-test-success { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-success, var(--dsw-alias-label-primary)); }
.dsh-tavily-test-error { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-error); }
.dsh-tavily-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 12px 0 4px; border-top: 1px solid var(--dsw-alias-border-l2); }
.dsh-tavily-failed { flex: 1; min-width: 0; margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-error); }
.dsh-tavily-discard,
.dsh-tavily-save {
  appearance: none;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 5px 14px;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  cursor: pointer;
}
.dsh-tavily-discard { border-color: var(--dsw-alias-border-l2); background: none; color: var(--dsw-alias-label-secondary); }
.dsh-tavily-discard:hover:not(:disabled) { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-label-dimmed); }
.dsh-tavily-save { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-layer-3); }
.dsh-tavily-discard:disabled,
.dsh-tavily-save:disabled { opacity: 0.4; cursor: default; }
.dsh-tavily-discard:focus-visible,
.dsh-tavily-save:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
`

/**
 * Inject the card stylesheet once per document.
 * @returns a disposer removing the tag; safe to call repeatedly (no-op when the tag already stands).
 */
export function injectCardStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (document.querySelector(`style[data-plugin-css="${TAG_ID}"]`) !== null) return () => {}
  const tag = document.createElement('style')
  tag.dataset.plugin = TAG_ID
  tag.dataset.pluginCss = TAG_ID
  tag.textContent = CSS
  document.head.appendChild(tag)
  return () => { tag.remove() }
}