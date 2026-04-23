<script>
	import { page } from '$app/stores';
	import { ArrowLeft, Ruler, TrendingUp, TrendingDown, Minus as MinusIcon } from '@lucide/svelte';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import { bodyPartAccent } from '$lib/js/fitnessBodyParts';

	let { data } = $props();

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const statsSlug = $derived(lang === 'en' ? 'stats' : 'statistik');
	const checkinSlug = $derived(lang === 'en' ? 'check-in' : 'erfassung');
	const card = $derived(data.card);

	const historyAsc = $derived(
		[...(data.measurements ?? [])].sort(
			(/** @type {any} */ a, /** @type {any} */ b) =>
				new Date(a.date).getTime() - new Date(b.date).getTime()
		)
	);

	/**
	 * @typedef {{ paired: true, dates: string[], left: (number|null)[], right: (number|null)[] }} PairedSeries
	 * @typedef {{ paired: false, dates: string[], values: number[] }} SingleSeries
	 * @typedef {PairedSeries | SingleSeries} Series
	 */

	/** @type {Series} */
	const series = $derived.by(() => {
		if (card.paired) {
			/** @type {string[]} */
			const dates = [];
			/** @type {(number|null)[]} */
			const left = [];
			/** @type {(number|null)[]} */
			const right = [];
			for (const m of historyAsc) {
				const ms = m.measurements ?? {};
				const l = ms[card.dbLeft];
				const r = ms[card.dbRight];
				if (l == null && r == null) continue;
				dates.push(m.date);
				left.push(l ?? null);
				right.push(r ?? null);
			}
			return { paired: true, dates, left, right };
		}
		/** @type {string[]} */
		const dates = [];
		/** @type {number[]} */
		const values = [];
		for (const m of historyAsc) {
			const ms = m.measurements ?? {};
			const v = ms[card.db];
			if (v == null) continue;
			dates.push(m.date);
			values.push(v);
		}
		return { paired: false, dates, values };
	});

	const chartData = $derived.by(() => {
		if (series.paired) {
			return {
				dates: series.dates,
				labels: series.dates,
				datasets: [
					{ label: 'L', data: series.left, borderColor: '#88C0D0', pointBackgroundColor: '#88C0D0' },
					{ label: 'R', data: series.right, borderColor: '#D08770', pointBackgroundColor: '#D08770' }
				]
			};
		}
		return {
			dates: series.dates,
			labels: series.dates,
			datasets: [
				{
					label: t(card.labelKey, lang),
					data: series.values,
					borderColor: '#88C0D0',
					pointBackgroundColor: '#88C0D0'
				}
			]
		};
	});

	/**
	 * Enforce a minimum y-axis range of 4 cm — prevents tiny variations
	 * from stretching across the full chart height.
	 */
	const Y_MIN_RANGE = 4;
	const yRange = $derived.by(() => {
		/** @type {number[]} */
		const vals = series.paired
			? [...series.left, ...series.right].filter((/** @type {number|null} */ v) => v != null)
			: series.values.filter((/** @type {number|null} */ v) => v != null);
		if (vals.length === 0) return { min: undefined, max: undefined };
		const dMin = Math.min(...vals);
		const dMax = Math.max(...vals);
		if (dMax - dMin >= Y_MIN_RANGE) return { min: dMin, max: dMax };
		const mid = (dMin + dMax) / 2;
		return { min: mid - Y_MIN_RANGE / 2, max: mid + Y_MIN_RANGE / 2 };
	});

	/**
	 * @typedef {{ paired: true, latest: { left: number|null, right: number|null }, first: { left: number|null, right: number|null }, count: number }} PairedStats
	 * @typedef {{ paired: false, latest: number|null, first: number|null, count: number, min: number|null, max: number|null }} SingleStats
	 * @typedef {PairedStats | SingleStats} Stats
	 */

	/** @type {Stats} */
	const stats = $derived.by(() => {
		if (series.paired) {
			const l = series.left.filter((/** @type {number|null} */ v) => v != null);
			const r = series.right.filter((/** @type {number|null} */ v) => v != null);
			const latest = {
				left: l.length ? /** @type {number} */ (l[l.length - 1]) : null,
				right: r.length ? /** @type {number} */ (r[r.length - 1]) : null
			};
			const first = {
				left: l.length ? /** @type {number} */ (l[0]) : null,
				right: r.length ? /** @type {number} */ (r[0]) : null
			};
			return { paired: true, latest, first, count: series.dates.length };
		}
		const v = series.values;
		return {
			paired: false,
			latest: v.length ? v[v.length - 1] : null,
			first: v.length ? v[0] : null,
			count: v.length,
			min: v.length ? Math.min(...v) : null,
			max: v.length ? Math.max(...v) : null
		};
	});

	/** @param {number|null} a @param {number|null} b */
	function delta(a, b) {
		if (a == null || b == null) return null;
		return a - b;
	}

	const hasData = $derived(series.dates.length > 0);
</script>

<svelte:head><title>{t(card.labelKey, lang)} · {lang === 'en' ? 'History' : 'Verlauf'} - Bocken</title></svelte:head>

