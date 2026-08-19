/**
 * Shared form model behind the Tavily plugin card.
 *
 * A card stages what the user types and writes it only when they save. Each
 * settings write is a durable, revision-fenced document mutation, so a control
 * that committed as it settled turned one edit into a write the user never
 * asked for and could not preview; staged text makes what is on screen exactly
 * what a save would store.
 *
 * A field shows its effective value — unless the composition layer pins it. The
 * card deliberately implements the plugin's priority contract:
 *
 *   yaml/composition entry (`base`) > WebUI user layer > code default
 *
 * A field present in the composition `base` is rendered from that value and
 * disabled, because the plugin host re-applies the entry over any WebUI value.
 * A field present in the user layer is marked overridden. A field present in
 * neither is rendered empty (or as its visible checkbox default) so the
 * placeholder can advertise the code default.
 *
 * Self-contained: this plugin's client bundle cannot import the settings
 * shell's internals (client bundle purity gate), so the staged-form model the
 * product's cards share is mirrored here at the size this card needs.
 */

import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** The write one field's staged text performs when the card is saved. */
export type FieldWrite =
  | { kind: 'set'; value: unknown }
  | { kind: 'clear' }

/** How one section field converts between its stored value and its draft text. */
export interface CardFieldSpec {
  /** Field name inside the namespace section. */
  field: string
  /** Render a stored value as draft text; the empty string when the section carries none. */
  format: (value: unknown) => string
  /**
   * The write this draft text stages, or undefined when the text is not a
   * value this field accepts — which blocks the save rather than discarding it.
   */
  parse: (text: string) => FieldWrite | undefined
  /**
   * Value rendered when neither the composition layer nor the user layer
   * carries the field. Used by checkboxes so a default like `includeAnswer:
   * true` is visible before any user interaction; leave undefined for blank
   * fields whose placeholder advertises the default.
   */
  fallback?: unknown
  /**
   * Legacy field names that should behave as the same logical value. Used for
   * `maxResults` ← `numResults`: a yaml/UI value stored under an alias still
   * pins or overrides the displayed field, and reset clears every alias so old
   * overrides cannot resurrect after a migration.
   */
  aliases?: readonly string[]
}

/**
 * A control whose value is written outside the settings section. A credential
 * literal never rides a response, so its draft has nothing to seed from: it is
 * blank until typed, and a blank draft writes nothing.
 */
export interface CardSecretSpec {
  /** Field name addressing this control inside the card's form. */
  field: string
  /** Write the staged text; resolves to whether the Host accepted it. */
  write: (text: string) => Promise<boolean>
}

/** One field as a card's control renders it. */
export interface CardFieldState {
  /** Draft text the control renders. */
  text: string
  /**
   * Whether saving would leave a user-layer entry for this field. A staged
   * edit answers for itself, so the badge previews the save rather than
   * reporting a state the pending edit already contradicts.
   */
  overridden: boolean
  /**
   * Whether the field is pinned by the composition layer (yaml config). Such
   * fields are disabled and show a dedicated badge; WebUI edits cannot override
   * them.
   */
  configCovered: boolean
  /** Whether the draft is not a value this field accepts, which blocks saving. */
  invalid: boolean
}

/** Form state every plugin card shares. */
export interface CardShell {
  /** False while the namespace is not served to this client; the card renders nothing. */
  available: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  /** Whether the form holds edits that a save would write. */
  dirty: boolean
  /** Whether any staged draft is invalid, which blocks the save. */
  invalid: boolean
  /** Whether a save is crossing the wire. */
  saving: boolean
  /** Whether the last save did not land as staged; cleared by the next edit or save. */
  failed: boolean
}

/** The write actions every plugin card's slot entry injects. */
export interface CardActions {
  /** Stage draft text for one field. */
  edit: (field: string, text: string) => void
  /** Stage a clear, so saving lets the field re-inherit the composition layer. */
  resetField: (field: string) => void
  /** Write every staged edit, then re-seed from what the Host accepted. */
  save: () => void
  /** Drop every staged edit. */
  discard: () => void
}

/** One field's staged edit. */
interface StagedEdit {
  /** Draft text the control renders. */
  text: string
  /** True when this edit clears the field whatever text it shows. */
  clear: boolean
}

