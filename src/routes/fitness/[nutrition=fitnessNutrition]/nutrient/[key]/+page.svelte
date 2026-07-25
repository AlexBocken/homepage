<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { detectFitnessLang, fitnessSlugs } from '$lib/js/fitnessI18n';
	import { formatGrams as fmt } from '$lib/fitness/nutritionMath';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const isEn = $derived(lang === 'en');
	const slugs = $derived(fitnessSlugs(lang));

	const meta = $derived(data.meta);
	const label = $derived(isEn ? meta.label : meta.labelDe);
	const rows = $derived(data.contributions.rows);
	const unreported = $derived(data.contributions.unreported);
	const total = $derived(data.contributions.total);

	// Bars are scaled to the biggest contributor rather than to the total: most days
	// have one dominant food, and scaling to the total would leave everything else
	// as a sliver too short to compare.
	const byEnergy = $derived(data.sortBy === 'per100kcal');

	const maxAmount = $derived(Math.max(0, ...rows.map(r => r.amount)));
	const maxPer100kcal = $derived(Math.max(0, ...rows.map(r => r.per100kcal ?? 0)));

	const goalPct = $derived(data.goal > 0 ? Math.round((total / data.goal) * 100) : null);

	const coverageGapPct = $derived(Math.round((1 - (data.contributions.coverage ?? 1)) * 100));

	const periodLabel = $derived(
		data.isRange
			? (isEn ? `${data.days}-day average` : `${data.days}-Tage-Durchschnitt`)
			: (data.date ?? '')
	);

	/** Preserves the window while switching the ordering. */
	function hrefWith(/** @type {'amount' | 'per100kcal'} */ by) {
		const q = new URLSearchParams();
		if (data.isRange) q.set('days', String(data.days));
		else if (data.date) q.set('date', data.date);
		if (by === 'per100kcal') q.set('by', 'per100kcal');
		const qs = q.toString();
		const base = resolve('/fitness/[nutrition=fitnessNutrition]/nutrient/[key]', {
			nutrition: slugs.nutrition,
			key: data.key,
		});
		return base + (qs ? `?${qs}` : '');
	}

	// Only the averages list gets a link back: it is a list in another section, and
	// returning to the right day range of it is not something the header can do. The
	// day view needs no such link — the header already leads back to the diary.
	const backHref = $derived(
		data.isRange
			? resolve('/fitness/[stats=fitnessStats]/nutrients', { stats: slugs.stats })
				+ (data.days === 30 ? '?days=30' : '')
			: null
	);

	/** @param {{ source: string, sourceId: string }} row */
	function foodHref(row) {
		if (!row.source || !row.sourceId) return null;
		return resolve('/fitness/[nutrition=fitnessNutrition]/food/[source]/[id]', {
			nutrition: slugs.nutrition,
			source: row.source,
			id: row.sourceId,
		});
	}

	const pageTitle = $derived(
		isEn ? `${label} — where it came from` : `${label} — Herkunft`
	);
</script>

<svelte:head><title>{pageTitle} - Bocken</title></svelte:head>

