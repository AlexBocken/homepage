<script lang="ts">
	// Tag selection by typeahead — same interaction as the recipe TagFilter:
	// a text field that opens a dropdown of matching tags, with the picked
	// tags shown below as removable chips. Themed with the semantic variables
	// (the recipe original hardcodes Nord values) so it fits the filter panel
	// in both colour schemes.
	import type { SvelteSet } from 'svelte/reactivity';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		/** All selectable tags, in display order (frequency-sorted upstream). */
		tags: string[];
		/** Currently-selected tags. Mutated via {@link onToggle}. */
		selected: SvelteSet<string>;
		onToggle: (tag: string) => void;
	}

	const { tags, selected, onToggle }: Props = $props();

	let inputValue = $state('');
	let open = $state(false);
	let wrapper = $state<HTMLElement>();
	let inputEl = $state<HTMLInputElement>();

	const unselected = $derived(tags.filter((t) => !selected.has(t)));

	const filtered = $derived(
		inputValue.trim() === ''
			? unselected
			: unselected.filter((t) => t.toLowerCase().includes(inputValue.trim().toLowerCase()))
	);

	// Selected tags kept in the canonical display order rather than click order.
	const selectedList = $derived(tags.filter((t) => selected.has(t)));

	function pick(tag: string) {
		onToggle(tag);
		inputValue = '';
		// Keep the field focused so several tags can be added in a row.
		inputEl?.focus();
		open = true;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const value = inputValue.trim().toLowerCase();
			const match = filtered.find((t) => t.toLowerCase() === value) ?? filtered[0];
			if (match) pick(match);
		} else if (e.key === 'Escape') {
			if (inputValue) {
				inputValue = '';
			} else {
				open = false;
				inputEl?.blur();
			}
		}
	}

	// Close when focus leaves the whole widget (click-away / tab-out), but stay
	// open while moving between the input and its dropdown chips.
	function onFocusOut(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		if (!next || !wrapper?.contains(next)) open = false;
	}
</script>

<div class="tt" bind:this={wrapper} onfocusout={onFocusOut}>
	<div class="tt-field">
		<input
			class="tt-input"
			type="text"
			bind:this={inputEl}
			bind:value={inputValue}
			onfocus={() => (open = true)}
			onkeydown={onKey}
			placeholder="Schlagwort eingeben oder auswählen…"
			autocomplete="off"
			role="combobox"
			aria-expanded={open}
			aria-controls="tt-dropdown"
		/>

		{#if open && filtered.length > 0}
			<div class="tt-dropdown" id="tt-dropdown">
				{#each filtered as tag (tag)}
					<button type="button" class="tt-option" onclick={() => pick(tag)}>
						<span class="tt-hash" aria-hidden="true">#</span>{tag}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if selectedList.length > 0}
		<div class="tt-selected">
			{#each selectedList as tag (tag)}
				<button
					type="button"
					class="tt-chip"
					onclick={() => onToggle(tag)}
					aria-label="{tag} entfernen"
				>
					<span class="tt-hash" aria-hidden="true">#</span>{tag}
					<X size={13} strokeWidth={2} aria-hidden="true" />
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tt {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.tt-field {
		position: relative;
	}

	.tt-input {
		box-sizing: border-box;
		width: 100%;
		font: inherit;
		font-size: 0.85rem;
		padding: 0.5rem 0.7rem;
		color: var(--color-text-primary);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		transition: border-color var(--transition-fast);
	}

	.tt-input::placeholder {
		color: var(--color-text-tertiary);
	}

	.tt-input:focus-visible {
		outline: none;
		border-color: var(--color-primary);
	}

	.tt-dropdown {
		position: absolute;
		top: calc(100% + 0.3rem);
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		max-height: 200px;
		overflow-y: auto;
		padding: 0.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
	}

	.tt-option {
		appearance: none;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.25rem 0.7rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		color: var(--color-text-secondary);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		transition: scale var(--transition-fast), background-color var(--transition-fast),
			color var(--transition-fast);
	}

	.tt-option:hover {
		scale: 1.05;
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.tt-selected {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.tt-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		appearance: none;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.25rem 0.5rem 0.25rem 0.7rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		color: var(--color-text-on-primary);
		background: var(--color-primary);
		border: 1px solid var(--color-primary);
		transition: scale var(--transition-fast), background-color var(--transition-fast);
	}

	.tt-chip:hover {
		scale: 1.05;
		background: var(--color-primary-hover);
		border-color: var(--color-primary-hover);
	}

	.tt-chip :global(svg) {
		opacity: 0.85;
	}

	.tt-hash {
		opacity: 0.6;
		font-weight: 600;
	}

	.tt-chip .tt-hash {
		opacity: 0.85;
	}
</style>
