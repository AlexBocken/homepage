<script>
	/**
	 * A recipe this recipe is built on.
	 *
	 * These were invisible in the old table — a `type: 'reference'` section has no
	 * mapping to put in a row, and an anchor reference showed as a bare "REF" badge
	 * — while contributing most of the dish. A pizza is mostly dough.
	 *
	 * So the card states what it actually adds: its weight, its calories, and its
	 * share of the pot. And its own mapping coverage, because a base recipe that is
	 * three-quarters mapped makes everything above it a guess in that proportion,
	 * which nothing anywhere used to say.
	 */
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Pencil from '@lucide/svelte/icons/pencil';
	import X from '@lucide/svelte/icons/x';

	/**
	 * @typedef {{
	 *   row: import('$lib/js/nutritionTriage').MapperRow & { kind: 'base' },
	 *   reference: { name?: string, totalGrams?: number, nutrition?: Record<string, number>, baseMultiplier?: number, coverage?: number } | undefined,
	 *   recipeGrams: number,
	 *   onmultiplierchange: ((value: number) => void) | undefined,
	 *   onrefchange: ((slug: string) => void) | undefined,
	 * }} Props
	 */

	/** @type {Props} */
	let { row, reference, recipeGrams, onmultiplierchange, onrefchange } = $props();

	// --- Picking the recipe by hand ---------------------------------------
	// The link in an ingredient's name is usually right, but it can point at a slug
	// that was renamed or deleted, and there is no other way to say which recipe a
	// line means. Only offered where the mapping can hold the answer: a
	// `type: 'reference'` section stores its target on the ingredient itself.
	let picking = $state(false);
	let query = $state('');
	/** @type {{ shortName?: string, name: string, id: string }[]} */
	let results = $state([]);
	let searching = $state(false);
	/** @type {ReturnType<typeof setTimeout> | null} */
	let timer = null;

	function search(/** @type {string} */ value) {
		query = value;
		if (timer) clearTimeout(timer);
		if (value.trim().length < 2) {
			results = [];
			return;
		}
		searching = true;
		timer = setTimeout(async () => {
			try {
				const res = await fetch(
					`/api/nutrition/search?q=${encodeURIComponent(value.trim())}&sources=recipe`
				);
				if (res.ok) results = await res.json();
			} catch {
				results = [];
			} finally {
				searching = false;
			}
		}, 200);
	}

	function choose(/** @type {{ shortName?: string }} */ hit) {
		if (!hit.shortName || !onrefchange) return;
		onrefchange(hit.shortName);
		picking = false;
		query = '';
		results = [];
	}

	const multiplier = $derived(reference?.baseMultiplier ?? 1);
	const grams = $derived((reference?.totalGrams ?? 0) * multiplier);
	const kcal = $derived(Math.round((reference?.nutrition?.calories ?? 0) * multiplier));
	const share = $derived(recipeGrams > 0 ? Math.round((grams / recipeGrams) * 100) : null);
	const coverage = $derived(reference?.coverage ?? 1);
	const displayName = $derived((reference?.name || row.name || row.slug || '').replace(/&shy;|­/g, ''));

	function fmtGrams(/** @type {number} */ g) {
		return Math.round(g).toLocaleString('de-CH');
	}
</script>

