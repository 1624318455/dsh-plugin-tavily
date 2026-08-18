/**
 * Hand-written controls for the Tavily card. Each renders one field's label,
 * its staged text, whether saving would leave an override, whether the field is
 * pinned by the configuration file, and — when useful — the reset that stages a
 * clear back to the composition layer. Nothing here writes: a control reports
 * what the user typed, and the card's save is the single point where a draft
 * becomes a document mutation.
 */

/** What every field control needs regardless of its value type. */
export interface FieldProps {
  /** Stable id associating the label with its control. */
  id: string
  /** Visible label. */
  label: string
  /** One-line explanation rendered under the control. */
  hint: string
  /** Draft text this control renders. */
  text: string
  /** True when saving would leave a user-layer entry for this field. */
  overridden: boolean
  /** True when the field is pinned by the composition/yaml layer. */
  configCovered: boolean
  /** True when the draft is not a value this field accepts. */
  invalid: boolean
  /** Copy for the overridden badge. */
  overriddenLabel: string
  /** Copy for the configuration-covered badge / notice. */
  configCoveredLabel: string
  /** Copy for the reset control. */
  resetLabel: string
  /** Copy shown in place of the hint while the draft is invalid. */
  invalidLabel: string
  /** Disables every control (read-only document, or an unavailable namespace). */
  disabled: boolean
  /** Stage draft text. */
  onEdit: (text: string) => void
  /** Stage a clear so the field re-inherits the composition layer. */
  onReset: () => void
}

/**
 * A staged value field. `numeric` only hints the keypad: which drafts a field
 * accepts is decided by its spec, so the control never silently rewrites what
 * the user typed.
 * @param props - the field's copy, its staged text, and the edit actions.
 * @returns the labelled control.
 */
export function ValueField(props: FieldProps & {
  /** Hints a numeric keypad without narrowing what the control accepts. */
  numeric?: boolean
  /** Placeholder shown while the draft is empty. */
  placeholder?: string
}) {
  const disabled = props.disabled || props.configCovered
  return (
    <div className={props.configCovered ? 'dsh-tavily-field dsh-tavily-covered' : 'dsh-tavily-field'}>
      <div className="dsh-tavily-head">
        <label className="dsh-tavily-label" htmlFor={props.id}>{props.label}</label>
        {props.configCovered
          ? <span className="dsh-tavily-badges"><span className="dsh-tavily-badge dsh-tavily-badge-config">{props.configCoveredLabel}</span></span>
          : props.overridden
            ? (
              <span className="dsh-tavily-badges">
                <span className="dsh-tavily-badge">{props.overriddenLabel}</span>
                <button
                  type="button"
                  className="dsh-tavily-reset"
                  disabled={disabled}
                  onClick={props.onReset}
                >
                  {props.resetLabel}
                </button>
              </span>
            )
            : null}
      </div>
      <input
        id={props.id}
        className={props.invalid ? 'dsh-tavily-input dsh-tavily-input-invalid' : 'dsh-tavily-input'}
        type="text"
        {...props.numeric === true ? { inputMode: 'numeric' as const } : {}}
        {...props.invalid ? { 'aria-invalid': true } : {}}
        value={props.text}
        placeholder={props.placeholder ?? ''}
        disabled={disabled}
        onChange={(event) => { props.onEdit(event.target.value) }}
      />
      <p className={props.configCovered ? 'dsh-tavily-config-covered' : props.invalid ? 'dsh-tavily-invalid' : 'dsh-tavily-hint'}>
        {props.configCovered ? props.configCoveredLabel : props.invalid ? props.invalidLabel : props.hint}
      </p>
    </div>
  )
}

/**
 * A staged single-choice field. The first option is empty so an untouched field
 * shows its placeholder/default; selecting it again stages a clear.
 * @param props - the field's copy, options, staged value, and edit actions.
 * @returns the labelled control.
 */