/** One staged edit resolved into the write a save performs. */
interface PlannedWrite {
  /** Field this entry writes. */
  field: string
  /**
   * Perform the write and report whether the Host holds the staged value
   * afterwards; undefined when the draft is not a value the field accepts.
   */
  run: (() => Promise<boolean>) | undefined
}

/** Constraints a numeric field can enforce before a save is offered. */
export interface NumberFieldOptions {
  /** Inclusive lower bound. */
  min?: number
  /** Inclusive upper bound. */
  max?: number
  /** Require a whole number. */
  integer?: boolean
  /** Legacy field names this numeric field should alias. */
  aliases?: readonly string[]
}

/**
 * A whole-number field. An empty draft clears the field; any other draft that
 * is not an accepted number blocks the save. Optional constraints are checked
 * in the same place scope validation would reject them, so the card does not
 * stage a write it knows the Host will refuse.
 * @param field - field name inside the namespace section.
 * @param options - optional bounds/integer requirement.
 * @returns the field's conversion spec.
 */
export function numberField(field: string, options: NumberFieldOptions = {}): CardFieldSpec {
  return {
    field,
    // A section that carries no number for this field renders empty rather
    // than as a value nobody chose.
    format: value => typeof value === 'number' ? String(value) : '',
    parse: (text) => {
      const trimmed = text.trim()
      if (trimmed === '') return { kind: 'clear' }
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed)) return undefined
      if (options.integer === true && !Number.isInteger(parsed)) return undefined
      if (options.min !== undefined && parsed < options.min) return undefined
      if (options.max !== undefined && parsed > options.max) return undefined
      return { kind: 'set', value: parsed }
    },
    aliases: options.aliases,
  }
}

/**
 * A plain text field. An empty/whitespace-only draft clears the field so it
 * re-inherits the code default.
 * @param field - field name inside the namespace section.
 * @returns the field's conversion spec.
 */
export function textField(field: string): CardFieldSpec {
  return {
    field,
    format: value => typeof value === 'string' ? value : '',
    parse: (text) => {
      const trimmed = text.trim()
      return trimmed === '' ? { kind: 'clear' } : { kind: 'set', value: trimmed }
    },
  }
}

/**
 * A single-choice field rendered by a select. An empty draft clears the field.
 * @param field - field name inside the namespace section.
 * @param allowed - the values the schema accepts.
 * @returns the field's conversion spec.
 */
export function selectField(field: string, allowed: readonly string[]): CardFieldSpec {
  return {
    field,
    format: value => typeof value === 'string' && allowed.includes(value) ? value : '',
    parse: (text) => {
      if (text === '') return { kind: 'clear' }
      return allowed.includes(text) ? { kind: 'set', value: text } : undefined
    },
  }
}

/**
 * A boolean field rendered by a checkbox. The fallback makes the code default
 * visible before a user stores their own choice.
 * @param field - field name inside the namespace section.
 * @param fallback - the code-level default value.
 * @returns the field's conversion spec.
 */
export function booleanField(field: string, fallback: boolean): CardFieldSpec {
  return {
    field,
    format: value => typeof value === 'boolean' ? String(value) : '',
    parse: (text) => {
      if (text === 'true') return { kind: 'set', value: true }
      if (text === 'false') return { kind: 'set', value: false }
      return undefined
    },
    fallback,
  }
}

/**
 * A multi-value string field (e.g. domain lists) rendered as one comma- or
 * whitespace-separated text input. The stored value is a `string[]`; an empty
 * draft clears the field so it re-inherits the code default.
 * @param field - field name inside the namespace section.
 * @returns the field's conversion spec.
 */
export function listField(field: string): CardFieldSpec {
  return {
    field,
    format: value => Array.isArray(value) ? value.join(', ') : '',
    parse: (text) => {
      const tokens = text.split(/[\s,]+/u).map(token => token.trim()).filter(Boolean)
      return tokens.length === 0 ? { kind: 'clear' } : { kind: 'set', value: tokens }
    },
  }
}

/**
 * A field that accepts a boolean OR a fixed set of strings, rendered as a
 * select. `false`/`true` store booleans; any other accepted token stores its
 * string value (e.g. `advanced`, `markdown`). An empty selection clears the
 * field so it re-inherits the code default.
 * @param field - field name inside the namespace section.
 * @param tokens - the non-boolean string values the schema also accepts.
 * @returns the field's conversion spec.
 */
