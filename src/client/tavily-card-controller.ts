/**
 * The Tavily card's staged form over the `web-search-tavily` settings namespace.
 *
 * The card now exposes the full professional parameter set: the key, the API
 * base URL, and an advanced `<details>` block with `maxResults`, `searchDepth`,
 * `topic`, `includeAnswer`, `includeRawContent`, `timeout`, and `days`.
 *
 * Priority contract:
 *
 *   1. Fields present in the composition layer (`cordis.patch.yml` config) are
 *      pinned: the card renders them from `base`, disables them, and shows a
 *      "covered by config file" badge. The host re-applies the entry over the
 *      WebUI value, so a stale UI override cannot shadow the yaml.
 *   2. Fields the user saved in the WebUI layer render from `user` and show the
 *      normal overridden badge with a reset affordance.
 *   3. Untouched fields render empty (or their visible checkbox default) so
 *      placeholders can advertise the code defaults.
 *
 * The key is the one control that does not live in the section: its literal
 * never rides a response, so the card learns only whether one is configured
 * and writes it through the credentials domain, addressed by the reference the
 * section names. It is still staged with the rest of the form, so one save
 * covers everything the card shows.
 */

import type { IApiClient } from '@deepseek-ai/dsh-client-connection/client'
import type { SettingsScope, SettingsScopeSnapshot, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import {
  booleanField, CardForm, numberField, selectField, textField,
  type CardActions, type CardFieldState, type CardShell,
} from './card-form.ts'

/**
 * Namespace of the Tavily search provider. Spelled here rather than
 * imported: a client package must not depend on a Host package.
 */
export const TAVILY_NS = 'web-search-tavily'

/** Credential reference the provider resolves when the section names none. */
const DEFAULT_API_KEY_REF = 'TAVILY_API_KEY'

/** Default endpoint mirror; the card cannot import the Host package. */
const DEFAULT_BASE_URL = 'https://api.tavily.com'

/** Form field the credential control stages under. */
const API_KEY_FIELD = 'apiKey'

/** The search-provider fields this card edits. */
export interface TavilySettings {
  /** Credential reference naming the environment key. */
  apiKeyEnv?: string
  /** Provider endpoint; blank inherits the provider default. */
  baseURL?: string
  /** Search depth sent as Tavily's `search_depth`. */
  searchDepth?: 'basic' | 'advanced'
  /** Topic sent as Tavily's `topic`. */
  topic?: 'general' | 'news' | 'finance'
  /** Recency window in days (news/finance topics). */
  days?: number
  /** Whether to request Tavily's generated answer. */
  includeAnswer?: boolean
  /** Whether to request Tavily raw page content. */
  includeRawContent?: boolean
  /** Request timeout in milliseconds. */
  timeout?: number
  /** Default result count when a request carries no `maxResults`. */
  maxResults?: number
}

/** Result of the card's browser-side API connectivity test. */
export interface TavilyApiTestState {
  status: 'idle' | 'testing' | 'success' | 'error'
  /** Error detail when `status` is `error`; empty otherwise. */
  detail: string
}

/** What the credentials domain last reported, and for which reference. */
interface CredentialState {
  /** Reference this answer describes; a stale response for another one is dropped. */
  ref: string
  /** Whether any layer supplies a value for it. */
  configured: boolean
  /** Whether `credentials.set` can affect it; false disables the control. */
  writable: boolean
}

/** What the Tavily card renders. */
export interface TavilyCardState extends CardShell {
  /** API endpoint base. */
  baseURL: CardFieldState
  /** Search depth. */
  searchDepth: CardFieldState
  /** Search topic. */
  topic: CardFieldState
  /** Default result count. */
  maxResults: CardFieldState
  /** Recency window in days. */
  days: CardFieldState
  /** Whether to include Tavily's generated answer. */
  includeAnswer: CardFieldState
  /** Whether to include raw page content. */
  includeRawContent: CardFieldState
  /** Request timeout in milliseconds. */
  timeout: CardFieldState
  /** The staged credential, which starts blank on every load. */
  apiKey: CardFieldState
  /** Whether the Host reports a credential configured for the referenced key. */
  apiKeyConfigured: boolean
  /** Whether the credentials domain accepts a write for it; false disables the control. */
  apiKeyWritable: boolean
  /** Last API connectivity test outcome. */
  apiTest: TavilyApiTestState
}

/** The registration-side face the Tavily card's slot entry injects. */
export interface TavilyCardFace extends CardActions {
  hooks: {
    /** Card snapshot bound by the renderer as useTavilyCard. */
    tavilyCard: SnapshotStore<TavilyCardState>
  }
  /** Run a lightweight connectivity test against Tavily with the drafts currently on screen. */
  testApi: () => void
}

/** Bridges the `web-search-tavily` scope and the credentials domain onto the card. */
export class TavilyCardController {
  private readonly form: CardForm<TavilySettings>
  private readonly store: SnapshotStore<TavilyCardState>
  private credential: CredentialState = { ref: '', configured: false, writable: true }
  private apiTest: TavilyApiTestState = { status: 'idle', detail: '' }

  /**
   * @param scope - the bound settings scope for the `web-search-tavily` namespace.
   * @param api - wire face used for the credential the section references.
   */
  constructor(
    private readonly scope: SettingsScope<TavilySettings>,
    private readonly api: Pick<IApiClient, 'credentials'>,
  ) {
    this.form = new CardForm(
      scope,
      [
        textField('baseURL'),
        selectField('searchDepth', ['basic', 'advanced']),
        selectField('topic', ['general', 'news', 'finance']),
        numberField('maxResults', { min: 1, max: 20, integer: true, aliases: ['numResults'] }),
        numberField('days', { min: 1, integer: true }),
        booleanField('includeAnswer', true),
        booleanField('includeRawContent', false),
        numberField('timeout', { min: 1000, integer: true }),
      ],
      [{ field: API_KEY_FIELD, write: text => this.writeKey(text) }],
    )
    this.store = this.form.bind(() => this.projection())
    scope.subscribe(() => { void this.readCredential() })
    void this.readCredential()
  }

  private projection(): TavilyCardState {
    return {
      ...this.form.shell(),
      baseURL: this.form.field('baseURL'),
      searchDepth: this.form.field('searchDepth'),
      topic: this.form.field('topic'),
      maxResults: this.form.field('maxResults'),
      days: this.form.field('days'),
      includeAnswer: this.form.field('includeAnswer'),
      includeRawContent: this.form.field('includeRawContent'),
      timeout: this.form.field('timeout'),
      apiKey: this.form.field(API_KEY_FIELD),
      apiKeyConfigured: this.credential.configured,
      apiKeyWritable: this.credential.writable,
      apiTest: this.apiTest,
    }
  }

  /**
   * Ask the credentials domain about the reference the section currently names.
   *
   * The answer is stored with the reference it describes: `apiKeyEnv` can
   * change between the request and its response, and two reads can settle out
   * of order, so a response is published only while it still answers for the
   * reference in force.
   */
  private async readCredential(): Promise<void> {
    const ref = refOf(this.scope.getSnapshot())
    if (ref !== this.credential.ref) {
      // A new reference knows nothing yet; keeping the old answer would claim
      // the key is configured under a name nobody has checked.
      this.credential = { ref, configured: false, writable: true }
      this.store.set(this.projection())
    }
    let response: Awaited<ReturnType<IApiClient['credentials']['describe']>>
    try {
      response = await this.api.credentials.describe({ refs: [ref] })
    } catch (_credentialReadFailure) {
      // The card stays usable without this: the key control simply reports the
      // last state it knew, and a write still reaches the Host.
      return
    }
    if (!response.result.ok || ref !== refOf(this.scope.getSnapshot())) return
    const view = response.result.value.credentials[ref]
    const next: CredentialState = {
      ref,
      configured: view?.configured ?? false,
      // An unknown reference is treated as writable: the control stays usable
      // and the Host is what refuses, rather than the card guessing a refusal.
      writable: view?.writable ?? true,
    }
    if (next.configured === this.credential.configured && next.writable === this.credential.writable) return
    this.credential = next
    this.store.set(this.projection())
  }

  /**
   * Re-read after the Host reports a change to the reference this card watches.
   *
   * A key can be written from somewhere else and the settings section does not
   * change when it is, so without this the badge keeps reporting a state the
   * Host already replaced.
   * @param ref - the reference the Host reports as changed.
   */
  refreshCredential(ref: string): void {
    if (ref !== this.credential.ref) return
    void this.readCredential()
  }

  /**
   * Build the face the card's slot registration injects.
   * @returns the card's snapshot and its form actions.
   */
  inject(): TavilyCardFace {
    return {
      hooks: { tavilyCard: this.store },
      ...this.form.actions(),
      testApi: () => { void this.runApiTest() },
    }
  }

  /**
   * Run a lightweight browser-side connectivity test using the values currently
   * on screen. A stored key cannot be read back from the credentials service by
   * design, so testing an already-configured key requires re-entering it.
   */
  private async runApiTest(): Promise<void> {
    const key = this.form.field(API_KEY_FIELD).text.trim()
    if (key === '') {
      this.apiTest = { status: 'error', detail: 'need-key' }
      this.store.set(this.projection())
      return
    }
    const baseURL = this.form.field('baseURL').text.trim() || DEFAULT_BASE_URL
    this.apiTest = { status: 'testing', detail: '' }
    this.store.set(this.projection())
    try {
      const response = await fetch(`${baseURL}/search`, {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${key}`,
          'content-type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          query: 'connectivity test',
          max_results: 1,
          search_depth: 'basic',
          topic: 'general',
          include_answer: false,
        }),
      })
      if (!response.ok) {
        let detail = `HTTP ${response.status}`
        try {
          const body = await response.json() as { detail?: { error?: string }; error?: string; message?: string }
          detail = body.detail?.error ?? body.error ?? body.message ?? detail
        } catch (_errorBodyReadFailure) {
          // Keep the HTTP status detail.
        }
        throw new Error(detail)
      }
      this.apiTest = { status: 'success', detail: '' }
    } catch (error: unknown) {
      this.apiTest = {
        status: 'error',
        detail: error instanceof Error ? error.message : String(error),
      }
    }
    this.store.set(this.projection())
  }

  /**
   * Write the staged key, then re-read whether the Host now holds one.
   * @param value - the staged credential literal.
   * @returns whether the Host reports a configured credential afterwards.
   */
  private async writeKey(value: string): Promise<boolean> {
    try {
      await this.api.credentials.set({ ref: refOf(this.scope.getSnapshot()), value })
    } catch (_credentialWriteFailure) {
      // Refusals surface through the re-read below: the Host is the only
      // authority on whether the key now exists.
    }
    await this.readCredential()
    return this.credential.configured
  }
}

/**
 * The credential reference the section names, or the provider's default.
 * @param snapshot - the current scope snapshot.
 * @returns the reference to address.
 */
function refOf(snapshot: SettingsScopeSnapshot<TavilySettings>): string {
  const declared = snapshot.value?.apiKeyEnv
  return declared !== undefined && declared.length > 0 ? declared : DEFAULT_API_KEY_REF
}