export function SelectField(props: FieldProps & {
  /** Values and their visible labels. */
  options: ReadonlyArray<{ value: string; label: string }>
  /** Placeholder shown while no value is staged/stored. */
  placeholder?: string
}) {
  const disabled = props.disabled || props.configCovered
  return (
    <div className={props.configCovered ? 'dsh-tavily-field dsh-tavily-covered' : 'dsh-tavily-field'}>
      <div className="dsh-tavily-head">
        <label className="dsh-tavily-label" htmlFor={props.id}>{props.label}</label>
        {props.configCovered
          ? <span className="dsh-tavily-badges"><span className="dsh-tavily-badge dsh-tavily-badge-config">{props.configCoveredLabel}</span></span>
          : props.overridden
            ? (
              <span className="dsh-tavily-badges">
                <span className="dsh-tavily-badge">{props.overriddenLabel}</span>
                <button
                  type="button"
                  className="dsh-tavily-reset"
                  disabled={disabled}
                  onClick={props.onReset}
                >
                  {props.resetLabel}
                </button>
              </span>
            )
            : null}
      </div>
      <select
        id={props.id}
        className={props.invalid ? 'dsh-tavily-input dsh-tavily-input-invalid dsh-tavily-select' : 'dsh-tavily-input dsh-tavily-select'}
        value={props.text}
        disabled={disabled}
        onChange={(event) => { props.onEdit(event.target.value) }}
      >
        <option value="">{props.placeholder ?? ''}</option>
        {props.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <p className={props.configCovered ? 'dsh-tavily-config-covered' : props.invalid ? 'dsh-tavily-invalid' : 'dsh-tavily-hint'}>
        {props.configCovered ? props.configCoveredLabel : props.invalid ? props.invalidLabel : props.hint}
      </p>
    </div>
  )
}

/**
 * A staged boolean field rendered as a checkbox. The visible default is driven
 * by the form spec's fallback, so a switch that defaults to `true` shows as
 * checked before any user interaction.
 * @param props - the field's copy, checked state, and edit actions.
 * @returns the labelled control.
 */
export function CheckField(props: Pick<FieldProps,
  | 'id' | 'label' | 'hint' | 'text' | 'overridden' | 'configCovered'
  | 'configCoveredLabel' | 'disabled' | 'overriddenLabel' | 'resetLabel' | 'onReset'
> & {
  /** Stage a new boolean draft. */
  onEdit: (text: string) => void
}) {
  const disabled = props.disabled || props.configCovered
  const checked = props.text === 'true'
  return (
    <div className={props.configCovered ? 'dsh-tavily-field dsh-tavily-covered' : 'dsh-tavily-field'}>
      <div className="dsh-tavily-head">
        <label className="dsh-tavily-label" htmlFor={props.id}>{props.label}</label>
        {props.configCovered
          ? <span className="dsh-tavily-badges"><span className="dsh-tavily-badge dsh-tavily-badge-config">{props.configCoveredLabel}</span></span>
          : props.overridden
            ? (
              <span className="dsh-tavily-badges">
                <span className="dsh-tavily-badge">{props.overriddenLabel}</span>
                <button
                  type="button"
                  className="dsh-tavily-reset"
                  disabled={disabled}
                  onClick={props.onReset}
                >
                  {props.resetLabel}
                </button>
              </span>
            )
            : null}
      </div>
      <span className="dsh-tavily-check">
        <input
          id={props.id}
          className="dsh-tavily-checkbox"
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => { props.onEdit(String(event.target.checked)) }}
        />
        <span className="dsh-tavily-check-copy">{props.hint}</span>
      </span>
      {props.configCovered ? <p className="dsh-tavily-config-covered">{props.configCoveredLabel}</p> : null}
    </div>
  )
}

/**
 * A write-only credential control. The value never rides a response, so the
 * control reports only whether one is configured and starts blank; a blank
 * draft writes nothing, which keeps the stored key rather than clearing it.
 * @param props - the field's copy, its staged text, and the configured state.
 * @returns the labelled control.
 */
export function SecretField(props: Pick<FieldProps, 'id' | 'label' | 'hint' | 'text' | 'disabled' | 'onEdit'> & {
  /** Whether the Host reports a configured credential for this reference. */
  configured: boolean
  /** Copy describing the configured state. */
  stateLabel: string
}) {
  return (
    <div className="dsh-tavily-field">
      <div className="dsh-tavily-head">
        <label className="dsh-tavily-label" htmlFor={props.id}>{props.label}</label>
        <span className="dsh-tavily-badges">
          <span className={props.configured ? 'dsh-tavily-badge' : 'dsh-tavily-badge-muted'}>{props.stateLabel}</span>
        </span>
      </div>
      <input
        id={props.id}
        className="dsh-tavily-input"
        type="password"
        autoComplete="off"
        value={props.text}
        disabled={props.disabled}
        onChange={(event) => { props.onEdit(event.target.value) }}
      />
      <p className="dsh-tavily-hint">{props.hint}</p>
    </div>
  )
}