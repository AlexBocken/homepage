<script>
	/**
	 * Amount entry with an optional portion basis: "[2] [1 Packung (250g) ▾] = 500g".
	 *
	 * `grams` is the canonical output and is always kept in sync — callers log it
	 * verbatim and never reimplement the qty × portion math. `selectedPortion` is
	 * the chosen basis (undefined = plain grams), stored alongside the entry purely
	 * so the amount can be shown and re-edited in the same terms it was entered.
	 *
	 * Used by every surface that adds or edits a food-log amount: FoodSearch, the
	 * food-detail page, the day view's inline edit, and the quick-log sidebar.
	 */
	import { untrack } from 'svelte';
	import { portionOptionLabel } from '$lib/fitness/portions';

	/**
	 * @typedef {{ description: string, grams: number }} Portion
	 */

	/**
	 * @type {{
	 *   grams: number,
	 *   portions?: Portion[],
	 *   selectedPortion?: Portion | undefined,
	 *   autofocus?: boolean,
	 *   showGramsHint?: boolean,
	 *   size?: 'normal' | 'compact',
	 *   onenter?: () => void,
	 * }}
	 */
	let {
		grams = $bindable(0),
		portions = [],
		selectedPortion = $bindable(undefined),
		autofocus = false,
		showGramsHint = true,
		size = 'normal',
		onenter = undefined,
	} = $props();

	/**
	 * The dropdown's choices. A stored `selectedPortion` that's no longer offered by
	 * the source (a reformulated package) is appended rather than dropped, so an old
	 * entry still edits in the units it was logged in.
	 * @type {Portion[]}
	 */
	const options = $derived.by(() => {
		const list = [...(portions ?? [])];
		if (selectedPortion && !list.some(p => samePortion(p, selectedPortion))) {
			list.push(selectedPortion);
		}
		return list;
	});

	/**
	 * @param {Portion} a
	 * @param {Portion | undefined} b
	 */
	function samePortion(a, b) {
		return !!b && a.description === b.description && Math.abs(a.grams - b.grams) < 0.5;
	}

	// -1 = plain grams. Initialised from the incoming basis so editing an existing
	// entry reopens on the portion it was logged with.
	let portionIdx = $state(-1);
	let qty = $state(0);

	// Seeded once per mount from the initial grams/portion; afterwards the handlers
	// below own both directions, so no $effect can fight the user's typing. The
	// initial read is deliberately untracked — later option changes must not reset
	// an amount the user is in the middle of editing.
	untrack(() => {
		const idx = selectedPortion ? options.findIndex(p => samePortion(p, selectedPortion)) : -1;
		portionIdx = idx;
		qty = idx >= 0 && options[idx] ? backComputeQty(grams, options[idx]) : round1(grams);
	});

	/** @param {number} v */
	function round1(v) {
		return Math.round(v * 10) / 10;
	}

	/**
	 * How many portions the gram amount is. Two decimals, not one: at one decimal a
	 * 30 g amount on a 250 g package rounds to 0.1 → 25 g, silently editing the
	 * user's number the moment they open the dropdown.
	 * @param {number} g
	 * @param {Portion} p
	 */
	function backComputeQty(g, p) {
		if (!(p.grams > 0)) return round1(g);
		return Math.round((g / p.grams) * 100) / 100;
	}

	/** Push the current qty + basis out as canonical grams. */
	function apply() {
		const p = portionIdx >= 0 ? options[portionIdx] : null;
		const n = Number(qty) || 0;
		if (p) {
			grams = Math.round(n * p.grams);
			selectedPortion = p;
		} else {
			grams = Math.round(n);
			selectedPortion = undefined;
		}
	}

	/** Switching the basis holds the gram amount steady and restates it in new units. */
	function onPortionChange() {
		const p = portionIdx >= 0 ? options[portionIdx] : null;
		qty = p ? backComputeQty(grams, p) || 1 : round1(grams) || 100;
		apply();
	}

	/** @param {KeyboardEvent} e */
	function onKeydown(e) {
		if (e.key === 'Enter' && onenter) {
			e.preventDefault();
			onenter();
		}
	}

	const hasPortions = $derived(options.length > 0);
</script>

<div class="pa-row" class:compact={size === 'compact'}>
	<!-- svelte-ignore a11y_autofocus -->
	<input
		type="number"
		class="pa-qty"
		bind:value={qty}
		oninput={apply}
		onkeydown={onKeydown}
		min="0.1"
		step={portionIdx >= 0 ? '0.5' : '1'}
		autofocus={autofocus}
		aria-label={portionIdx >= 0 ? 'Amount' : 'Grams'}
	/>
	{#if hasPortions}
		<select class="pa-unit" bind:value={portionIdx} onchange={onPortionChange} aria-label="Unit">
			<option value={-1}>g</option>
			{#each options as p, i (i)}
				<option value={i}>{portionOptionLabel(p)}</option>
			{/each}
		</select>
	{:else}
		<span class="pa-unit-label">g</span>
	{/if}
</div>
{#if showGramsHint && portionIdx >= 0 && grams > 0}
	<span class="pa-hint">= {grams} g</span>
{/if}

<style>
	.pa-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.pa-qty {
		width: 5rem;
		padding: 0.45rem 0.55rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: 0.9rem;
		text-align: right;
		box-sizing: border-box;
		transition: border-color var(--transition-fast);
	}
	.pa-qty:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.pa-unit {
		padding: 0.45rem 0.4rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: 0.78rem;
		min-width: 0;
		flex: 1;
		transition: border-color var(--transition-fast);
	}
	.pa-unit:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.pa-unit-label {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}
	.pa-hint {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	/* Inline edit rows and the quick-log sidebar are tight on width. */
	.pa-row.compact .pa-qty {
		width: 3.6rem;
		padding: 0.3rem 0.4rem;
		font-size: 0.8rem;
	}
	.pa-row.compact .pa-unit {
		padding: 0.3rem 0.3rem;
		font-size: 0.7rem;
	}
</style>