export function valueSelectField(field: string, tokens: readonly string[]): CardFieldSpec {
  return {
    field,
    format: value => {
      if (typeof value === 'boolean') return value ? 'true' : 'false'
      return typeof value === 'string' && tokens.includes(value) ? value : ''
    },
    parse: (text) => {
      if (text === '') return { kind: 'clear' }
      if (text === 'false') return { kind: 'set', value: false }
      if (text === 'true') return { kind: 'set', value: true }
      return tokens.includes(text) ? { kind: 'set', value: text } : undefined
    },
  }
}

/**
 * Stages one card's edits over one settings namespace and writes them on save.
 *
 * The form publishes through a snapshot store because slot components read
 * through a snapshot selector, while both the scope and the local drafts
 * change underneath; every projection is rebuilt from the two together.
 */
export class CardForm<T> {
  private readonly specs: Map<string, CardFieldSpec>
  private readonly secretSpecs: Map<string, CardSecretSpec>
  private readonly staged = new Map<string, StagedEdit>()
  private readonly listeners = new Set<() => void>()
  private saving = false
  private failed = false

  /**
   * @param scope - the bound settings scope for this card's namespace.
   * @param specs - the section fields this card edits.
   * @param secrets - the card's write-only controls, written outside the section.
   */
  constructor(
    private readonly scope: SettingsScope<T>,
    specs: CardFieldSpec[],
    secrets: CardSecretSpec[] = [],
  ) {
    this.specs = new Map(specs.map(spec => [spec.field, spec]))
    this.secretSpecs = new Map(secrets.map(spec => [spec.field, spec]))
    scope.subscribe(() => { this.publish() })
  }

  /**
   * Publish a projection of this form, rebuilt whenever the scope or a draft changes.
   * @param project - build the card's state from the form's current reads.
   * @returns the store the card's component reads through its bound selector.
   */
  bind<S>(project: () => S): SnapshotStore<S> {
    const store = createSnapshotStore(project())
    this.listeners.add(() => { store.set(project()) })
    return store
  }

