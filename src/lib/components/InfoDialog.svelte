<script>
	/**
	 * A full-screen explainer: the page dimmed and blurred behind a centred card.
	 *
	 * The shape to reach for when the text is too long to hang off an (i) as a
	 * popover — several paragraphs, or a list of citations. A popover that tall is
	 * unreadable on a phone and covers the very thing it is annotating; this takes
	 * the screen, admits it, and lets the page show through as blurred context.
	 *
	 * The scrim uses the shared `--scrim-*` tokens, so every dialog on the site
	 * dims and blurs to the same depth (see app.css → Modal scrim).
	 *
	 * Owns no state: the caller keeps `open` and handles `onclose`, because the
	 * trigger is always the caller's — a corner pip on one page, an inline (i) on
	 * another.
	 *
	 * Must not be mounted inside an element with `backdrop-filter`, `filter`,
	 * `opacity < 1` or `view-transition-name`: that makes an ancestor a backdrop
	 * root and the scrim's blur silently does nothing, `position: fixed` or not.
	 * See CLAUDE.md → Glassmorphism.
	 *
	 * @type {{
	 *   open: boolean,
	 *   title: string,
	 *   closeLabel?: string,
	 *   onclose: () => void,
	 *   children: import('svelte').Snippet,
	 * }}
	 */
	let { open, title, closeLabel = 'Close', onclose, children } = $props();

	import X from '@lucide/svelte/icons/x';

	const titleId = $props.id();
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') onclose(); }} />

{#if open}
	<div class="info-backdrop" onclick={onclose} role="presentation">
		<!-- Clicks inside the card must not reach the backdrop's close handler; the
		     same for keys, so Escape is handled once by the window listener. -->
		<div
			class="info-dialog"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			tabindex="-1"
		>
			<button class="info-close" type="button" onclick={onclose} aria-label={closeLabel}>
				<X size={16} strokeWidth={2} />
			</button>
			<h3 id={titleId} class="info-title">{title}</h3>
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.info-backdrop {
		position: fixed;
		inset: 0;
		background: var(--scrim-bg);
		backdrop-filter: blur(var(--scrim-blur));
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		animation: info-fade 150ms ease-out;
	}
	.info-dialog {
		position: relative;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 14px;
		padding: 1.5rem 1.5rem 1.25rem;
		max-width: 560px;
		width: 100%;
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		box-shadow: var(--shadow-lg);
		animation: info-scale 150ms ease-out;
		color: var(--color-text-primary);
		/* The card carries its own reading defaults so callers can pass plain
		   paragraphs and lists rather than restyling prose at every call site. */
		font-size: 0.92rem;
		font-weight: 400;
		line-height: 1.55;
		text-align: left;
		text-transform: none;
		letter-spacing: normal;
	}
	.info-close {
		position: absolute;
		top: 0.55rem;
		right: 0.55rem;
		display: grid;
		place-items: center;
		width: 1.85rem;
		height: 1.85rem;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: inherit;
		opacity: 0.6;
		cursor: pointer;
		transition: opacity var(--transition-fast), background var(--transition-fast);
	}
	.info-close:hover,
	.info-close:focus-visible {
		opacity: 1;
		background: var(--color-bg-elevated);
	}
	.info-title {
		margin: 0 2rem 0.85rem 0;
		font-size: 1.1rem;
		font-weight: 700;
	}

	/* Blur ramps in with the scrim, the same way ConfirmDialog's does. */
	@keyframes info-fade {
		from { opacity: 0; backdrop-filter: blur(0px); }
		to { opacity: 1; backdrop-filter: blur(var(--scrim-blur)); }
	}
	@keyframes info-scale {
		from { opacity: 0; transform: scale(0.96); }
		to { opacity: 1; transform: scale(1); }
	}
</style>
