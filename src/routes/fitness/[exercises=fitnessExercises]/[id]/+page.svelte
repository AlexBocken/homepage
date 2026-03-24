<script>
	import { page } from '$app/stores';
	import { getExerciseById, localizeExercise } from '$lib/data/exercises';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	function checkDark() {
		if (typeof document === 'undefined') return false;
		const t = document.documentElement.dataset.theme;
		if (t === 'dark') return true;
		if (t === 'light') return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	let dark = $state(checkDark());
	onMount(() => {
		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		const onMql = () => { dark = checkDark(); };
		mql.addEventListener('change', onMql);
		const obs = new MutationObserver(() => { dark = checkDark(); });
		obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
		return () => { mql.removeEventListener('change', onMql); obs.disconnect(); };
	});

	const primary = $derived(dark ? '#88C0D0' : '#5E81AC');

	let activeTab = $state('about');

	const rawExercise = $derived(data.exercise?.exercise ?? getExerciseById(data.exercise?.id));
	const exercise = $derived(rawExercise ? localizeExercise(rawExercise, lang) : undefined);
	// History API returns { history: [{ sessionId, sessionName, date, sets }], total }
	const history = $derived(data.history?.history ?? []);
	// Stats API returns { charts: { est1rmOverTime, ... }, personalRecords: { ... }, records }
	const stats = $derived(data.stats ?? {});
	const charts = $derived(stats.charts ?? {});
	const prs = $derived(stats.personalRecords ?? {});
	const records = $derived(stats.records ?? []);

	const tabs = ['about', 'history', 'charts', 'records'];

	const est1rmChartData = $derived.by(() => {
		const points = charts.est1rmOverTime ?? [];
		return withTrend({
			labels: points.map((/** @type {any} */ p) => new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
			datasets: [{ label: 'Est. 1RM (kg)', data: points.map((/** @type {any} */ p) => p.value), borderColor: primary }]
		});
	});

	const maxWeightChartData = $derived.by(() => {
		const points = charts.maxWeightOverTime ?? [];
		return withTrend({
			labels: points.map((/** @type {any} */ p) => new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
			datasets: [{ label: 'Max Weight (kg)', data: points.map((/** @type {any} */ p) => p.value), borderColor: '#A3BE8C' }]
		}, '#A3BE8C');
	});

	const volumeChartData = $derived.by(() => {
		const points = charts.totalVolumeOverTime ?? [];
		return withTrend({
			labels: points.map((/** @type {any} */ p) => new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
			datasets: [{ label: 'Total Volume (kg)', data: points.map((/** @type {any} */ p) => p.value), borderColor: '#EBCB8B' }]
		}, '#EBCB8B');
	});

	/**
	 * Compute linear regression trendline + ±1σ bands for a data array.
	 * Returns { trend, upper, lower } arrays of same length.
	 * @param {number[]} data
	 */
	function trendWithBands(data) {
		const n = data.length;
		if (n < 3) return null;

		// Linear regression
		let sx = 0, sy = 0, sxx = 0, sxy = 0;
		for (let i = 0; i < n; i++) {
			sx += i; sy += data[i]; sxx += i * i; sxy += i * data[i];
		}
		const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
		const intercept = (sy - slope * sx) / n;

		const trend = data.map((_, i) => Math.round((intercept + slope * i) * 10) / 10);

		// Residual standard deviation
		let ssRes = 0;
		for (let i = 0; i < n; i++) {
			const r = data[i] - trend[i];
			ssRes += r * r;
		}
		const sigma = Math.sqrt(ssRes / (n - 2));

		const upper = trend.map(v => Math.round((v + sigma) * 10) / 10);
		const lower = trend.map(v => Math.round((v - sigma) * 10) / 10);

		return { trend, upper, lower };
	}

	/**
	 * Add trendline + uncertainty datasets to a chart data object.
	 * @param {{ labels: string[], datasets: Array<any> }} chartData
	 * @param {string} trendColor
	 */
	function withTrend(chartData, trendColor = primary) {
		const values = chartData.datasets[0]?.data;
		if (!values || values.length < 3) return chartData;

		const bands = trendWithBands(values);
		if (!bands) return chartData;

		return {
			labels: chartData.labels,
			datasets: [
				{
					label: '± 1σ',
					data: bands.upper,
					borderColor: 'transparent',
					backgroundColor: `${trendColor}26`,
					fill: '+1',
					pointRadius: 0,
					borderWidth: 0,
					tension: 0.3,
					order: 2
				},
				{
					label: '± 1σ (lower)',
					data: bands.lower,
					borderColor: 'transparent',
					backgroundColor: 'transparent',
					fill: false,
					pointRadius: 0,
					borderWidth: 0,
					tension: 0.3,
					order: 2
				},
				{
					label: 'Trend',
					data: bands.trend,
					borderColor: trendColor,
					pointRadius: 0,
					borderWidth: 2,
					tension: 0.3,
					order: 1
				},
				{
					...chartData.datasets[0],
					borderWidth: 1,
					order: 0
				}
			]
		};
	}

	/** @param {number} weight @param {number} reps */
	function epley1rm(weight, reps) {
		if (reps <= 0) return weight;
		if (reps === 1) return weight;
		return Math.round(weight * (1 + reps / 30));
	}
</script>

<svelte:head><title>{exercise?.localName ?? (lang === 'en' ? 'Exercise' : 'Übung')} - Bocken</title></svelte:head>

<div class="exercise-detail">
	<h1>{exercise?.localName ?? 'Exercise'}</h1>

	<div class="tabs">
		{#each tabs as tab}
			<button
				class="tab"
				class:active={activeTab === tab}
				onclick={() => activeTab = tab}
			>
				{{ about: t('about', lang), history: t('history_tab', lang), charts: t('charts', lang), records: t('records', lang) }[tab]}
			</button>
		{/each}
	</div>

	{#if activeTab === 'about'}
		<div class="tab-content">
			{#if exercise?.imageUrl}
				<img src={exercise.imageUrl} alt={exercise.localName} class="exercise-image" />
			{/if}
			<div class="tags">
				<span class="tag body-part">{exercise?.localBodyPart}</span>
				<span class="tag equipment">{exercise?.localEquipment}</span>
				<span class="tag target">{exercise?.localTarget}</span>
			</div>
			{#if exercise?.localSecondaryMuscles?.length}
				<p class="secondary">{lang === 'en' ? 'Also works' : 'Trainiert auch'}: {exercise.localSecondaryMuscles.join(', ')}</p>
			{/if}
			{#if exercise?.localInstructions?.length}
				<h3>{t('instructions', lang)}</h3>
				<ol class="instructions">
					{#each exercise.localInstructions as step}
						<li>{step}</li>
					{/each}
				</ol>
			{/if}
		</div>
	{:else if activeTab === 'history'}
		<div class="tab-content">
			{#if history.length === 0}
				<p class="empty">{t('no_history_yet', lang)}</p>
			{:else}
				{#each history as entry (entry.sessionId)}
					<div class="history-session">
						<div class="history-header">
							<strong>{entry.sessionName || 'Workout'}</strong>
							<span class="history-date">{new Date(entry.date).toLocaleDateString()}</span>
						</div>
						<table class="history-sets">
							<thead>
								<tr><th>{t('set', lang)}</th><th>{t('kg', lang)}</th><th>{t('reps', lang)}</th><th>{t('est_1rm', lang)}</th></tr>
							</thead>
							<tbody>
								{#each entry.sets as set, i (i)}
									<tr>
										<td>{i + 1}</td>
										<td>{set.weight}</td>
										<td>{set.reps}{#if set.rpe} <span class="rpe">@{set.rpe}</span>{/if}</td>
										<td>{epley1rm(set.weight, set.reps)} kg</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/each}
			{/if}
		</div>
	{:else if activeTab === 'charts'}
		<div class="tab-content charts-grid">
			{#if (charts.est1rmOverTime?.length ?? 0) > 0}
				<FitnessChart data={est1rmChartData} title={t('best_set_1rm', lang)} yUnit=" kg" />
				<FitnessChart data={maxWeightChartData} title={t('best_set_max', lang)} yUnit=" kg" />
				<FitnessChart data={volumeChartData} title={t('total_volume', lang)} yUnit=" kg" />
			{:else}
				<p class="empty">{t('not_enough_data', lang)}</p>
			{/if}
		</div>
	{:else if activeTab === 'records'}
		<div class="tab-content">
			<div class="records-summary">
				{#if prs.estimatedOneRepMax}
					<div class="record-card">
						<span class="record-label">{t('estimated_1rm', lang)}</span>
						<span class="record-value">{prs.estimatedOneRepMax} kg</span>
					</div>
				{/if}
				{#if prs.maxVolume}
					<div class="record-card">
						<span class="record-label">{t('max_volume', lang)}</span>
						<span class="record-value">{prs.maxVolume} kg</span>
					</div>
				{/if}
				{#if prs.maxWeight}
					<div class="record-card">
						<span class="record-label">{t('max_weight', lang)}</span>
						<span class="record-value">{prs.maxWeight} kg</span>
					</div>
				{/if}
			</div>

			{#if records.length}
				<h3>{t('rep_records', lang)}</h3>
				<table class="records-table">
					<thead>
						<tr><th>{t('reps', lang)}</th><th>{t('best_performance', lang)}</th><th>{t('est_1rm', lang)}</th></tr>
					</thead>
					<tbody>
						{#each records as rec (rec.reps)}
							<tr>
								<td>{rec.reps}</td>
								<td>{rec.weight} kg × {rec.reps}{#if rec.date} <span class="rec-date">({new Date(rec.date).toLocaleDateString()})</span>{/if}</td>
								<td>{rec.estimated1rm ?? epley1rm(rec.weight, rec.reps)} kg</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	{/if}
</div>

<style>
	.exercise-detail {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
	}

	/* Tabs */
	.tabs {
		display: flex;
		gap: 0;
		border-bottom: 2px solid var(--color-border);
	}
	.tab {
		flex: 1;
		padding: 0.6rem 0.5rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		letter-spacing: 0.05em;
		text-align: center;
	}
	.tab.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
	}
	.tab-content {
		padding: 0.5rem 0;
	}

	/* About */
	.exercise-image {
		width: 100%;
		max-height: 300px;
		object-fit: cover;
		border-radius: 12px;
		margin-bottom: 0.75rem;
	}
	.tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}
	.tag {
		padding: 0.25rem 0.6rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}
	.body-part { background: rgba(94, 129, 172, 0.2); color: var(--nord9); }
	.equipment { background: rgba(163, 190, 140, 0.2); color: var(--nord14); }
	.target { background: rgba(208, 135, 112, 0.2); color: var(--nord12); }
	.secondary {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		text-transform: capitalize;
	}
	h3 {
		font-size: 1rem;
		margin: 1rem 0 0.5rem;
	}
	.instructions {
		padding-left: 1.25rem;
		font-size: 0.85rem;
		line-height: 1.6;
	}
	.instructions li {
		margin-bottom: 0.4rem;
	}

	/* History */
	.empty {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 2rem 0;
	}
	.history-session {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 0.75rem;
		margin-bottom: 0.6rem;
	}
	.history-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
		font-size: 0.85rem;
	}
	.history-date {
		color: var(--color-text-secondary);
		font-size: 0.8rem;
	}
	.history-sets {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
	}
	.history-sets th {
		text-align: center;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		padding: 0.25rem;
		letter-spacing: 0.05em;
	}
	.history-sets td {
		text-align: center;
		padding: 0.25rem;
	}
	.rpe {
		color: var(--nord12);
		font-size: 0.75rem;
	}

	/* Charts */
	.charts-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Records */
	.records-summary {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.6rem;
		margin-bottom: 1rem;
	}
	.record-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem;
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
	}
	.record-label {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.25rem;
	}
	.record-value {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--color-primary);
	}
	.records-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.records-table th {
		text-align: left;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		padding: 0.4rem 0.5rem;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--color-border);
	}
	.records-table td {
		padding: 0.4rem 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.rec-date {
		color: var(--color-text-secondary);
		font-size: 0.75rem;
	}
</style>