  /**
   * Read the card-level state: what the Host serves, and what a save would do.
   * @returns the form state every card shares.
   */
  shell(): CardShell {
    const snapshot = this.scope.getSnapshot()
    const plan = this.plan()
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      dirty: plan.length > 0,
      invalid: plan.some(item => item.run === undefined),
      saving: this.saving,
      failed: this.failed,
    }
  }

  /**
   * Read one control's state.
   * @param field - field name of a section field or of a write-only control.
   * @returns the draft text and the badges/blocking flags a control renders.
   */
  field(field: string): CardFieldState {
    const staged = this.staged.get(field)
    if (this.secretSpecs.has(field)) {
      return { text: staged?.text ?? '', overridden: false, configCovered: false, invalid: false }
    }
    const spec = this.spec(field)
    if (staged === undefined) {
      if (this.storedBase(field)) {
        return {
          text: spec.format(this.baseValue(field)),
          overridden: false,
          configCovered: true,
          invalid: false,
        }
      }
      if (this.stored(field)) {
        return {
          text: spec.format(this.userValue(field)),
          overridden: true,
          configCovered: false,
          invalid: false,
        }
      }
      return {
        text: spec.fallback !== undefined ? spec.format(spec.fallback) : '',
        overridden: false,
        configCovered: false,
        invalid: false,
      }
    }
    const write = staged.clear ? { kind: 'clear' as const } : spec.parse(staged.text)
    return {
      text: staged.text,
      overridden: write?.kind === 'set',
      configCovered: false,
      invalid: write === undefined,
    }
  }

  /**
   * Build the edit, reset, save, and discard actions bound to this form.
   * @returns the actions a card's slot entry injects.
   */
  actions(): CardActions {
    return {
      edit: (field, text) => { this.stage(field, { text, clear: false }) },
      resetField: (field) => {
        const spec = this.spec(field)
        const resetValue = this.baseValue(field) ?? spec.fallback
        this.stage(field, { text: spec.format(resetValue), clear: true })
      },
      save: () => { void this.save() },
      discard: () => {
        if (this.staged.size === 0 && !this.failed) return
        this.staged.clear()
        this.failed = false
        this.publish()
      },
    }
  }

  /**
   * Write every staged edit, then re-seed from what the Host accepted.
   *
   * The Host is the only authority on whether a value was accepted — its
   * validators own the constraints no schema can express — so the outcome is
   * read back from the section rather than predicted here. A save that did not
   * land keeps its drafts, so the user can correct them instead of retyping.
   * @returns settlement after every write and the read-back.
   */
  async save(): Promise<void> {
    const plan = this.plan()
    const writes = plan.flatMap(item => item.run === undefined ? [] : [item.run])
    if (plan.length === 0 || this.saving || writes.length !== plan.length) return
    this.saving = true
    this.failed = false
    this.publish()
    let landed = true
    for (const write of writes) {
      landed = await write() && landed
    }
    if (landed) this.staged.clear()
    this.saving = false
    this.failed = !landed
    this.publish()
  }

  /**
   * Every staged edit a save would write. An entry whose draft is not a value
   * its field accepts carries no write: the form is still dirty, and the save
   * refuses rather than dropping the edit.
   * @returns the planned writes, in the order the fields were staged.
   */
  private plan(): PlannedWrite[] {
    const plan: PlannedWrite[] = []
    for (const [field, staged] of this.staged) {
      const secret = this.secretSpecs.get(field)
      if (secret !== undefined) {
        const value = staged.text.trim()
        if (value !== '') plan.push({ field, run: () => secret.write(value) })
        continue
      }
      const spec = this.spec(field)
      if (staged.clear) {
        if (this.stored(field)) plan.push({ field, run: () => this.clear(field) })
        continue
      }
      if (staged.text === spec.format(this.sectionValue(field))) continue
      const write = spec.parse(staged.text)
      if (write === undefined) plan.push({ field, run: undefined })
      else if (write.kind === 'clear') plan.push({ field, run: () => this.clear(field) })
      else plan.push({ field, run: () => this.store(field, write.value) })
    }
    return plan
  }

  private async clear(field: string): Promise<boolean> {
    const user = this.userLayer() ?? {}
    for (const name of this.allNames(field)) {
      if (Object.hasOwn(user, name)) await this.scope.unset(name)
    }
    const remaining = this.userLayer() ?? {}
    return !this.allNames(field).some(name => Object.hasOwn(remaining, name))
  }

  private async store(field: string, value: unknown): Promise<boolean> {
    await this.scope.set(field, value)
    return this.userLayer()?.[field] === value
  }

  private stage(field: string, edit: StagedEdit): void {
    this.staged.set(field, edit)
    this.failed = false
    this.publish()
  }

  private spec(field: string): CardFieldSpec {
    const spec = this.specs.get(field)
    // Every call site names a field this card declared; a missing one is a
    // wiring mistake that must not degrade into a silently inert control.
    if (spec === undefined) throw new Error(`plugin card has no field ${field}`)
    return spec
  }

  private snapshotOf(): SettingsScopeSnapshot<T> {
    return this.scope.getSnapshot()
  }

  private sectionValue(field: string): unknown {
    return (this.snapshotOf().value as Record<string, unknown> | undefined)?.[field]
  }

  private allNames(field: string): string[] {
    return [field, ...(this.spec(field).aliases ?? [])]
  }

  private baseValue(field: string): unknown {
    const base = this.snapshotOf().base as Record<string, unknown> | undefined
    if (base === undefined) return undefined
    for (const name of this.allNames(field)) {
      if (Object.hasOwn(base, name)) return base[name]
    }
    return undefined
  }

  private userLayer(): Record<string, unknown> | undefined {
    return this.snapshotOf().user as Record<string, unknown> | undefined
  }

  private userValue(field: string): unknown {
    const user = this.userLayer()
    if (user === undefined) return undefined
    for (const name of this.allNames(field)) {
      if (Object.hasOwn(user, name)) return user[name]
    }
    return undefined
  }

  private stored(field: string): boolean {
    const user = this.userLayer()
    return user !== undefined && this.allNames(field).some(name => Object.hasOwn(user, name))
  }

  private storedBase(field: string): boolean {
    const base = this.snapshotOf().base as Record<string, unknown> | undefined
    return base !== undefined && this.allNames(field).some(name => Object.hasOwn(base, name))
  }

  private publish(): void {
    for (const listener of this.listeners) listener()
  }
}