<div class="nutrient-page">
	{#if backHref}
		<a class="back-link" href={backHref}>
			<ChevronLeft size={16} />
			{isEn ? 'Nutrient averages' : 'Nährstoff-Durchschnitte'}
		</a>
	{/if}

	<div class="head">
		<h1>{label}</h1>
		<div class="head-meta">
			<span class="period">{periodLabel}</span>
			<span class="total">
				{fmt(total)} {meta.unit}
				{#if goalPct !== null}
					<span class="goal-pct" class:is-max={data.isMax}>
						{goalPct}% {isEn
							? (data.isMax ? 'of the daily limit' : 'of the daily reference')
							: (data.isMax ? 'der Tageshöchstmenge' : 'der Tagesreferenzmenge')}
					</span>
				{/if}
			</span>
		</div>
	</div>

	{#if rows.length === 0}
		<p class="empty">
			{isEn
				? 'Nothing logged in this window reported a figure for this nutrient.'
				: 'Nichts in diesem Zeitraum hat einen Wert für diesen Nährstoff ausgewiesen.'}
		</p>
	{:else}
		<div class="sort-switch" role="group" aria-label={isEn ? 'Sort by' : 'Sortieren nach'}>
			<a
				class="sort-btn"
				class:is-active={data.sortBy === 'amount'}
				href={hrefWith('amount')}
				data-sveltekit-noscroll
			>{isEn ? 'By amount contributed' : 'Nach Beitrag'}</a>
			<a
				class="sort-btn"
				class:is-active={data.sortBy === 'per100kcal'}
				href={hrefWith('per100kcal')}
				data-sveltekit-noscroll
			>{isEn ? 'By concentration' : 'Nach Gehalt'}</a>
		</div>

		<p class="sort-note">
			{byEnergy
				? (isEn
					? 'Ranked by content per 100 kcal — what carries the most for the calories it costs, regardless of how much you ate.'
					: 'Sortiert nach Gehalt pro 100 kcal — was pro Kalorie am meisten liefert, unabhängig von der Menge.')
				: (isEn
					? 'Ranked by how much each food actually supplied over this window.'
					: 'Sortiert danach, wie viel jedes Lebensmittel in diesem Zeitraum tatsächlich beigesteuert hat.')}
		</p>

		<ul class="rows">
			<!-- The key must match how rows are aggregated, `via` included: the same
			     ingredient reached through two custom meals is two rows, and keying
			     without the meal makes them collide. Svelte throws on a duplicate key
			     during hydration, which unmounts the page after it has already
			     painted. -->
			{#each rows as row (`${row.source}:${row.sourceId}:${row.via ?? ''}:${row.name}`)}
				{@const href = foodHref(row)}
				{@const barBase = byEnergy ? maxPer100kcal : maxAmount}
				{@const barValue = byEnergy ? (row.per100kcal ?? 0) : row.amount}
				<li class="row">
					<svelte:element
						this={href ? 'a' : 'div'}
						href={href ?? undefined}
						class="row-link"
					>
						<span class="row-name">
							<span class="row-food">{row.name}</span>
							{#if row.via}
								<span class="row-via">in {row.via}</span>
							{/if}
						</span>
						<span class="row-figures">
							<span class="row-amount">{fmt(row.amount)} {meta.unit}</span>
							<span class="row-share">{Math.round(row.share * 100)}%</span>
						</span>
						<div class="row-bar-wrap">
							<div
								class="row-bar"
								class:is-max={data.isMax}
								style="width: {barBase > 0 ? (barValue / barBase) * 100 : 0}%"
							></div>
						</div>
						<span class="row-detail">
							{fmt(row.grams)} g
							{#if row.entries > 1}
								· {row.entries}× {isEn ? 'logged' : 'erfasst'}
							{/if}
							{#if byEnergy}
								· {row.per100kcal !== null
									? `${fmt(row.per100kcal)} ${meta.unit}/100 kcal`
									: (isEn ? 'no calories reported' : 'keine Kalorienangabe')}
							{:else}
								· {fmt(row.per100g)} {meta.unit}/100 g
							{/if}
						</span>
					</svelte:element>
				</li>
			{/each}
		</ul>
	{/if}

	{#if unreported.length > 0}
		<div class="unreported">
			<TriangleAlert size={16} />
			<div>
				<p class="unreported-head">
					{isEn
						? 'Not counted — these foods publish no figure for this nutrient'
						: 'Nicht berücksichtigt — für diese Lebensmittel gibt es keinen Wert'}
					{#if coverageGapPct >= 1}
						<span class="unreported-pct">
							({coverageGapPct}% {isEn ? 'of what you ate' : 'der gegessenen Menge'})
						</span>
					{/if}
				</p>
				<p class="unreported-body">
					<!-- Keyed by position, not name: two different foods can share a name,
					     and a duplicate key is a runtime error, not a cosmetic issue. -->
					{#each unreported.slice(0, 8) as u, i (i)}{i > 0 ? ', ' : ''}{u.name} ({fmt(u.grams)} g){/each}{#if unreported.length > 8}, +{unreported.length - 8}{/if}
				</p>
				<p class="unreported-note">
					{isEn
						? 'They may well contain it — the source simply does not say, so the total above reads low.'
						: 'Sie können ihn durchaus enthalten — die Quelle sagt es nur nicht, daher liegt die Summe oben zu tief.'}
				</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.nutrient-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 1000px;
		margin-inline: auto;
		width: 100%;
		padding: 1rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: var(--text-sm);
		width: fit-content;
	}
	.back-link:hover {
		color: var(--color-text-primary);
	}

	.head h1 {
		margin: 0;
		font-size: var(--text-2xl);
		color: var(--color-text-primary);
	}
	.head-meta {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 0.25rem;
	}
	.period {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}
	.total {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
		font-weight: 600;
	}
	.goal-pct {
		font-weight: 400;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		margin-left: 0.4rem;
	}
	.goal-pct.is-max {
		color: var(--orange);
	}

	.sort-switch {
		display: inline-flex;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		padding: 0.2rem;
		gap: 0.2rem;
		width: fit-content;
	}
	.sort-btn {
		padding: 0.35rem 0.9rem;
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		text-decoration: none;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.sort-btn.is-active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}

	.sort-note {
		margin: 0;
		font-size: 0.7rem;
		line-height: 1.4;
		color: var(--color-text-secondary);
	}

	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.row-link {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.2rem 0.75rem;
		padding: 0.6rem 0.75rem;
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: inherit;
		text-decoration: none;
		transition: background var(--transition-fast);
	}
	a.row-link:hover {
		background: var(--color-surface-hover);
	}
	/* The food name truncates; the meal pill must not, or the attribution is the first
	   thing lost on a narrow screen. */
	.row-name {
		display: flex;
		align-items: baseline;
		gap: 0.1rem;
		min-width: 0;
		color: var(--color-text-primary);
	}
	.row-food {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* Custom meal ingredients name their meal, so a row is traceable back to what was
	   actually logged — the meal itself never appears as a row of its own. */
	.row-via {
		flex: none;
		margin-left: 0.3rem;
		padding: 0.05rem 0.45rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.7rem;
		vertical-align: middle;
	}
	.row-figures {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.row-amount {
		color: var(--color-text-primary);
	}
	.row-share {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
		min-width: 2.5rem;
		text-align: right;
	}
	.row-bar-wrap {
		grid-column: 1 / -1;
		height: var(--meter-sm);
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		overflow: hidden;
	}
	.row-bar {
		height: 100%;
		background: var(--color-primary);
		border-radius: var(--radius-pill);
		transition: width var(--transition-normal);
	}
	.row-bar.is-max {
		background: var(--orange);
	}
	.row-detail {
		grid-column: 1 / -1;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.empty {
		margin: 0;
		color: var(--color-text-secondary);
	}

	.unreported {
		display: flex;
		gap: 0.6rem;
		padding: 0.75rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}
	.unreported p {
		margin: 0;
	}
	.unreported-head {
		color: var(--color-text-primary);
		font-weight: 600;
	}
	.unreported-pct {
		font-weight: 400;
		color: var(--color-text-secondary);
	}
	.unreported-body {
		margin-top: 0.2rem !important;
	}
	.unreported-note {
		margin-top: 0.3rem !important;
		font-size: 0.7rem;
		line-height: 1.4;
	}

	@media (max-width: 560px) {
		.sort-switch {
			width: 100%;
		}
		.sort-btn {
			flex: 1;
			text-align: center;
		}
	}
</style>