<article class="card" class:is-missing={!reference} data-base-card id="map-{row.key}" aria-label={displayName}>
	<div class="head">
		<span class="num">{row.index}</span>

		<div class="line">
			<div class="line-main">
				<span class="badge">Grundrezept</span>
				{#if row.slug}
					<a class="name" href="/rezepte/{row.slug}" target="_blank" rel="noopener">
						{displayName}<ExternalLink size={12} />
					</a>
				{:else}
					<span class="name">{displayName || 'Unbekanntes Rezept'}</span>
				{/if}
			</div>

			{#if reference}
				<div class="line-facts">
					<span class="grams">{fmtGrams(grams)} g</span>
					{#if kcal > 0}<span>{kcal.toLocaleString('de-CH')} kcal</span>{/if}
					{#if share !== null}<span>{share}% des Rezepts</span>{/if}
				</div>
				{#if coverage < 0.999}
					<p class="warn">
						<TriangleAlert size={11} />
						Nur {Math.round(coverage * 100)}% dieses Grundrezepts sind selbst zugeordnet — die Werte oben
						sind im gleichen Mass unvollständig.
					</p>
				{/if}
			{:else}
				<p class="warn">
					<TriangleAlert size={11} />
					{#if row.slug}
						Kein Rezept mit dem Kurznamen <code>{row.slug}</code> — es fliesst nichts in die Summe
						ein. Wähle das richtige Rezept aus.
					{:else}
						Kein Rezept zugeordnet — es fliesst nichts in die Summe ein.
					{/if}
				</p>
			{/if}

			{#if onrefchange}
				{#if picking}
					<div class="picker">
						<div class="picker-row">
							<!-- svelte-ignore a11y_autofocus -->
							<input
								type="text"
								class="picker-input"
								placeholder="Rezept suchen…"
								aria-label="Grundrezept suchen"
								autofocus
								value={query}
								oninput={(e) => search(e.currentTarget.value)}
							/>
							<button type="button" class="picker-close" aria-label="Abbrechen" onclick={() => (picking = false)}>
								<X size={14} />
							</button>
						</div>
						{#if results.length > 0}
							<ul class="picker-results">
								{#each results as hit (hit.id)}
									<li>
										<button type="button" onclick={() => choose(hit)} disabled={!hit.shortName}>
											{hit.name}
											{#if hit.shortName}<code>{hit.shortName}</code>{/if}
										</button>
									</li>
								{/each}
							</ul>
						{:else if query.trim().length >= 2 && !searching}
							<p class="picker-empty">Kein Rezept gefunden.</p>
						{/if}
					</div>
				{:else}
					<button type="button" class="pick-btn" onclick={() => (picking = true)}>
						<Pencil size={11} />
						{reference ? 'Anderes Rezept wählen' : 'Rezept wählen'}
					</button>
				{/if}
			{/if}
		</div>

		{#if onmultiplierchange}
			<label class="mult">
				<span>Anteil</span>
				<input
					type="number"
					min="0"
					max="10"
					step="0.1"
					inputmode="decimal"
					value={row.mapping?.recipeRefMultiplier ?? 1}
					oninput={(e) => onmultiplierchange(Number(e.currentTarget.value) || 0)}
				/>
			</label>
		{:else}
			<!-- A `type: 'reference'` section owns its own multiplier, edited in the
			     ingredient list above. Two editors for one number is how they drift. -->
			<span class="mult-static" title="Im Zutaten-Abschnitt oben änderbar">×{multiplier}</span>
		{/if}
	</div>
</article>

<style>
	.card {
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--lightblue);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}
	.card.is-missing {
		border-left-color: var(--orange);
	}

	.head {
		display: grid;
		grid-template-columns: 1.6rem 1fr auto;
		align-items: start;
		gap: 0.6rem;
		padding: 0.6rem 0.7rem;
	}

	.num {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
		text-align: right;
		padding-top: 0.15rem;
	}

	.line {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}
	.line-main {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.badge {
		padding: 0.05rem 0.3rem;
		border-radius: 3px;
		background: color-mix(in srgb, var(--lightblue) 18%, transparent);
		color: var(--lightblue);
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.name {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--color-text-primary);
		text-decoration: none;
	}
	a.name:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}

	.line-facts {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}
	.grams {
		font-weight: 700;
		color: var(--color-text-secondary);
	}

	.warn {
		display: flex;
		align-items: flex-start;
		gap: 0.25rem;
		margin: 0.15rem 0 0;
		font-size: 0.7rem;
		line-height: 1.35;
		color: var(--orange);
	}
	.warn :global(svg) {
		flex: none;
		margin-top: 0.15em;
	}

	code {
		padding: 0 0.2rem;
		border-radius: 3px;
		background: var(--color-bg-tertiary);
		font-size: 0.92em;
	}

	/* --- Picking the recipe by hand --- */
	.pick-btn {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.15rem;
		padding: 0.15rem 0.45rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text-secondary);
		font-size: 0.68rem;
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}
	.pick-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.picker {
		margin-top: 0.35rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.picker-row {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.picker-input {
		flex: 1;
		min-width: 0;
		padding: 0.35rem 0.5rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-primary);
		font-size: 0.8rem;
	}
	.picker-close {
		display: inline-flex;
		padding: 0.25rem;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-text-tertiary);
		cursor: pointer;
	}
	.picker-close:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.picker-results {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 12rem;
		overflow-y: auto;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}
	.picker-results button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.35rem 0.5rem;
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text-primary);
		font-size: 0.78rem;
		text-align: left;
		cursor: pointer;
	}
	.picker-results li:last-child button {
		border-bottom: none;
	}
	.picker-results button:hover {
		background: var(--color-bg-elevated);
	}
	.picker-empty {
		margin: 0;
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
	}

	.mult {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.mult input {
		width: 3.6rem;
		padding: 0.3rem 0.4rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-primary);
		font-size: 0.82rem;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.mult-static {
		align-self: center;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 560px) {
		.head {
			grid-template-columns: 1.4rem 1fr auto;
		}
	}
</style>
