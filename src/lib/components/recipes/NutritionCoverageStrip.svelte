<script>
	/**
	 * How much of the dish the mappings account for, and what is left to do.
	 *
	 * The bar is one segment per ingredient, sized by the grams it contributes.
	 * A count — "12 von 14 zugeordnet" — cannot say that the two missing ones are
	 * most of the pot, and that is the only version of the question worth asking
	 * before trusting the numbers underneath.
	 *
	 * Clicking a segment scrolls to its card, so the bar is also the way into the
	 * work rather than only a report on it.
	 */

	/**
	 * @typedef {import('$lib/js/nutritionTriage').MapperRow} MapperRow
	 * @typedef {import('$lib/js/nutritionTriage').TriageState} TriageState
	 * @typedef {{
	 *   rows: MapperRow[],
	 *   coverage: import('$lib/js/nutritionTriage').Coverage,
	 *   filter: TriageState | 'all',
	 *   onfilter: (state: TriageState | 'all') => void,
	 *   onjump: (key: string) => void,
	 * }} Props
	 */

	/** @type {Props} */
	let { rows, coverage, filter, onfilter, onjump } = $props();

	const STATE_LABEL = {
		all: 'Alle',
		open: 'Offen',
		unsure: 'Unsicher',
		ok: 'Zugeordnet',
		skipped: 'Übersprungen',
		ref: 'Grundrezepte',
	};

	/** Filters worth offering: a bucket nobody has anything in is noise. */
	const chips = $derived(
		/** @type {(TriageState | 'all')[]} */ (['all', 'open', 'unsure', 'ok', 'ref', 'skipped']).filter(
			(key) => key === 'all' || coverage.counts[key] > 0
		)
	);

	function count(/** @type {TriageState | 'all'} */ key) {
		return key === 'all' ? rows.length : coverage.counts[key];
	}

	// Segments are proportional to grams, but a line whose unit could not be read
	// has no width at all and would vanish from a bar that is meant to show you
	// everything. Those get a hairline share so they stay clickable.
	const MIN_SHARE = 0.008;
	const segments = $derived.by(() => {
		const weights = rows.map((r) => (r.kind === 'ingredient' ? r.nominalGrams : r.grams));
		const total = weights.reduce((a, b) => a + b, 0);
		const shares = weights.map((w) => (total > 0 ? Math.max(w / total, MIN_SHARE) : 1 / (rows.length || 1)));
		const sum = shares.reduce((a, b) => a + b, 0) || 1;
		return rows.map((row, i) => ({
			key: row.key,
			state: row.state,
			pct: (shares[i] / sum) * 100,
			label: row.kind === 'ingredient' ? row.line?.name : row.slug,
			grams: row.kind === 'ingredient' ? row.nominalGrams : row.grams,
		}));
	});

	const pct = $derived(
		coverage.totalGrams > 0 ? Math.round((coverage.coveredGrams / coverage.totalGrams) * 100) : 0
	);

	function fmtGrams(/** @type {number} */ g) {
		return Math.round(g).toLocaleString('de-CH');
	}

	function stripHtml(/** @type {string} */ s) {
		return (s || '').replace(/<[^>]*>/g, '');
	}
</script>

<div class="coverage">
	<div class="coverage-head">
		<span class="coverage-pct">{pct}<small>%</small></span>
		<span class="coverage-note">
			des Gewichts erfasst — {fmtGrams(coverage.coveredGrams)} von {fmtGrams(coverage.totalGrams)} g
		</span>
	</div>

	<div class="strip" role="group" aria-label="Zuordnung nach Gewicht">
		{#each segments as seg (seg.key)}
			<button
				type="button"
				class="seg"
				data-state={seg.state}
				style="flex-grow: {seg.pct}"
				title="{stripHtml(seg.label)} · {fmtGrams(seg.grams)} g"
				aria-label="Zu {stripHtml(seg.label)} springen"
				onclick={() => onjump(seg.key)}
			></button>
		{/each}
	</div>

	<div class="chips" role="group" aria-label="Filter">
		{#each chips as key (key)}
			<button
				type="button"
				class="chip"
				data-filter={key}
				data-state={key}
				class:is-on={filter === key}
				aria-pressed={filter === key}
				onclick={() => onfilter(key)}
			>
				{STATE_LABEL[key]}
				<span class="chip-count">{count(key)}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.coverage {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.coverage-head {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.coverage-pct {
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.coverage-pct small {
		font-size: 0.9rem;
		font-weight: 600;
		margin-left: 0.05em;
	}
	.coverage-note {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	/* One segment per ingredient, width proportional to what it contributes. */
	.strip {
		display: flex;
		gap: 2px;
		height: 14px;
		border-radius: var(--radius-sm);
		overflow: hidden;
	}
	.seg {
		flex-basis: 0;
		min-width: 3px;
		border: none;
		padding: 0;
		cursor: pointer;
		background: var(--color-bg-elevated);
		transition: filter var(--transition-fast);
	}
	.seg:hover,
	.seg:focus-visible {
		filter: brightness(1.25);
		outline: none;
	}
	.seg:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}

	/* Two accents only, and both mean "act on me": orange for a line with no
	   match, yellow for one worth a second look. Everything settled is quiet. */
	.seg[data-state='ok'] { background: var(--green); }
	.seg[data-state='ref'] { background: var(--lightblue); }
	.seg[data-state='unsure'] { background: var(--yellow); }
	.seg[data-state='open'] { background: var(--orange); }
	.seg[data-state='skipped'] {
		background: repeating-linear-gradient(
			45deg,
			var(--color-bg-elevated),
			var(--color-bg-elevated) 3px,
			var(--color-bg-tertiary) 3px,
			var(--color-bg-tertiary) 6px
		);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem 0.6rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text-secondary);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition: all var(--transition-fast);
	}
	.chip:hover {
		border-color: var(--color-text-tertiary);
	}
	.chip.is-on {
		background: color-mix(in srgb, var(--color-primary) 15%, transparent);
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.chip[data-state='open'].is-on {
		background: color-mix(in srgb, var(--orange) 15%, transparent);
		border-color: var(--orange);
		color: var(--orange);
	}
	.chip[data-state='unsure'].is-on {
		background: color-mix(in srgb, var(--yellow) 20%, transparent);
		border-color: var(--yellow);
		color: var(--color-text-primary);
	}
	.chip-count {
		font-variant-numeric: tabular-nums;
		opacity: 0.75;
	}

	@media (max-width: 560px) {
		.coverage-pct {
			font-size: 1.3rem;
		}
	}
</style>