<div class="detail-page">
	<header class="detail-header" style="--accent: {bodyPartAccent(card.key)}">
		<a class="back-link" href="/fitness/{statsSlug}" aria-label={t('back', lang)}>
			<ArrowLeft size={18} />
		</a>
		<div class="head-text">
			<span class="eyebrow">{t('body_parts', lang)}</span>
			<h1>{t(card.labelKey, lang)}</h1>
		</div>
		<div class="head-img" aria-hidden="true">
			{#if card.img}
				<div
					class="head-pic"
					style="--bp-src: url(/fitness/measure/{card.img})"
				></div>
			{:else}
				<Ruler size={40} strokeWidth={1.5} />
			{/if}
		</div>
	</header>

	{#if !hasData}
		<div class="empty">
			<p>{t('no_measurements_yet', lang)}</p>
			<a class="cta" href="/fitness/{checkinSlug}/body-parts">
				<Ruler size={16} /> {t('measure_body_parts', lang)}
			</a>
		</div>
	{:else}
		<section class="summary">
			{#if stats.paired}
				<div class="stat-grid">
					<div class="stat">
						<span class="stat-label">L · {t('latest', lang)}</span>
						<span class="stat-value">
							{stats.latest.left != null ? stats.latest.left.toFixed(1) : '—'}
							<span class="stat-unit">cm</span>
						</span>
						{#if stats.latest.left != null && stats.first.left != null}
							{@const d = delta(stats.latest.left, stats.first.left)}
							{#if d != null && d !== 0}
								<span class="stat-delta" class:up={d > 0} class:down={d < 0}>
									{#if d > 0}<TrendingUp size={12} />{:else}<TrendingDown size={12} />{/if}
									{Math.abs(d).toFixed(1)} cm
								</span>
							{:else}
								<span class="stat-delta flat"><MinusIcon size={12} /> 0</span>
							{/if}
						{/if}
					</div>
					<div class="stat">
						<span class="stat-label">R · {t('latest', lang)}</span>
						<span class="stat-value">
							{stats.latest.right != null ? stats.latest.right.toFixed(1) : '—'}
							<span class="stat-unit">cm</span>
						</span>
						{#if stats.latest.right != null && stats.first.right != null}
							{@const d = delta(stats.latest.right, stats.first.right)}
							{#if d != null && d !== 0}
								<span class="stat-delta" class:up={d > 0} class:down={d < 0}>
									{#if d > 0}<TrendingUp size={12} />{:else}<TrendingDown size={12} />{/if}
									{Math.abs(d).toFixed(1)} cm
								</span>
							{:else}
								<span class="stat-delta flat"><MinusIcon size={12} /> 0</span>
							{/if}
						{/if}
					</div>
				</div>
			{:else}
				<div class="stat-grid">
					<div class="stat">
						<span class="stat-label">{t('latest', lang)}</span>
						<span class="stat-value">
							{stats.latest != null ? stats.latest.toFixed(1) : '—'}
							<span class="stat-unit">cm</span>
						</span>
						{#if stats.latest != null && stats.first != null}
							{@const d = delta(stats.latest, stats.first)}
							{#if d != null && d !== 0}
								<span class="stat-delta" class:up={d > 0} class:down={d < 0}>
									{#if d > 0}<TrendingUp size={12} />{:else}<TrendingDown size={12} />{/if}
									{Math.abs(d).toFixed(1)} cm
								</span>
							{:else}
								<span class="stat-delta flat"><MinusIcon size={12} /> 0</span>
							{/if}
						{/if}
					</div>
					<div class="stat">
						<span class="stat-label">min / max</span>
						<span class="stat-value range">
							{stats.min != null ? stats.min.toFixed(1) : '—'}
							<span class="stat-unit">–</span>
							{stats.max != null ? stats.max.toFixed(1) : '—'}
							<span class="stat-unit">cm</span>
						</span>
					</div>
				</div>
			{/if}
		</section>

		<section class="chart-wrap">
			<FitnessChart data={chartData} yUnit=" cm" height="320px" yMin={yRange.min} yMax={yRange.max} />
		</section>
	{/if}
</div>

<style>
	.detail-page {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 820px;
		margin-inline: auto;
		padding: 0.5rem 0;
	}

	.detail-header {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}
	.back-link {
		display: grid;
		place-items: center;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 50%;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		text-decoration: none;
		transition: all 150ms;
	}
	.back-link:hover {
		color: var(--color-text-primary);
		border-color: var(--color-text-tertiary);
	}
	.head-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}
	.eyebrow {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
	}
	h1 {
		margin: 0;
		font-size: 1.6rem;
		letter-spacing: -0.01em;
	}
	.head-img {
		display: grid;
		place-items: center;
		width: 5.5rem;
		height: 5.5rem;
		flex-shrink: 0;
		border-radius: 50%;
		background: color-mix(in oklab, var(--accent, var(--color-primary)) 15%, transparent);
		color: var(--accent, var(--color-primary));
	}
	.head-pic {
		width: 4.1rem;
		height: 4.1rem;
		mask-image: var(--bp-src);
		-webkit-mask-image: var(--bp-src);
		mask-size: contain;
		-webkit-mask-size: contain;
		mask-repeat: no-repeat;
		-webkit-mask-repeat: no-repeat;
		mask-position: center;
		-webkit-mask-position: center;
		background-color: var(--accent, var(--color-primary));
	}

	.summary .stat-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.85rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}
	.stat-label {
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-secondary);
	}
	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.01em;
	}
	.stat-value.range {
		font-size: 1.1rem;
	}
	.stat-unit {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		font-weight: 500;
		margin-left: 0.15rem;
	}
	.stat-delta {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.72rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.stat-delta.up { color: var(--orange); }
	.stat-delta.down { color: var(--green); }
	.stat-delta.flat { color: var(--color-text-tertiary); }

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		padding: 2rem 1rem;
		background: var(--color-surface);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text-secondary);
	}
	.cta {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.95rem;
		border-radius: var(--radius-pill);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
	}
	.cta:hover {
		background: var(--color-primary-hover);
	}
</style>
