if (typeof window !== "undefined") window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-plugin-tavily",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		//#region src/client/fields.tsx
		/**
		* A staged value field. `numeric` only hints the keypad: which drafts a field
		* accepts is decided by its spec, so the control never silently rewrites what
		* the user typed.
		* @param props - the field's copy, its staged text, and the edit actions.
		* @returns the labelled control.
		*/
		function ValueField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-tavily-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-tavily-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: "dsh-tavily-label",
							htmlFor: props.id,
							children: props.label
						}), props.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-tavily-badges",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-tavily-badge",
								children: props.overriddenLabel
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-tavily-reset",
								disabled: props.disabled,
								onClick: props.onReset,
								children: props.resetLabel
							})]
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: props.id,
						className: props.invalid ? "dsh-tavily-input dsh-tavily-input-invalid" : "dsh-tavily-input",
						type: "text",
						...props.numeric === true ? { inputMode: "numeric" } : {},
						...props.invalid ? { "aria-invalid": true } : {},
						value: props.text,
						placeholder: props.placeholder ?? "",
						disabled: props.disabled,
						onChange: (event) => {
							props.onEdit(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: props.invalid ? "dsh-tavily-invalid" : "dsh-tavily-hint",
						children: props.invalid ? props.invalidLabel : props.hint
					})
				]
			});
		}
		/**
		* A write-only credential control. The value never rides a response, so the
		* control reports only whether one is configured and starts blank; a blank
		* draft writes nothing, which keeps the stored key rather than clearing it.
		* @param props - the field's copy, its staged text, and the configured state.
		* @returns the labelled control.
		*/
		function SecretField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dsh-tavily-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-tavily-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: "dsh-tavily-label",
							htmlFor: props.id,
							children: props.label
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-tavily-badges",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: props.configured ? "dsh-tavily-badge" : "dsh-tavily-badge-muted",
								children: props.stateLabel
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						id: props.id,
						className: "dsh-tavily-input",
						type: "password",
						autoComplete: "off",
						value: props.text,
						disabled: props.disabled,
						onChange: (event) => {
							props.onEdit(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-tavily-hint",
						children: props.hint
					})
				]
			});
		}
		//#endregion
		//#region src/client/PluginCard.tsx
		/**
		* One plugin's card: a header naming the plugin and what its settings govern,
		* disclosing that plugin's controls in place, with the save that writes them.
		*
		* The header is its own button rather than a shared disclosure row because a
		* card stacks its name over its description, while that row lays the two side
		* by side — the layout, not the behavior, is what differs. Disclosure is
		* card-local state: which card a user has open is a reading gesture, not
		* something the Host or the section has any stake in. Staged edits outlive
		* collapsing, so the header marks a card holding unsaved edits.
		*
		* A card renders nothing while its namespace is unavailable: a deployment that
		* does not compose the owning plugin should show no trace of it, rather than a
		* disabled card the user cannot act on.
		*/
		/**
		* Render one plugin card.
		* @param props - the plugin's copy keys, its form state, and its controls.
		* @returns the card, or nothing when the namespace is unavailable.
		*/
		function PluginCard(props) {
			const [open, setOpen] = (0, react.useState)(false);
			const { state } = props;
			if (!state.available) return null;
			const title = props.t(props.titleKey);
			const blocked = !state.dirty || state.invalid || state.saving;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: open ? "dsh-tavily-card dsh-tavily-open" : "dsh-tavily-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dsh-tavily-header",
					"aria-expanded": open,
					"aria-label": `${props.t(open ? "collapse" : "expand")}: ${title}`,
					onClick: () => {
						setOpen(!open);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-tavily-head-text",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-tavily-name",
								children: title
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-tavily-description",
								children: props.t(props.descriptionKey)
							})]
						}),
						state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-tavily-pending",
							children: props.t("unsaved")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: open ? "dsh-tavily-chevron dsh-tavily-open" : "dsh-tavily-chevron" })
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-tavily-body",
					children: [
						!state.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-tavily-read-only",
							role: "status",
							children: props.t("readOnly")
						}) : null,
						props.children,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-tavily-footer",
							children: [
								state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dsh-tavily-failed",
									role: "status",
									children: props.t("saveFailed")
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-tavily-discard",
									disabled: !state.dirty || state.saving,
									onClick: props.onDiscard,
									children: props.t("discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dsh-tavily-save",
									disabled: blocked,
									onClick: props.onSave,
									children: props.t(state.saving ? "saving" : "save")
								})
							]
						})
					]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/TavilyCard.tsx
		/**
		* Render the Tavily card.
		* @param props - locale copy, the card snapshot, and its form actions.
		* @returns the card.
		*/
		function TavilyCard(props) {
			const { t } = props;
			const state = props.useTavilyCard((snapshot) => snapshot);
			const disabled = !state.writable;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PluginCard, {
				t,
				titleKey: "tavilyTitle",
				descriptionKey: "tavilyDescription",
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SecretField, {
						id: "plugin-config-tavily-key",
						label: t("tavilyApiKey"),
						hint: t("tavilyApiKeyHint"),
						disabled: !state.apiKeyWritable,
						text: state.apiKey.text,
						configured: state.apiKeyConfigured,
						stateLabel: state.apiKeyConfigured ? t("tavilyApiKeySet") : t("tavilyApiKeyUnset"),
						onEdit: (text) => {
							props.edit("apiKey", text);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "plugin-config-tavily-days",
						label: t("tavilyDays"),
						hint: t("tavilyDaysHint"),
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						numeric: true,
						disabled,
						...state.days,
						onEdit: (text) => {
							props.edit("days", text);
						},
						onReset: () => {
							props.resetField("days");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
						id: "plugin-config-tavily-num-results",
						label: t("tavilyNumResults"),
						hint: t("tavilyNumResultsHint"),
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						numeric: true,
						disabled,
						...state.numResults,
						onEdit: (text) => {
							props.edit("numResults", text);
						},
						onReset: () => {
							props.resetField("numResults");
						}
					})
				]
			});
		}
		//#endregion
		//#region src/client/card-form.ts
		/**
		* A whole-number field. An empty draft clears the field; any other draft that
		* is not a finite number blocks the save.
		* @param field - field name inside the namespace section.
		* @returns the field's conversion spec.
		*/
		function numberField(field) {
			return {
				field,
				format: (value) => typeof value === "number" ? String(value) : "",
				parse: (text) => {
					const trimmed = text.trim();
					if (trimmed === "") return { kind: "clear" };
					const parsed = Number(trimmed);
					return Number.isFinite(parsed) ? {
						kind: "set",
						value: parsed
					} : void 0;
				}
			};
		}
		/**
		* Stages one card's edits over one settings namespace and writes them on save.
		*
		* The form publishes through a snapshot store because slot components read
		* through a snapshot selector, while both the scope and the local drafts
		* change underneath; every projection is rebuilt from the two together.
		*/
		var CardForm = class {
			scope;
			specs;
			secretSpecs;
			staged = /* @__PURE__ */ new Map();
			listeners = /* @__PURE__ */ new Set();
			saving = false;
			failed = false;
			/**
			* @param scope - the bound settings scope for this card's namespace.
			* @param specs - the section fields this card edits.
			* @param secrets - the card's write-only controls, written outside the section.
			*/
			constructor(scope, specs, secrets = []) {
				this.scope = scope;
				this.specs = new Map(specs.map((spec) => [spec.field, spec]));
				this.secretSpecs = new Map(secrets.map((spec) => [spec.field, spec]));
				scope.subscribe(() => {
					this.publish();
				});
			}
			/**
			* Publish a projection of this form, rebuilt whenever the scope or a draft changes.
			* @param project - build the card's state from the form's current reads.
			* @returns the store the card's component reads through its bound selector.
			*/
			bind(project) {
				const store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(project());
				this.listeners.add(() => {
					store.set(project());
				});
				return store;
			}
			/**
			* Read the card-level state: what the Host serves, and what a save would do.
			* @returns the form state every card shares.
			*/
			shell() {
				const snapshot = this.scope.getSnapshot();
				const plan = this.plan();
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					dirty: plan.length > 0,
					invalid: plan.some((item) => item.run === void 0),
					saving: this.saving,
					failed: this.failed
				};
			}
			/**
			* Read one control's state.
			* @param field - field name of a section field or of a write-only control.
			* @returns the draft text, whether a save would leave an override, and whether it is invalid.
			*/
			field(field) {
				const staged = this.staged.get(field);
				if (this.secretSpecs.has(field)) return {
					text: staged?.text ?? "",
					overridden: false,
					invalid: false
				};
				const spec = this.spec(field);
				if (staged === void 0) return {
					text: spec.format(this.sectionValue(field)),
					overridden: this.stored(field),
					invalid: false
				};
				const write = staged.clear ? { kind: "clear" } : spec.parse(staged.text);
				return {
					text: staged.text,
					overridden: write?.kind === "set",
					invalid: write === void 0
				};
			}
			/**
			* Build the edit, reset, save, and discard actions bound to this form.
			* @returns the actions a card's slot entry injects.
			*/
			actions() {
				return {
					edit: (field, text) => {
						this.stage(field, {
							text,
							clear: false
						});
					},
					resetField: (field) => {
						this.stage(field, {
							text: this.spec(field).format(this.baseValue(field)),
							clear: true
						});
					},
					save: () => {
						this.save();
					},
					discard: () => {
						if (this.staged.size === 0 && !this.failed) return;
						this.staged.clear();
						this.failed = false;
						this.publish();
					}
				};
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
			async save() {
				const plan = this.plan();
				const writes = plan.flatMap((item) => item.run === void 0 ? [] : [item.run]);
				if (plan.length === 0 || this.saving || writes.length !== plan.length) return;
				this.saving = true;
				this.failed = false;
				this.publish();
				let landed = true;
				for (const write of writes) landed = await write() && landed;
				if (landed) this.staged.clear();
				this.saving = false;
				this.failed = !landed;
				this.publish();
			}
			/**
			* Every staged edit a save would write. An entry whose draft is not a value
			* its field accepts carries no write: the form is still dirty, and the save
			* refuses rather than dropping the edit.
			* @returns the planned writes, in the order the fields were staged.
			*/
			plan() {
				const plan = [];
				for (const [field, staged] of this.staged) {
					const secret = this.secretSpecs.get(field);
					if (secret !== void 0) {
						const value = staged.text.trim();
						if (value !== "") plan.push({
							field,
							run: () => secret.write(value)
						});
						continue;
					}
					const spec = this.spec(field);
					if (staged.clear) {
						if (this.stored(field)) plan.push({
							field,
							run: () => this.clear(field)
						});
						continue;
					}
					if (staged.text === spec.format(this.sectionValue(field))) continue;
					const write = spec.parse(staged.text);
					if (write === void 0) plan.push({
						field,
						run: void 0
					});
					else if (write.kind === "clear") plan.push({
						field,
						run: () => this.clear(field)
					});
					else plan.push({
						field,
						run: () => this.store(field, write.value)
					});
				}
				return plan;
			}
			async clear(field) {
				await this.scope.unset(field);
				return !this.stored(field);
			}
			async store(field, value) {
				await this.scope.set(field, value);
				return this.userLayer()?.[field] === value;
			}
			stage(field, edit) {
				this.staged.set(field, edit);
				this.failed = false;
				this.publish();
			}
			spec(field) {
				const spec = this.specs.get(field);
				if (spec === void 0) throw new Error(`plugin card has no field ${field}`);
				return spec;
			}
			snapshotOf() {
				return this.scope.getSnapshot();
			}
			sectionValue(field) {
				return this.snapshotOf().value?.[field];
			}
			baseValue(field) {
				return this.snapshotOf().base?.[field];
			}
			userLayer() {
				return this.snapshotOf().user;
			}
			stored(field) {
				const user = this.userLayer();
				return user !== void 0 && Object.hasOwn(user, field);
			}
			publish() {
				for (const listener of this.listeners) listener();
			}
		};
		//#endregion
		//#region src/client/tavily-card-controller.ts
		/**
		* Namespace of the Tavily search provider. Spelled here rather than
		* imported: a client package must not depend on a Host package.
		*/
		const TAVILY_NS = "web-search-tavily";
		/** Credential reference the provider resolves when the section names none. */
		const DEFAULT_API_KEY_REF = "TAVILY_API_KEY";
		/** Form field the credential control stages under. */
		const API_KEY_FIELD = "apiKey";
		/** Bridges the `web-search-tavily` scope and the credentials domain onto the card. */
		var TavilyCardController = class {
			scope;
			api;
			form;
			store;
			credential = {
				ref: "",
				configured: false,
				writable: true
			};
			/**
			* @param scope - the bound settings scope for the `web-search-tavily` namespace.
			* @param api - wire face used for the credential the section references.
			*/
			constructor(scope, api) {
				this.scope = scope;
				this.api = api;
				this.form = new CardForm(scope, [numberField("days"), numberField("numResults")], [{
					field: API_KEY_FIELD,
					write: (text) => this.writeKey(text)
				}]);
				this.store = this.form.bind(() => this.projection());
				scope.subscribe(() => {
					this.readCredential();
				});
				this.readCredential();
			}
			projection() {
				return {
					...this.form.shell(),
					days: this.form.field("days"),
					numResults: this.form.field("numResults"),
					apiKey: this.form.field(API_KEY_FIELD),
					apiKeyConfigured: this.credential.configured,
					apiKeyWritable: this.credential.writable
				};
			}
			/**
			* Ask the credentials domain about the reference the section currently names.
			*
			* The answer is stored with the reference it describes: `apiKeyEnv` can
			* change between the request and its response, and two reads can settle out
			* of order, so a response is published only while it still answers for the
			* reference in force.
			*/
			async readCredential() {
				const ref = refOf(this.scope.getSnapshot());
				if (ref !== this.credential.ref) {
					this.credential = {
						ref,
						configured: false,
						writable: true
					};
					this.store.set(this.projection());
				}
				let response;
				try {
					response = await this.api.credentials.describe({ refs: [ref] });
				} catch (_credentialReadFailure) {
					return;
				}
				if (!response.result.ok || ref !== refOf(this.scope.getSnapshot())) return;
				const view = response.result.value.credentials[ref];
				const next = {
					ref,
					configured: view?.configured ?? false,
					writable: view?.writable ?? true
				};
				if (next.configured === this.credential.configured && next.writable === this.credential.writable) return;
				this.credential = next;
				this.store.set(this.projection());
			}
			/**
			* Re-read after the Host reports a change to the reference this card watches.
			*
			* A key can be written from somewhere else and the settings section does not
			* change when it is, so without this the badge keeps reporting a state the
			* Host already replaced.
			* @param ref - the reference the Host reports as changed.
			*/
			refreshCredential(ref) {
				if (ref !== this.credential.ref) return;
				this.readCredential();
			}
			/**
			* Build the face the card's slot registration injects.
			* @returns the card's snapshot and its form actions.
			*/
			inject() {
				return {
					hooks: { tavilyCard: this.store },
					...this.form.actions()
				};
			}
			/**
			* Write the staged key, then re-read whether the Host now holds one.
			* @param value - the staged credential literal.
			* @returns whether the Host reports a configured credential afterwards.
			*/
			async writeKey(value) {
				try {
					await this.api.credentials.set({
						ref: refOf(this.scope.getSnapshot()),
						value
					});
				} catch (_credentialWriteFailure) {}
				await this.readCredential();
				return this.credential.configured;
			}
		};
		/**
		* The credential reference the section names, or the provider's default.
		* @param snapshot - the current scope snapshot.
		* @returns the reference to address.
		*/
		function refOf(snapshot) {
			const declared = snapshot.value?.apiKeyEnv;
			return declared !== void 0 && declared.length > 0 ? declared : DEFAULT_API_KEY_REF;
		}
		//#endregion
		//#region src/client/locales.ts
		/** English copy. */
		const en = {
			tavilyTitle: "Web search (Tavily)",
			tavilyDescription: "The Tavily search provider.",
			tavilyApiKey: "API key",
			tavilyApiKeyHint: "Stored outside the settings file. Leave blank to keep the current key.",
			tavilyApiKeySet: "A key is configured.",
			tavilyApiKeyUnset: "No key is configured; search is unavailable until one is.",
			tavilyDays: "Recency window (days)",
			tavilyDaysHint: "Only results from the last N days; leave blank to disable.",
			tavilyNumResults: "Default result count",
			tavilyNumResultsHint: "Used when a request carries no explicit limit; leave blank to omit.",
			overridden: "Overridden",
			reset: "Reset to default",
			readOnly: "This deployment stores settings read-only.",
			expand: "Show settings",
			collapse: "Hide settings",
			save: "Save",
			saving: "Saving…",
			discard: "Discard",
			unsaved: "Unsaved",
			saveFailed: "The deployment did not accept these values; they were left for you to correct.",
			invalidNumber: "Enter a number, or leave blank to use the default."
		};
		/** Simplified Chinese copy. */
		const zh = {
			tavilyTitle: "网页搜索（Tavily）",
			tavilyDescription: "Tavily 搜索提供方。",
			tavilyApiKey: "API Key",
			tavilyApiKeyHint: "不写入设置文件。留空表示保持当前密钥。",
			tavilyApiKeySet: "已配置密钥。",
			tavilyApiKeyUnset: "未配置密钥；配置之前搜索不可用。",
			tavilyDays: "时间窗口（天）",
			tavilyDaysHint: "只返回最近 N 天的结果；留空表示不限制。",
			tavilyNumResults: "默认结果数量",
			tavilyNumResultsHint: "请求未指定上限时使用；留空表示不设置。",
			overridden: "已覆盖",
			reset: "恢复默认",
			readOnly: "本部署的设置为只读。",
			expand: "展开设置",
			collapse: "收起设置",
			save: "保存",
			saving: "保存中…",
			discard: "放弃修改",
			unsaved: "未保存",
			saveFailed: "本部署没有接受这些值，已保留供你修改。",
			invalidNumber: "请填数字；留空表示使用默认值。"
		};
		//#endregion
		//#region src/client/styles.ts
		/**
		* Tavily card styles. The product card chrome lives in the settings shell,
		* whose CSS-modules helper is not available to this standalone bundle, so the
		* card injects its own `<style>` tag (one per document, removed on dispose).
		* Class names are prefixed `dsh-tavily-` and values use the `--dsw-*` tokens
		* the web theme provides, so the card inherits the active light/dark theme.
		*/
		/** Stable id carried by the injected tag; re-injection is idempotent. */
		const TAG_ID = "dsh-plugin-tavily-card";
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
.dsh-tavily-invalid { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-error); }
.dsh-tavily-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.dsh-tavily-check { display: flex; align-items: center; gap: 8px; }
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
`;
		/**
		* Inject the card stylesheet once per document.
		* @returns a disposer removing the tag; safe to call repeatedly (no-op when the tag already stands).
		*/
		function injectCardStyles() {
			if (typeof document === "undefined") return () => {};
			if (document.querySelector(`style[data-plugin-css="${TAG_ID}"]`) !== null) return () => {};
			const tag = document.createElement("style");
			tag.dataset.plugin = TAG_ID;
			tag.dataset.pluginCss = TAG_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
			return () => {
				tag.remove();
			};
		}
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin's card. */
		const NS = "settings.plugins.tavily";
		/** Required services (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"connection",
			"remote",
			"settingsScope"
		];
		/**
		* Mount the Tavily plugin card into the plugin configuration section.
		* @param ctx - the browser plugin context.
		*/
		function apply(ctx) {
			const { api } = ctx.get("connection");
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "web-search-tavily: card dictionaries");
			ctx.effect(() => injectCardStyles(), "web-search-tavily: card styles");
			const controller = new TavilyCardController(ctx.settingsScope.bind({ namespace: TAVILY_NS }), api);
			ctx.effect(() => ctx.remote.$on("credentials/updated", (ref) => {
				controller.refreshCredential(ref);
			}), "web-search-tavily: credential invalidations");
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				id: "web-search-tavily",
				order: 21,
				locale: NS,
				inject: () => controller.inject()
			}, TavilyCard));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
else module.exports = {};

//# sourceMappingURL=client.cjs.map