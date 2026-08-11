<script lang="ts">
	import { slide } from 'svelte/transition';

	/**
	 * One field of the English recipe, wearing the German form's clothes.
	 *
	 * The German original is reference, not a second column: it opens underneath
	 * as a quotation, and only when asked for. It asks for itself on fields that
	 * have gone stale, which is the only reason to be reading this panel closely —
	 * everything else was already agreed the last time it was approved.
	 *
	 * `variant` picks the English control's dress so it matches the German editor
	 * it stands in for: the recipe's own title and description type, a compact
	 * labelled box for the short metadata, a plain block for prose. `control` and
	 * `germanSlot` take over the two halves when a field needs its own widgets
	 * (tags being chips on both sides).
	 */
	interface Props {
		label: string;
		fieldName: string;
		german?: string;
		value?: string;
		stale?: boolean;
		/** Global "show German" from the panel header; opens every field at once. */
		showGerman?: boolean;
		variant?: 'title' | 'description' | 'compact' | 'block';
		placeholder?: string;
		onchange?: (value: string) => void;
		control?: import('svelte').Snippet;
		germanSlot?: import('svelte').Snippet;
	}

	let {
		label,
		fieldName,
		german = '',
		value = '',
		stale = false,
		showGerman = false,
		variant = 'compact',
		placeholder = '',
		onchange,
		control,
		germanSlot
	}: Props = $props();

	// Stale fields start open: the panel should say what changed before it is
	// asked. Anything the reader opens or closes by hand wins from then on.
	let manual = $state<boolean | null>(null);
	const open = $derived(manual ?? (showGerman || stale));

	const reduced =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function handleInput(event: Event) {
		onchange?.((event.target as HTMLInputElement | HTMLTextAreaElement).value);
	}
</script>

<div class="tf" class:is-stale={stale} class:tf-title={variant === 'title'}>
	<div class="tf-head">
		<span class="tf-label">
			{label}
			{#if stale}<span class="stale-badge">veraltet</span>{/if}
		</span>
		{#if german || germanSlot}
			<button
				type="button"
				class="de-toggle"
				class:is-open={open}
				aria-expanded={open}
				aria-controls="de-{fieldName}"
				onclick={() => (manual = !open)}
			>
				DE
			</button>
		{/if}
	</div>

	{#if control}
		{@render control()}
	{:else if variant === 'title'}
		<input class="en-title" type="text" {value} oninput={handleInput} {placeholder} aria-label={label} />
	{:else if variant === 'description'}
		<textarea class="en-description" rows="2" {value} oninput={handleInput} {placeholder} aria-label={label}></textarea>
	{:else if variant === 'block'}
		<textarea class="en-block" {value} oninput={handleInput} {placeholder} aria-label={label}></textarea>
	{:else}
		<input class="en-compact" type="text" {value} oninput={handleInput} {placeholder} aria-label={label} />
	{/if}

	{#if open && (german || germanSlot)}
		<div class="de-quote" id="de-{fieldName}" transition:slide={{ duration: reduced ? 0 : 140 }}>
			{#if germanSlot}
				{@render germanSlot()}
			{:else}
				{german || '—'}
			{/if}
		</div>
	{/if}
</div>

<style>
	.tf {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-bottom: 1.1rem;
	}
	/* The title and description carry the recipe's own centring, so their label
	   and reveal button centre with them rather than hugging the left edge. */
	.tf-title .tf-head {
		justify-content: center;
	}

	.tf-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.tf-label {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-tertiary);
	}
	.is-stale .tf-label {
		color: var(--orange);
	}
	.stale-badge {
		padding: 0.05rem 0.4rem;
		border-radius: var(--radius-pill);
		background: color-mix(in srgb, var(--orange) 18%, transparent);
		color: var(--orange);
		font-size: 0.65rem;
		letter-spacing: 0.04em;
		text-transform: none;
	}

	.de-toggle {
		padding: 0.05rem 0.45rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--color-text-tertiary);
		font: inherit;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		cursor: pointer;
		transition: color var(--transition-fast, 120ms), border-color var(--transition-fast, 120ms);
	}
	.de-toggle:hover,
	.de-toggle.is-open {
		color: var(--color-text-secondary);
		border-color: var(--color-text-tertiary);
	}
	.de-toggle:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* The German as a quotation: a rule in the margin and quieter type, so it
	   reads as the source being cited rather than as a second thing to fill in. */
	.de-quote {
		border-left: 2px solid var(--color-border);
		padding: 0.1rem 0 0.1rem 0.7rem;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
		line-height: 1.45;
		white-space: pre-wrap;
		overflow-wrap: break-word;
	}
	.is-stale .de-quote {
		border-left-color: var(--orange);
	}

	/* English controls, dressed as the German editor's own fields. */
	.en-title,
	.en-description {
		all: unset;
		display: block;
		box-sizing: border-box;
		width: 100%;
		text-align: center;
		border-bottom: 1px dashed transparent;
		transition: border-color 200ms ease;
	}
	.en-title {
		font-size: 2.2rem;
		font-weight: 600;
		line-height: 1.15;
		color: var(--color-text-primary);
		text-wrap: balance;
	}
	.en-description {
		padding: 0.2rem 0.4rem;
		color: var(--color-text-secondary);
		font-size: 1.05rem;
		line-height: 1.45;
		resize: none;
	}
	.en-title:hover,
	.en-description:hover,
	.en-title:focus,
	.en-description:focus {
		border-bottom-color: var(--color-border);
	}
	.en-title:focus,
	.en-description:focus {
		border-bottom-color: var(--color-primary);
	}

	.en-compact,
	.en-block {
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font: inherit;
		font-size: 0.95rem;
		width: 100%;
		box-sizing: border-box;
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}
	.en-block {
		min-height: 5rem;
		resize: vertical;
		line-height: 1.5;
	}
	.en-compact:focus,
	.en-block:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent);
	}

	@media (max-width: 640px) {
		.en-title {
			font-size: 1.6rem;
		}
	}
</style>
