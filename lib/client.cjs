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
			const disabled = props.disabled || props.configCovered;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: props.configCovered ? "dsh-tavily-field dsh-tavily-covered" : "dsh-tavily-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-tavily-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: "dsh-tavily-label",
							htmlFor: props.id,
							children: props.label
						}), props.configCovered ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-tavily-badges",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-tavily-badge dsh-tavily-badge-config",
								children: props.configCoveredLabel
							})
						}) : props.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-tavily-badges",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-tavily-badge",
								children: props.overriddenLabel
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-tavily-reset",
								disabled,
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
						disabled,
						onChange: (event) => {
							props.onEdit(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: props.configCovered ? "dsh-tavily-config-covered" : props.invalid ? "dsh-tavily-invalid" : "dsh-tavily-hint",
						children: props.configCovered ? props.configCoveredLabel : props.invalid ? props.invalidLabel : props.hint
					})
				]
			});
		}
		/**
		* A staged single-choice field. The first option is empty so an untouched field
		* shows its placeholder/default; selecting it again stages a clear.
		* @param props - the field's copy, options, staged value, and edit actions.
		* @returns the labelled control.
		*/
		function SelectField(props) {
			const disabled = props.disabled || props.configCovered;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: props.configCovered ? "dsh-tavily-field dsh-tavily-covered" : "dsh-tavily-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-tavily-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: "dsh-tavily-label",
							htmlFor: props.id,
							children: props.label
						}), props.configCovered ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-tavily-badges",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-tavily-badge dsh-tavily-badge-config",
								children: props.configCoveredLabel
							})
						}) : props.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-tavily-badges",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-tavily-badge",
								children: props.overriddenLabel
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-tavily-reset",
								disabled,
								onClick: props.onReset,
								children: props.resetLabel
							})]
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						id: props.id,
						className: props.invalid ? "dsh-tavily-input dsh-tavily-input-invalid dsh-tavily-select" : "dsh-tavily-input dsh-tavily-select",
						value: props.text,
						disabled,
						onChange: (event) => {
							props.onEdit(event.target.value);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: props.placeholder ?? ""
						}), props.options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: option.value,
							children: option.label
						}, option.value))]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: props.configCovered ? "dsh-tavily-config-covered" : props.invalid ? "dsh-tavily-invalid" : "dsh-tavily-hint",
						children: props.configCovered ? props.configCoveredLabel : props.invalid ? props.invalidLabel : props.hint
					})
				]
			});
		}
		/**
		* A staged boolean field rendered as a checkbox. The visible default is driven
		* by the form spec's fallback, so a switch that defaults to `true` shows as
		* checked before any user interaction.
		* @param props - the field's copy, checked state, and edit actions.
		* @returns the labelled control.
		*/
		function CheckField(props) {
			const disabled = props.disabled || props.configCovered;
			const checked = props.text === "true";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: props.configCovered ? "dsh-tavily-field dsh-tavily-covered" : "dsh-tavily-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-tavily-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: "dsh-tavily-label",
							htmlFor: props.id,
							children: props.label
						}), props.configCovered ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-tavily-badges",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-tavily-badge dsh-tavily-badge-config",
								children: props.configCoveredLabel
							})
						}) : props.overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dsh-tavily-badges",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dsh-tavily-badge",
								children: props.overriddenLabel
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-tavily-reset",
								disabled,
								onClick: props.onReset,
								children: props.resetLabel
							})]
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-tavily-check",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: props.id,
							className: "dsh-tavily-checkbox",
							type: "checkbox",
							checked,
							disabled,
							onChange: (event) => {
								props.onEdit(String(event.target.checked));
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-tavily-check-copy",
							children: props.hint
						})]
					}),
					props.configCovered ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dsh-tavily-config-covered",
						children: props.configCoveredLabel
					}) : null
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
		* Copyable snippet wiring `web_search` to this provider. This plugin already
		* elects `web.searchProvider: tavily` in its own cordis.patch.yml, so the card
		* "engine" switch (Tavily / official DeepSeek) is the only choice you need to
		* make — the snippet below is only for overriding the provider manually.
		*/
		const WIRING_YAML = `# ~/.dsh/profiles/<profile>/cordis.patch.yml
- id: web
  config:
    searchProvider: tavily
    # fetchProvider: tavily-extract   # optional: URL retrieval via Tavily Extract
`;
		/**
		* Format a rough token count into a short magnitude, e.g. `3.8k` or `1.2M`.
		* @param tokens - the approximate token count.
		* @returns a compact human-readable magnitude.
		*/
		function formatTokenHint(tokens) {
			if (tokens >= 1e6) return `${(tokens / 1e6).toFixed(1)}M`;
			if (tokens >= 1e3) return `${(tokens / 1e3).toFixed(1)}k`;
			return String(tokens);
		}
		/**
		* Render the Tavily card.
		* @param props - locale copy, the card snapshot, and its form actions.
		* @returns the card.
		*/
		function TavilyCard(props) {
			const { t } = props;
			const state = props.useTavilyCard((snapshot) => snapshot);
			const disabled = !state.writable;
			const testing = state.apiTest.status === "testing";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PluginCard, {
				t,
				titleKey: "tavilyTitle",
				descriptionKey: "tavilyDescription",
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-tavily-wiring",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-tavily-wiring-title",
								role: "note",
								children: t("wiringTitle")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-tavily-wiring-copy",
								children: t("wiringHint")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
								className: "dsh-tavily-wiring-code",
								children: WIRING_YAML
							})
						]
					}),
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
						id: "plugin-config-tavily-base-url",
						label: t("tavilyBaseUrl"),
						hint: t("tavilyBaseUrlHint"),
						overriddenLabel: t("overridden"),
						configCoveredLabel: t("configCovered"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						placeholder: "https://api.tavily.com",
						disabled,
						...state.baseURL,
						onEdit: (text) => {
							props.edit("baseURL", text);
						},
						onReset: () => {
							props.resetField("baseURL");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
						id: "plugin-config-tavily-engine",
						label: t("tavilyEngine"),
						hint: t("tavilyEngineHint"),
						overriddenLabel: t("overridden"),
						configCoveredLabel: t("configCovered"),
						resetLabel: t("reset"),
						invalidLabel: t("invalidNumber"),
						placeholder: "tavily",
						disabled,
						...state.engine,
						options: [{
							value: "tavily",
							label: t("engineTavily")
						}, {
							value: "deepseek",
							label: t("engineDeepseek")
						}],
						onEdit: (text) => {
							props.edit("engine", text);
						},
						onReset: () => {
							props.resetField("engine");
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-tavily-test-area",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-tavily-test",
								disabled: testing || !state.apiKeyWritable,
								onClick: props.testApi,
								children: testing ? t("testingApi") : t("testApi")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-tavily-test-hint",
								children: t("testApiHint")
							}),
							state.apiTest.status === "success" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-tavily-test-success",
								role: "status",
								children: t("testApiSuccess")
							}) : null,
							state.apiTest.status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-tavily-test-error",
								role: "alert",
								children: state.apiTest.detail === "need-key" ? t("testApiNeedKey") : state.apiTest.detail === "need-key-configured" ? t("testApiKeyConfiguredNeedReentry") : `${t("testApiFailed")} ${state.apiTest.detail}`
							}) : null
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dsh-tavily-usage-area",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: "dsh-tavily-usage-estimate",
								role: "status",
								children: [
									t("usageEstimateLabel"),
									state.estimate.credits,
									" ",
									t("usageEstimateCredits"),
									", ~",
									formatTokenHint(state.estimate.tokenHint)
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dsh-tavily-test",
								disabled: state.usage.status === "checking" || !state.apiKeyWritable,
								onClick: props.checkUsage,
								children: state.usage.status === "checking" ? t("checkingUsage") : t("checkUsage")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-tavily-test-hint",
								children: t("checkUsageHint")
							}),
							state.usage.status === "success" && state.usage.key ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: "dsh-tavily-test-success",
								role: "status",
								children: [
									t("usageResultLabel"),
									state.usage.key.used ?? 0,
									t("usageResultOf"),
									state.usage.key.limit != null ? String(state.usage.key.limit) : t("usageUnlimited"),
									t("usageResultSearch"),
									state.usage.key.searchUsed ?? 0,
									state.usage.plan != null && state.usage.plan !== "" ? ` (${state.usage.plan})` : ""
								]
							}) : null,
							state.usage.status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dsh-tavily-test-error",
								role: "alert",
								children: state.usage.detail === "need-key" ? t("testApiNeedKey") : state.usage.detail === "need-key-configured" ? t("testApiKeyConfiguredNeedReentry") : `${t("usageFailed")} ${state.usage.detail}`
							}) : null
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: "dsh-tavily-advanced",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("advancedTitle") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "plugin-config-tavily-max-results",
								label: t("tavilyMaxResults"),
								hint: t("tavilyMaxResultsHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								numeric: true,
								placeholder: "5",
								disabled,
								...state.maxResults,
								onEdit: (text) => {
									props.edit("maxResults", text);
								},
								onReset: () => {
									props.resetField("maxResults");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
								id: "plugin-config-tavily-search-depth",
								label: t("tavilySearchDepth"),
								hint: t("tavilySearchDepthHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								placeholder: "basic",
								disabled,
								...state.searchDepth,
								options: [
									{
										value: "basic",
										label: t("searchDepthBasic")
									},
									{
										value: "advanced",
										label: t("searchDepthAdvanced")
									},
									{
										value: "fast",
										label: t("searchDepthFast")
									},
									{
										value: "ultra-fast",
										label: t("searchDepthUltraFast")
									}
								],
								onEdit: (text) => {
									props.edit("searchDepth", text);
								},
								onReset: () => {
									props.resetField("searchDepth");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
								id: "plugin-config-tavily-topic",
								label: t("tavilyTopic"),
								hint: t("tavilyTopicHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								placeholder: "general",
								disabled,
								...state.topic,
								options: [
									{
										value: "general",
										label: t("topicGeneral")
									},
									{
										value: "news",
										label: t("topicNews")
									},
									{
										value: "finance",
										label: t("topicFinance")
									}
								],
								onEdit: (text) => {
									props.edit("topic", text);
								},
								onReset: () => {
									props.resetField("topic");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
								id: "plugin-config-tavily-include-answer",
								label: t("tavilyIncludeAnswer"),
								hint: t("tavilyIncludeAnswerHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								placeholder: t("includeAnswerRecommended"),
								disabled,
								...state.includeAnswer,
								options: [
									{
										value: "true",
										label: t("includeAnswerTrue")
									},
									{
										value: "advanced",
										label: t("includeAnswerAdvanced")
									},
									{
										value: "false",
										label: t("includeAnswerFalse")
									}
								],
								onEdit: (text) => {
									props.edit("includeAnswer", text);
								},
								onReset: () => {
									props.resetField("includeAnswer");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
								id: "plugin-config-tavily-include-raw-content",
								label: t("tavilyIncludeRawContent"),
								hint: t("tavilyIncludeRawContentHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								placeholder: "false",
								disabled,
								...state.includeRawContent,
								options: [
									{
										value: "false",
										label: t("rawContentFalse")
									},
									{
										value: "true",
										label: t("rawContentMarkdown")
									},
									{
										value: "markdown",
										label: t("rawContentMarkdown")
									},
									{
										value: "text",
										label: t("rawContentText")
									}
								],
								onEdit: (text) => {
									props.edit("includeRawContent", text);
								},
								onReset: () => {
									props.resetField("includeRawContent");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "plugin-config-tavily-chunks-per-source",
								label: t("tavilyChunksPerSource"),
								hint: t("tavilyChunksPerSourceHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								numeric: true,
								placeholder: "3",
								disabled,
								...state.chunksPerSource,
								onEdit: (text) => {
									props.edit("chunksPerSource", text);
								},
								onReset: () => {
									props.resetField("chunksPerSource");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectField, {
								id: "plugin-config-tavily-time-range",
								label: t("tavilyTimeRange"),
								hint: t("tavilyTimeRangeHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								placeholder: t("tavilyDaysHint"),
								disabled,
								...state.timeRange,
								options: [
									{
										value: "day",
										label: "day"
									},
									{
										value: "week",
										label: "week"
									},
									{
										value: "month",
										label: "month"
									},
									{
										value: "year",
										label: "year"
									},
									{
										value: "d",
										label: "d"
									},
									{
										value: "w",
										label: "w"
									},
									{
										value: "m",
										label: "m"
									},
									{
										value: "y",
										label: "y"
									}
								],
								onEdit: (text) => {
									props.edit("timeRange", text);
								},
								onReset: () => {
									props.resetField("timeRange");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "plugin-config-tavily-start-date",
								label: t("tavilyStartDate"),
								hint: t("tavilyStartDateHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								placeholder: "YYYY-MM-DD",
								disabled,
								...state.startDate,
								onEdit: (text) => {
									props.edit("startDate", text);
								},
								onReset: () => {
									props.resetField("startDate");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "plugin-config-tavily-end-date",
								label: t("tavilyEndDate"),
								hint: t("tavilyEndDateHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								placeholder: "YYYY-MM-DD",
								disabled,
								...state.endDate,
								onEdit: (text) => {
									props.edit("endDate", text);
								},
								onReset: () => {
									props.resetField("endDate");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CheckField, {
								id: "plugin-config-tavily-include-images",
								label: t("tavilyIncludeImages"),
								hint: t("tavilyIncludeImagesHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								disabled,
								...state.includeImages,
								onEdit: (text) => {
									props.edit("includeImages", text);
								},
								onReset: () => {
									props.resetField("includeImages");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CheckField, {
								id: "plugin-config-tavily-include-image-descriptions",
								label: t("tavilyIncludeImageDescriptions"),
								hint: t("tavilyIncludeImageDescriptionsHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								disabled,
								...state.includeImageDescriptions,
								onEdit: (text) => {
									props.edit("includeImageDescriptions", text);
								},
								onReset: () => {
									props.resetField("includeImageDescriptions");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CheckField, {
								id: "plugin-config-tavily-include-favicon",
								label: t("tavilyIncludeFavicon"),
								hint: t("tavilyIncludeFaviconHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								disabled,
								...state.includeFavicon,
								onEdit: (text) => {
									props.edit("includeFavicon", text);
								},
								onReset: () => {
									props.resetField("includeFavicon");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "plugin-config-tavily-include-domains",
								label: t("tavilyIncludeDomains"),
								hint: t("tavilyIncludeDomainsHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidList"),
								placeholder: "example.com, docs.example.org",
								disabled,
								...state.includeDomains,
								onEdit: (text) => {
									props.edit("includeDomains", text);
								},
								onReset: () => {
									props.resetField("includeDomains");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "plugin-config-tavily-exclude-domains",
								label: t("tavilyExcludeDomains"),
								hint: t("tavilyExcludeDomainsHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidList"),
								placeholder: "spam.com, ads.example.org",
								disabled,
								...state.excludeDomains,
								onEdit: (text) => {
									props.edit("excludeDomains", text);
								},
								onReset: () => {
									props.resetField("excludeDomains");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "plugin-config-tavily-country",
								label: t("tavilyCountry"),
								hint: t("tavilyCountryHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								placeholder: "japan",
								disabled,
								...state.country,
								onEdit: (text) => {
									props.edit("country", text);
								},
								onReset: () => {
									props.resetField("country");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "plugin-config-tavily-retry-max-attempts",
								label: t("tavilyRetryMaxAttempts"),
								hint: t("tavilyRetryMaxAttemptsHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								numeric: true,
								placeholder: "2",
								disabled,
								...state.retryMaxAttempts,
								onEdit: (text) => {
									props.edit("retryMaxAttempts", text);
								},
								onReset: () => {
									props.resetField("retryMaxAttempts");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "plugin-config-tavily-cache-ttl",
								label: t("tavilyCacheTtl"),
								hint: t("tavilyCacheTtlHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								numeric: true,
								placeholder: "0",
								disabled,
								...state.cacheTtlSeconds,
								onEdit: (text) => {
									props.edit("cacheTtlSeconds", text);
								},
								onReset: () => {
									props.resetField("cacheTtlSeconds");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "plugin-config-tavily-timeout",
								label: t("tavilyTimeout"),
								hint: t("tavilyTimeoutHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
								resetLabel: t("reset"),
								invalidLabel: t("invalidNumber"),
								numeric: true,
								placeholder: "30000",
								disabled,
								...state.timeout,
								onEdit: (text) => {
									props.edit("timeout", text);
								},
								onReset: () => {
									props.resetField("timeout");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ValueField, {
								id: "plugin-config-tavily-days",
								label: t("tavilyDays"),
								hint: t("tavilyDaysHint"),
								overriddenLabel: t("overridden"),
								configCoveredLabel: t("configCovered"),
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
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/card-form.ts
		/**
		* A whole-number field. An empty draft clears the field; any other draft that
		* is not an accepted number blocks the save. Optional constraints are checked
		* in the same place scope validation would reject them, so the card does not
		* stage a write it knows the Host will refuse.
		* @param field - field name inside the namespace section.
		* @param options - optional bounds/integer requirement.
		* @returns the field's conversion spec.
		*/
		function numberField(field, options = {}) {
			return {
				field,
				format: (value) => typeof value === "number" ? String(value) : "",
				parse: (text) => {
					const trimmed = text.trim();
					if (trimmed === "") return { kind: "clear" };
					const parsed = Number(trimmed);
					if (!Number.isFinite(parsed)) return void 0;
					if (options.integer === true && !Number.isInteger(parsed)) return void 0;
					if (options.min !== void 0 && parsed < options.min) return void 0;
					if (options.max !== void 0 && parsed > options.max) return void 0;
					return {
						kind: "set",
						value: parsed
					};
				},
				aliases: options.aliases
			};
		}
		/**
		* A plain text field. An empty/whitespace-only draft clears the field so it
		* re-inherits the code default.
		* @param field - field name inside the namespace section.
		* @returns the field's conversion spec.
		*/
		function textField(field) {
			return {
				field,
				format: (value) => typeof value === "string" ? value : "",
				parse: (text) => {
					const trimmed = text.trim();
					return trimmed === "" ? { kind: "clear" } : {
						kind: "set",
						value: trimmed
					};
				}
			};
		}
		/**
		* A single-choice field rendered by a select. An empty draft clears the field.
		* @param field - field name inside the namespace section.
		* @param allowed - the values the schema accepts.
		* @returns the field's conversion spec.
		*/
		function selectField(field, allowed) {
			return {
				field,
				format: (value) => typeof value === "string" && allowed.includes(value) ? value : "",
				parse: (text) => {
					if (text === "") return { kind: "clear" };
					return allowed.includes(text) ? {
						kind: "set",
						value: text
					} : void 0;
				}
			};
		}
		/**
		* A boolean field rendered by a checkbox. The fallback makes the code default
		* visible before a user stores their own choice.
		* @param field - field name inside the namespace section.
		* @param fallback - the code-level default value.
		* @returns the field's conversion spec.
		*/
		function booleanField(field, fallback) {
			return {
				field,
				format: (value) => typeof value === "boolean" ? String(value) : "",
				parse: (text) => {
					if (text === "true") return {
						kind: "set",
						value: true
					};
					if (text === "false") return {
						kind: "set",
						value: false
					};
				},
				fallback
			};
		}
		/**
		* A multi-value string field (e.g. domain lists) rendered as one comma- or
		* whitespace-separated text input. The stored value is a `string[]`; an empty
		* draft clears the field so it re-inherits the code default.
		* @param field - field name inside the namespace section.
		* @returns the field's conversion spec.
		*/
		function listField(field) {
			return {
				field,
				format: (value) => Array.isArray(value) ? value.join(", ") : "",
				parse: (text) => {
					const tokens = text.split(/[\s,]+/u).map((token) => token.trim()).filter(Boolean);
					return tokens.length === 0 ? { kind: "clear" } : {
						kind: "set",
						value: tokens
					};
				}
			};
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
		function valueSelectField(field, tokens) {
			return {
				field,
				format: (value) => {
					if (typeof value === "boolean") return value ? "true" : "false";
					return typeof value === "string" && tokens.includes(value) ? value : "";
				},
				parse: (text) => {
					if (text === "") return { kind: "clear" };
					if (text === "false") return {
						kind: "set",
						value: false
					};
					if (text === "true") return {
						kind: "set",
						value: true
					};
					return tokens.includes(text) ? {
						kind: "set",
						value: text
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
			* @returns the draft text and the badges/blocking flags a control renders.
			*/
			field(field) {
				const staged = this.staged.get(field);
				if (this.secretSpecs.has(field)) return {
					text: staged?.text ?? "",
					overridden: false,
					configCovered: false,
					invalid: false
				};
				const spec = this.spec(field);
				if (staged === void 0) {
					if (this.storedBase(field)) return {
						text: spec.format(this.baseValue(field)),
						overridden: false,
						configCovered: true,
						invalid: false
					};
					if (this.stored(field)) return {
						text: spec.format(this.userValue(field)),
						overridden: true,
						configCovered: false,
						invalid: false
					};
					return {
						text: spec.fallback !== void 0 ? spec.format(spec.fallback) : "",
						overridden: false,
						configCovered: false,
						invalid: false
					};
				}
				const write = staged.clear ? { kind: "clear" } : spec.parse(staged.text);
				return {
					text: staged.text,
					overridden: write?.kind === "set",
					configCovered: false,
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
						const spec = this.spec(field);
						const resetValue = this.baseValue(field) ?? spec.fallback;
						this.stage(field, {
							text: spec.format(resetValue),
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
				const user = this.userLayer() ?? {};
				for (const name of this.allNames(field)) if (Object.hasOwn(user, name)) await this.scope.unset(name);
				const remaining = this.userLayer() ?? {};
				return !this.allNames(field).some((name) => Object.hasOwn(remaining, name));
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
			allNames(field) {
				return [field, ...this.spec(field).aliases ?? []];
			}
			baseValue(field) {
				const base = this.snapshotOf().base;
				if (base === void 0) return void 0;
				for (const name of this.allNames(field)) if (Object.hasOwn(base, name)) return base[name];
			}
			userLayer() {
				return this.snapshotOf().user;
			}
			userValue(field) {
				const user = this.userLayer();
				if (user === void 0) return void 0;
				for (const name of this.allNames(field)) if (Object.hasOwn(user, name)) return user[name];
			}
			stored(field) {
				const user = this.userLayer();
				return user !== void 0 && this.allNames(field).some((name) => Object.hasOwn(user, name));
			}
			storedBase(field) {
				const base = this.snapshotOf().base;
				return base !== void 0 && this.allNames(field).some((name) => Object.hasOwn(base, name));
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
		/** Default endpoint mirror; the card cannot import the Host package. */
		const DEFAULT_BASE_URL = "https://api.tavily.com";
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
			apiTest = {
				status: "idle",
				detail: ""
			};
			usage = {
				status: "idle",
				detail: ""
			};
			/**
			* @param scope - the bound settings scope for the `web-search-tavily` namespace.
			* @param api - wire face used for the credential the section references.
			*/
			constructor(scope, api) {
				this.scope = scope;
				this.api = api;
				this.form = new CardForm(scope, [
					textField("baseURL"),
					selectField("searchDepth", [
						"basic",
						"advanced",
						"fast",
						"ultra-fast"
					]),
					selectField("topic", [
						"general",
						"news",
						"finance"
					]),
					numberField("maxResults", {
						min: 1,
						max: 20,
						integer: true,
						aliases: ["numResults"]
					}),
					numberField("days", {
						min: 1,
						integer: true
					}),
					valueSelectField("includeAnswer", ["basic", "advanced"]),
					valueSelectField("includeRawContent", ["markdown", "text"]),
					numberField("timeout", {
						min: 1e3,
						integer: true
					}),
					numberField("chunksPerSource", {
						min: 1,
						max: 3,
						integer: true
					}),
					selectField("timeRange", [
						"day",
						"week",
						"month",
						"year",
						"d",
						"w",
						"m",
						"y"
					]),
					textField("startDate"),
					textField("endDate"),
					booleanField("includeImages", false),
					booleanField("includeImageDescriptions", false),
					booleanField("includeFavicon", false),
					listField("includeDomains"),
					listField("excludeDomains"),
					textField("country"),
					numberField("retryMaxAttempts", {
						min: 0,
						max: 5,
						integer: true
					}),
					numberField("cacheTtlSeconds", {
						min: 0,
						max: 3600,
						integer: true
					}),
					selectField("engine", ["tavily", "deepseek"])
				], [{
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
					baseURL: this.form.field("baseURL"),
					searchDepth: this.form.field("searchDepth"),
					topic: this.form.field("topic"),
					maxResults: this.form.field("maxResults"),
					days: this.form.field("days"),
					includeAnswer: this.form.field("includeAnswer"),
					includeRawContent: this.form.field("includeRawContent"),
					chunksPerSource: this.form.field("chunksPerSource"),
					timeRange: this.form.field("timeRange"),
					startDate: this.form.field("startDate"),
					endDate: this.form.field("endDate"),
					includeImages: this.form.field("includeImages"),
					includeImageDescriptions: this.form.field("includeImageDescriptions"),
					includeFavicon: this.form.field("includeFavicon"),
					includeDomains: this.form.field("includeDomains"),
					excludeDomains: this.form.field("excludeDomains"),
					country: this.form.field("country"),
					retryMaxAttempts: this.form.field("retryMaxAttempts"),
					cacheTtlSeconds: this.form.field("cacheTtlSeconds"),
					timeout: this.form.field("timeout"),
					engine: this.form.field("engine"),
					apiKey: this.form.field(API_KEY_FIELD),
					apiKeyConfigured: this.credential.configured,
					apiKeyWritable: this.credential.writable,
					apiTest: this.apiTest,
					estimate: this.computeEstimate(),
					usage: this.usage
				};
			}
			/**
			* Compute a live cost preview from the current drafts. Credits derive from
			* the search depth; the token count is a rough advisory magnitude from the
			* result count and per-source chunk count.
			*/
			computeEstimate() {
				return {
					credits: this.form.field("searchDepth").text === "advanced" ? 2 : 1,
					tokenHint: parsePositiveInt(this.form.field("maxResults").text, 5) * parsePositiveInt(this.form.field("chunksPerSource").text, 3) * 250
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
					...this.form.actions(),
					testApi: () => {
						this.runApiTest();
					},
					checkUsage: () => {
						this.runUsageCheck();
					}
				};
			}
			/**
			* Run a lightweight browser-side connectivity test using the values currently
			* on screen. A stored key cannot be read back from the credentials service by
			* design, so testing an already-configured key requires re-entering it.
			*/
			async runApiTest() {
				const key = this.form.field(API_KEY_FIELD).text.trim();
				if (key === "") {
					if (this.credential.configured) {
						this.apiTest = {
							status: "error",
							detail: "need-key-configured"
						};
						document.getElementById("plugin-config-tavily-key")?.focus();
					} else this.apiTest = {
						status: "error",
						detail: "need-key"
					};
					this.store.set(this.projection());
					return;
				}
				const baseURL = this.form.field("baseURL").text.trim() || DEFAULT_BASE_URL;
				this.apiTest = {
					status: "testing",
					detail: ""
				};
				this.store.set(this.projection());
				try {
					const response = await fetch(`${baseURL}/search`, {
						method: "POST",
						headers: {
							"authorization": `Bearer ${key}`,
							"content-type": "application/json",
							"accept": "application/json"
						},
						body: JSON.stringify({
							query: "connectivity test",
							max_results: 1,
							search_depth: "basic",
							topic: "general",
							include_answer: false
						})
					});
					if (!response.ok) {
						let detail = `HTTP ${response.status}`;
						try {
							const body = await response.json();
							detail = body.detail?.error ?? body.error ?? body.message ?? detail;
						} catch (_errorBodyReadFailure) {}
						throw new Error(detail);
					}
					this.apiTest = {
						status: "success",
						detail: ""
					};
				} catch (error) {
					this.apiTest = {
						status: "error",
						detail: error instanceof Error ? error.message : String(error)
					};
				}
				this.store.set(this.projection());
			}
			/**
			* Check current credit usage against Tavily's `/usage` endpoint using the
			* values on screen. Like the connectivity test, a stored key cannot be read
			* back by the browser, so checking an already-configured key requires
			* re-entering it once.
			*/
			async runUsageCheck() {
				const key = this.form.field(API_KEY_FIELD).text.trim();
				if (key === "") {
					this.usage = {
						status: "error",
						detail: this.credential.configured ? "need-key-configured" : "need-key"
					};
					if (this.credential.configured) document.getElementById("plugin-config-tavily-key")?.focus();
					this.store.set(this.projection());
					return;
				}
				const baseURL = this.form.field("baseURL").text.trim() || DEFAULT_BASE_URL;
				this.usage = {
					status: "checking",
					detail: ""
				};
				this.store.set(this.projection());
				try {
					const response = await fetch(`${baseURL}/usage`, {
						method: "GET",
						headers: {
							"authorization": `Bearer ${key}`,
							"accept": "application/json"
						}
					});
					if (!response.ok) {
						let detail = `HTTP ${response.status}`;
						try {
							const body = await response.json();
							detail = body.detail?.error ?? body.error ?? body.message ?? detail;
						} catch (_errorBodyReadFailure) {}
						throw new Error(detail);
					}
					const parsed = await response.json();
					this.usage = {
						status: "success",
						detail: "",
						key: {
							used: parsed.key?.usage,
							limit: parsed.key?.limit ?? null,
							searchUsed: parsed.key?.search_usage
						},
						plan: parsed.account?.current_plan
					};
				} catch (error) {
					this.usage = {
						status: "error",
						detail: error instanceof Error ? error.message : String(error)
					};
				}
				this.store.set(this.projection());
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
		/**
		* Parse a draft text into a positive integer fallback.
		* @param text - the draft text; blank/non-numeric yields the fallback.
		* @param fallback - the value used when the text is not a positive integer.
		* @returns the parsed number or the fallback.
		*/
		function parsePositiveInt(text, fallback) {
			const parsed = Number(text.trim());
			return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
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
			tavilyBaseUrl: "API Base URL",
			tavilyBaseUrlHint: "Custom proxy/endpoint base; leave blank for https://api.tavily.com.",
			tavilyMaxResults: "Max results",
			tavilyMaxResultsHint: "Number of web results per search (1–20); blank uses 5.",
			tavilySearchDepth: "Search depth",
			tavilySearchDepthHint: "basic is fast/cheap; advanced performs deeper retrieval and costs more tokens.",
			tavilyTopic: "Topic",
			tavilyTopicHint: "general is the whole web; news prioritizes recency; finance targets market content.",
			tavilyIncludeAnswer: "Generated answer",
			tavilyIncludeAnswerHint: "Ask Tavily to generate an answer returned to the agent: quick (true/basic) or detailed (advanced).",
			tavilyIncludeRawContent: "Raw page content",
			tavilyIncludeRawContentHint: "Include cleaned page content in each result; format markdown/text. Greatly increases context token usage.",
			tavilyTimeout: "Request timeout (ms)",
			tavilyTimeoutHint: "Milliseconds before a search request is abandoned; blank uses 30000.",
			tavilyDays: "Recency window (days)",
			tavilyDaysHint: "Only results from the last N days; leave blank to disable.",
			tavilyEngine: "Web search engine",
			tavilyEngineHint: "Which provider answers web_search. Tavily (default): this plugin, keyless if no key. DeepSeek: the official DeepSeek search — switch back without uninstalling. This plugin is already elected as the web_search provider, so this toggle actually changes the engine (no manual yaml needed).",
			engineTavily: "Tavily (default)",
			engineDeepseek: "Official DeepSeek",
			wiringTitle: "Tavily is already selected as the web_search provider",
			wiringHint: "Installing this plugin elects Tavily automatically (web.searchProvider: tavily), so web_search answers through Tavily out of the box. The “Web search engine” switch above then picks Tavily or the official DeepSeek provider. The snippet below is optional — only needed if you later override the provider in yaml by hand.",
			tavilyRetryMaxAttempts: "Rate-limit retries",
			tavilyRetryMaxAttemptsHint: "Extra attempts after a 429 response (0–5); waits honor retry-after with a bounded backoff.",
			tavilyCacheTtl: "Cache TTL (seconds)",
			tavilyCacheTtlHint: "Cache identical searches to save credits; 0 disables (0–3600).",
			advancedTitle: "🔧 Advanced Tavily request parameters",
			searchDepthBasic: "basic (balanced)",
			searchDepthAdvanced: "advanced (deep, 2 credits)",
			searchDepthFast: "fast (1 credit)",
			searchDepthUltraFast: "ultra-fast (1 credit, lowest latency)",
			topicGeneral: "general",
			topicNews: "news",
			topicFinance: "finance",
			tavilyChunksPerSource: "Chunks per source",
			tavilyChunksPerSourceHint: "Snippet chunks per source (1–3); larger is richer but uses more tokens.",
			tavilyTimeRange: "Time range",
			tavilyTimeRangeHint: "Recency preset (news/finance topics); e.g. day, week, month, year.",
			tavilyStartDate: "Start date",
			tavilyStartDateHint: "Include only results published/updated after this date (YYYY-MM-DD).",
			tavilyEndDate: "End date",
			tavilyEndDateHint: "Include only results published/updated before this date (YYYY-MM-DD).",
			tavilyIncludeImages: "Include images",
			tavilyIncludeImagesHint: "Collect query-related and per-source images. Note: the current seam does not yet surface images in results.",
			tavilyIncludeImageDescriptions: "Image descriptions",
			tavilyIncludeImageDescriptionsHint: "With “Include images”, add a description per image.",
			tavilyIncludeFavicon: "Include favicon",
			tavilyIncludeFaviconHint: "Request the favicon URL per result. Note: the current seam does not yet surface favicons in results.",
			tavilyIncludeDomains: "Include domains",
			tavilyIncludeDomainsHint: "Only these domains (comma/space separated), e.g. example.com, docs.example.org.",
			tavilyExcludeDomains: "Exclude domains",
			tavilyExcludeDomainsHint: "Skip these domains (comma/space separated), e.g. spam.com.",
			tavilyCountry: "Country boost",
			tavilyCountryHint: "Boost results from one country (general topic), e.g. japan, united-states.",
			includeAnswerRecommended: "true (quick)",
			includeAnswerTrue: "true (quick)",
			includeAnswerAdvanced: "advanced (detailed)",
			includeAnswerFalse: "false (none)",
			rawContentFalse: "false (off)",
			rawContentMarkdown: "true / markdown",
			rawContentText: "text",
			testApi: "Test API connection",
			testingApi: "Testing…",
			testApiHint: "Testing consumes one Tavily search credit.",
			testApiNeedKey: "Enter an API key in the field above to test.",
			testApiKeyConfiguredNeedReentry: "A key is configured, but browsers cannot read stored secrets. Re-enter the key above once to test it (it will not be saved again).",
			testApiSuccess: "Connection successful — Tavily accepted the request.",
			testApiFailed: "Connection failed:",
			usageEstimateLabel: "Estimated cost for one search: ",
			usageEstimateCredits: "credit(s),",
			checkUsage: "Check usage",
			checkingUsage: "Checking…",
			checkUsageHint: "Checks current credit usage; like testing, a stored key must be re-entered once.",
			usageResultLabel: "Usage: ",
			usageResultOf: " / ",
			usageResultSearch: " · ",
			usageUnlimited: "unlimited",
			usageFailed: "Usage check failed:",
			overridden: "Overridden",
			configCovered: "Covered by config file; edit the yaml to change.",
			reset: "Reset to default",
			readOnly: "This deployment stores settings read-only.",
			expand: "Show settings",
			collapse: "Hide settings",
			save: "Save",
			saving: "Saving…",
			discard: "Discard",
			unsaved: "Unsaved",
			saveFailed: "The deployment did not accept these values; they were left for you to correct.",
			invalidNumber: "Enter a valid number, or leave blank to use the default.",
			invalidList: "One or more values are not accepted; separate entries with commas or spaces."
		};
		/** Simplified Chinese copy. */
		const zh = {
			tavilyTitle: "网页搜索（Tavily）",
			tavilyDescription: "Tavily 搜索提供方。",
			tavilyApiKey: "API Key",
			tavilyApiKeyHint: "不写入设置文件。留空表示保持当前密钥。",
			tavilyApiKeySet: "已配置密钥。",
			tavilyApiKeyUnset: "未配置密钥；配置之前搜索不可用。",
			tavilyBaseUrl: "API Base URL",
			tavilyBaseUrlHint: "自定义代理/接口地址；留空使用 https://api.tavily.com。",
			tavilyMaxResults: "最大结果数",
			tavilyMaxResultsHint: "单次搜索返回的网页结果数量（1–20）；留空使用 5。",
			tavilySearchDepth: "搜索深度",
			tavilySearchDepthHint: "basic 均衡；advanced 深度（2 积分）；fast/ultra-fast 更低延迟（1 积分）。",
			tavilyTopic: "搜索主题",
			tavilyTopicHint: "general 通用搜索；news 新闻时效；finance 财经内容。",
			tavilyIncludeAnswer: "生成摘要答案",
			tavilyIncludeAnswerHint: "让 Tavily 直接生成摘要答案返回给 Agent：快速（true/basic）或详细（advanced）。",
			tavilyIncludeRawContent: "返回网页原始内容",
			tavilyIncludeRawContentHint: "返回网页清洗后的内容，格式 markdown/text；开启会大幅增加上下文 token 消耗。",
			tavilyTimeout: "请求超时（毫秒）",
			tavilyTimeoutHint: "搜索请求超时毫秒数；留空使用 30000。",
			tavilyDays: "时间窗口（天）",
			tavilyDaysHint: "只返回最近 N 天的结果；留空表示不限制。",
			tavilyEngine: "网页搜索引擎",
			tavilyEngineHint: "决定 web_search 由谁应答。Tavily（默认）：本插件，无 Key 走 keyless；DeepSeek：官方 DeepSeek——无需卸载即可切回。本插件已被自动选为 web_search 提供方，因此该开关真正切换引擎（不需要手动改 yaml）。",
			engineTavily: "Tavily（默认）",
			engineDeepseek: "官方 DeepSeek",
			wiringTitle: "Tavily 已被自动选为 web_search 提供方",
			wiringHint: "安装本插件会自动选举 Tavily（web.searchProvider: tavily），因此 web_search 开箱即用 Tavily。上方「网页搜索引擎」开关可切换 Tavily 或官方 DeepSeek。下方片段为可选——仅在日后想手动在 yaml 覆盖提供方时使用。",
			tavilyRetryMaxAttempts: "限流重试次数",
			tavilyRetryMaxAttemptsHint: "收到 429 后的额外重试次数（0–5）；等待会遵循 retry-after 并做有界退避。",
			tavilyCacheTtl: "缓存时长（秒）",
			tavilyCacheTtlHint: "缓存相同的查询以节省额度；0 表示关闭（0–3600）。",
			advancedTitle: "🔧 高级 Tavily 请求参数",
			searchDepthBasic: "basic（均衡）",
			searchDepthAdvanced: "advanced（深度，2 积分）",
			searchDepthFast: "fast（1 积分）",
			searchDepthUltraFast: "ultra-fast（1 积分，最低延迟）",
			topicGeneral: "general",
			topicNews: "news",
			topicFinance: "finance",
			tavilyChunksPerSource: "每个来源的片段数",
			tavilyChunksPerSourceHint: "每个来源返回的相关片段数（1–3）；越大越丰富但更耗 token。",
			tavilyTimeRange: "时间范围",
			tavilyTimeRangeHint: "时效预设（news/finance 主题），如 day、week、month、year。",
			tavilyStartDate: "开始日期",
			tavilyStartDateHint: "只返回该日期（YYYY-MM-DD）之后发布/更新的结果。",
			tavilyEndDate: "结束日期",
			tavilyEndDateHint: "只返回该日期（YYYY-MM-DD）之前发布/更新的结果。",
			tavilyIncludeImages: "包含图片",
			tavilyIncludeImagesHint: "收集与查询相关及每个来源的图片。注：当前 seam 尚未在结果中暴露图片。",
			tavilyIncludeImageDescriptions: "图片描述",
			tavilyIncludeImageDescriptionsHint: "开启“包含图片”后，为每张图片附带描述。",
			tavilyIncludeFavicon: "包含网站图标",
			tavilyIncludeFaviconHint: "请求每个结果的 favicon URL。注：当前 seam 尚未在结果中暴露 favicon。",
			tavilyIncludeDomains: "包含域名",
			tavilyIncludeDomainsHint: "只返回这些域名（逗号/空格分隔），如 example.com, docs.example.org。",
			tavilyExcludeDomains: "排除域名",
			tavilyExcludeDomainsHint: "排除这些域名（逗号/空格分隔），如 spam.com。",
			tavilyCountry: "国家加权",
			tavilyCountryHint: "偏向某一国家的结果（general 主题），如 japan、united-states。",
			includeAnswerRecommended: "true（快速）",
			includeAnswerTrue: "true（快速）",
			includeAnswerAdvanced: "advanced（详细）",
			includeAnswerFalse: "false（不生成）",
			rawContentFalse: "false（关闭）",
			rawContentMarkdown: "true / markdown",
			rawContentText: "text",
			testApi: "测试API连接",
			testingApi: "测试中…",
			testApiHint: "测试会消耗一次Tavily搜索额度。",
			testApiNeedKey: "请在上方输入 API Key 后再测试。",
			testApiKeyConfiguredNeedReentry: "已检测到配置了密钥，但浏览器出于安全设计无法读取已保存的密钥；请在上方重新输入一次密钥来完成测试（不会重复保存）。",
			testApiSuccess: "连接成功 —— Tavily 已接受请求。",
			testApiFailed: "连接失败：",
			usageEstimateLabel: "单次搜索预估成本：",
			usageEstimateCredits: "积分，",
			checkUsage: "检查用量",
			checkingUsage: "检查中…",
			checkUsageHint: "检查当前额度使用情况；与测试一样，已保存的密钥需重新输入一次。",
			usageResultLabel: "用量：",
			usageResultOf: " / ",
			usageResultSearch: " · ",
			usageUnlimited: "不限",
			usageFailed: "用量检查失败：",
			overridden: "已覆盖",
			configCovered: "该参数已被配置文件覆盖，请修改 yaml。",
			reset: "恢复默认",
			readOnly: "本部署的设置为只读。",
			expand: "展开设置",
			collapse: "收起设置",
			save: "保存",
			saving: "保存中…",
			discard: "放弃修改",
			unsaved: "未保存",
			saveFailed: "本部署没有接受这些值，已保留供你修改。",
			invalidNumber: "请填有效数字；留空表示使用默认值。",
			invalidList: "存在无法接受的项；请用逗号或空格分隔各条目。"
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
.dsh-tavily-wiring { border: 1px solid var(--dsw-alias-border-l2); border-left: 3px solid var(--dsw-alias-brand-primary); border-radius: 8px; background: var(--dsw-alias-bg-layer-3); padding: 10px 12px; margin: 12px 0 4px; }
.dsh-tavily-wiring-title { margin: 0 0 4px; font-size: 12px; font-weight: 600; line-height: 1.5; color: var(--dsw-alias-label-primary); }
.dsh-tavily-wiring-copy { margin: 0 0 8px; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.dsh-tavily-wiring-code { margin: 0; padding: 8px 10px; border-radius: 6px; background: var(--dsw-alias-bg-module-platform); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); white-space: pre; overflow-x: auto; }
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
.dsh-tavily-usage-area { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 12px 0; border-top: 1px solid var(--dsw-alias-border-l2); }
.dsh-tavily-usage-estimate { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
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
			ctx.effect(() => ctx.slots.inject("settings.plugin.item", function* () {
				yield ctx.slots.register({
					name: "settings.plugin.item",
					key: "web-search-tavily",
					locale: NS,
					inject: () => controller.inject()
				}, TavilyCard);
			}), "web-search-tavily: settings card");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
else module.exports = {};

//# sourceMappingURL=client.cjs.map