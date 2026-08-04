<script>
	/**
	 * The workout note, written mid-session.
	 *
	 * A bottom sheet rather than an inline field: during a workout the screen belongs
	 * to the set in front of you, and a textarea competing with the weight and rep
	 * inputs would be in the way ninety percent of the time. It rises from the bottom
	 * where the thumb already is, takes the note, and gets out of the way.
	 *
	 * Deliberately not a form — there is no Save. Every keystroke is pushed to the
	 * workout store, which persists it, so closing the sheet mid-word (or losing the
	 * tab, or the phone locking) keeps what was typed. "Done" only dismisses.
	 *
	 * The textarea holds its own draft and never reads the bound value back while open.
	 * That value round-trips through the cross-device sync, and an echo landing between
	 * two keystrokes would otherwise rewrite the field under the cursor — which is
	 * exactly how a trailing space disappears as the next word is typed. Same reason the
	 * workout-name input keeps a local mirror while it has focus.
	 */
	import X from '@lucide/svelte/icons/x';

	/** Matches the note field on both the live workout and the saved session. */
	const NOTE_MAX = 1000;

	/** @type {{
	 *   value: string,
	 *   title: string,
	 *   placeholder?: string,
	 *   doneLabel: string,
	 *   closeLabel: string,
	 *   onClose: () => void,
	 * }} */
	let {
		value = $bindable(''),
		title,
		placeholder = '',
		doneLabel,
		closeLabel,
		onClose
	} = $props();

	// Seeded once, on open; from here the draft is the truth and `value` only receives.
	let draft = $state(value);

	/** @param {Event} e */
	function onInput(e) {
		draft = /** @type {HTMLTextAreaElement} */ (e.currentTarget).value;
		value = draft;
	}

	/** @param {HTMLTextAreaElement} node */
	function autofocus(node) {
		// Straight into typing: the sheet is only ever opened to write.
		node.focus();
		node.setSelectionRange(node.value.length, node.value.length);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="note-overlay" onkeydown={(e) => e.key === 'Escape' && onClose()}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="note-backdrop" onclick={onClose}></div>
	<div class="note-panel" role="dialog" aria-label={title}>
		<div class="note-header">
			<h2>{title}</h2>
			<button class="close-btn" onclick={onClose} aria-label={closeLabel}>
				<X size={20} />
			</button>
		</div>
		<div class="note-body">
			<textarea
				value={draft}
				oninput={onInput}
				{placeholder}
				rows="5"
				maxlength={NOTE_MAX}
				{@attach autofocus}
			></textarea>
		</div>
		<button class="note-done" onclick={onClose}>{doneLabel}</button>
	</div>
</div>

<style>
	.note-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}
	.note-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
	}
	.note-panel {
		position: relative;
		width: 100%;
		max-width: 500px;
		background: var(--color-bg-secondary);
		border-radius: 16px 16px 0 0;
		display: flex;
		flex-direction: column;
		padding-bottom: env(safe-area-inset-bottom, 0px);
	}
	.note-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
	}
	.note-header h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.25rem;
	}
	.note-body {
		padding: 1rem;
	}
	/* The margin rule marks a note wherever one appears — here, on the completion
	   screen, and in the history detail view. */
	textarea {
		width: 100%;
		box-sizing: border-box;
		resize: vertical;
		font: inherit;
		font-size: 1rem;
		line-height: 1.6;
		padding: 0.7rem 0.85rem;
		color: var(--color-text-primary);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--color-primary);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}
	textarea::placeholder {
		color: var(--color-text-tertiary);
	}
	textarea:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.note-done {
		margin: 0 1rem 1rem;
		padding: 0.8rem;
		border: none;
		border-radius: var(--radius-md);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.note-done:hover {
		background: var(--color-primary-hover);
	}
</style>
