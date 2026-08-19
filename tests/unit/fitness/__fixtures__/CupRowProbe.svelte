<script>
	// Mirrors how the liquids card wires its cup row: counts derived per drink
	// kind, an effect that diffs those runs to find what moved, a layout frozen
	// while cups drain, and an index-keyed each with the add button placed after
	// the last mug. Keep it in step with the real page — its whole job is to catch
	// what a pure test of cupRowChange cannot.
	import { cupRowChange } from '$lib/fitness/cupRow';

	/** @typedef {{ kind: 'hot' | 'water', ml: number }} ProbeEntry */
	/** @type {{ entries: ProbeEntry[] }} */
	let { entries } = $props();

	const CUP = 250;
	const hotMl = $derived(entries.filter(e => e.kind === 'hot').reduce((/** @type {number} */ s, e) => s + e.ml, 0));
	const waterMl = $derived(entries.filter(e => e.kind === 'water').reduce((/** @type {number} */ s, e) => s + e.ml, 0));
	const hotCups = $derived(Math.round(hotMl / CUP));
	const waterCups = $derived(Math.round(waterMl / CUP));

	let fillingCups = $state(new Set());
	let drainingCups = $state(new Set());
	/** @type {number[] | null} */
	let frozenRuns = $state(null);

	const cupRuns = $derived([hotCups, 0, 0, waterCups]);
	const rowRuns = $derived(frozenRuns ?? cupRuns);
	const rowHotCups = $derived(rowRuns[0]);
	const rowTotalCups = $derived(rowRuns[0] + rowRuns[1] + rowRuns[2] + rowRuns[3]);
	const displayCups = $derived(Math.max(8, rowTotalCups + 1));

	/**
	 * Plain `let`, not `$state`: as state the array is deep-proxied on write, so the
	 * next read never equals what was stored and this effect re-triggers itself.
	 * @type {number[] | null}
	 */
	let lastCupRuns = null;

	$effect(() => {
		const cur = cupRuns;
		const prev = lastCupRuns;
		lastCupRuns = cur;
		if (!prev) return;
		const change = cupRowChange(prev, cur);
		if (!change) return;
		if (change.kind === 'fill') {
			fillingCups = new Set(change.indices);
			setTimeout(() => { fillingCups = new Set(); }, 1500);
		} else {
			frozenRuns = prev;
			drainingCups = new Set(change.indices);
			setTimeout(() => { drainingCups = new Set(); frozenRuns = null; }, 700);
		}
	});
</script>

<div>
	{#if rowHotCups === 0}<button aria-label="add mug" data-testid="ghost"></button>{/if}
	{#each Array(displayCups) as _, i}
		<button
			aria-label="cup {i + 1}"
			data-testid="cup-{i}"
			class:filling={fillingCups.has(i)}
			class:draining={drainingCups.has(i)}
			class:hot={i < rowHotCups}
		></button>
		{#if i === rowHotCups - 1}<button aria-label="add mug" data-testid="ghost"></button>{/if}
	{/each}
</div>
