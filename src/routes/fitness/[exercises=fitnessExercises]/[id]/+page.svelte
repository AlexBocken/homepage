<script>
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	/** @param {string | undefined | null} type @param {'en'|'de'} lang */
	function exerciseTypeInfo(type, lang) {
		if (!type) return null;
		switch (type) {
			case 'STRETCHING':
			case 'YOGA':
				return { key: 'stretch', label: t.stretch_pill };
			case 'STRENGTH':
			case 'WEIGHTLIFTING':
				return { key: 'strength', label: t.strength_pill };
			case 'CARDIO':
				return { key: 'cardio', label: t.cardio_pill };
			case 'PLYOMETRICS':
				return { key: 'plyo', label: t.plyo_pill };
			default:
				return null;
		}
	}
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const s = $derived(fitnessSlugs(lang));
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import MuscleMap from '$lib/components/fitness/MuscleMap.svelte';
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

	const exercise = $derived(data.exercise);
	const typeInfo = $derived(exerciseTypeInfo(exercise?.exerciseType, lang));
	const similar = $derived(data.similar ?? []);
	const history = $derived(data.history?.history ?? []);
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

	/** @param {number[]} data */
	function trendWithBands(data) {
		const n = data.length;
		if (n < 3) return null;
		let sx = 0, sy = 0, sxx = 0, sxy = 0;
		for (let i = 0; i < n; i++) {
			sx += i; sy += data[i]; sxx += i * i; sxy += i * data[i];
		}
		const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
		const intercept = (sy - slope * sx) / n;
		const trend = data.map((_, i) => Math.round((intercept + slope * i) * 10) / 10);
		let ssRes = 0;
		for (let i = 0; i < n; i++) { const r = data[i] - trend[i]; ssRes += r * r; }
		const sigma = Math.sqrt(ssRes / (n - 2));
		return { trend, upper: trend.map(v => Math.round((v + sigma) * 10) / 10), lower: trend.map(v => Math.round((v - sigma) * 10) / 10) };
	}

	/** @param {{ labels: string[], datasets: Array<any> }} chartData @param {string} trendColor */
	function withTrend(chartData, trendColor = primary) {
		const values = chartData.datasets[0]?.data;
		if (!values || values.length < 3) return chartData;
		const bands = trendWithBands(values);
		if (!bands) return chartData;
		return {
			labels: chartData.labels,
			datasets: [
				{ label: '± 1σ', data: bands.upper, borderColor: 'transparent', backgroundColor: `${trendColor}26`, fill: '+1', pointRadius: 0, borderWidth: 0, tension: 0.3, order: 2 },
				{ label: '± 1σ (lower)', data: bands.lower, borderColor: 'transparent', backgroundColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 0, tension: 0.3, order: 2 },
				{ label: 'Trend', data: bands.trend, borderColor: trendColor, pointRadius: 0, borderWidth: 2, tension: 0.3, order: 1 },
				{ ...chartData.datasets[0], borderWidth: 1, order: 0 }
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

<svelte:head><title>{exercise?.localName ?? t.exercise_title} - Bocken</title></svelte:head>

<div class="exercise-detail">
	<h1>{exercise?.localName ?? t.exercise_title}</h1>

	<div class="tabs">
		{#each tabs as tab}
			<button
				class="tab"
				class:active={activeTab === tab}
				onclick={() => activeTab = tab}
			>
				{{ about: t.about, history: t.history_tab, charts: t.charts, records: t.records }[tab]}
			</button>
		{/each}
	</div>

	{#if activeTab === 'about'}
		<div class="tab-content about-layout">
			<div class="about-main">
				<!-- Tags -->
				<div class="tags">
					{#if typeInfo}
						<span class="tag type-{typeInfo.key}">{typeInfo.label}</span>
					{/if}
					<span class="tag body-part">{exercise?.localBodyPart}</span>
					<span class="tag equipment">{exercise?.localEquipment}</span>
					<span class="tag target">{exercise?.localTarget}</span>
				</div>

				<!-- Muscle map (mobile only — shown inline) -->
				{#if exercise?.localSecondaryMuscles?.length || exercise?.localTarget}
					<div class="muscle-section-mobile">
						<MuscleMap
							primaryGroups={[exercise?.target].filter(Boolean)}
							secondaryGroups={exercise?.secondaryMuscles ?? []}
							{lang}
						/>
						<div class="muscle-pills">
							{#if exercise?.localTarget}
								<span class="muscle-pill primary">{exercise.localTarget}</span>
							{/if}
							{#each exercise?.localSecondaryMuscles ?? [] as muscle}
								<span class="muscle-pill secondary">{muscle}</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Overview -->
				{#if exercise?.overview}
					<p class="overview">{exercise.overview}</p>
				{/if}

				<!-- Instructions -->
				{#if exercise?.localInstructions?.length}
					<h3>{t.instructions}</h3>
					<ol class="instructions">
						{#each exercise.localInstructions as step}
							<li>{step}</li>
						{/each}
					</ol>
				{/if}

				<!-- Similar exercises -->
				{#if similar.length > 0}
					<div class="similar-section">
						<h3>{t.similar_exercises}</h3>
						<div class="similar-scroll">
							{#each similar as sim}
								<a class="similar-card" href={resolve('/fitness/[exercises=fitnessExercises]/[id]', { exercises: s.exercises, id: sim.id })}>
									<div class="similar-info">
										<span class="similar-name">{sim.localName}</span>
										<span class="similar-meta">{sim.localBodyPart} · {sim.localEquipment}</span>
									</div>
									<ChevronRight size={14} />
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Muscle map sidebar (desktop only) -->
			{#if exercise?.localSecondaryMuscles?.length || exercise?.localTarget}
				<aside class="muscle-sidebar">
					<MuscleMap
						primaryGroups={[exercise?.target].filter(Boolean)}
						secondaryGroups={exercise?.secondaryMuscles ?? []}
						{lang}
					/>
					<div class="muscle-pills">
						{#if exercise?.localTarget}
							<span class="muscle-pill primary">{exercise.localTarget}</span>
						{/if}
						{#each exercise?.localSecondaryMuscles ?? [] as muscle}
							<span class="muscle-pill secondary">{muscle}</span>
						{/each}
					</div>
				</aside>
			{/if}
		</div>
	{:else if activeTab === 'history'}
		<div class="tab-content">
			{#if history.length === 0}
				<p class="empty">{t.no_history_yet}</p>
			{:else}
				{#each history as entry (entry.sessionId)}
					<div class="history-session">
						<div class="history-header">
							<strong>{entry.sessionName || 'Workout'}</strong>
							<span class="history-date">{new Date(entry.date).toLocaleDateString()}</span>
						</div>
						<table class="history-sets">
							<thead>
								<tr><th>{t.set}</th><th>{t.kg}</th><th>{t.reps}</th><th>{t.est_1rm}</th></tr>
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
				<FitnessChart data={est1rmChartData} title={t.best_set_1rm} yUnit=" kg" />
				<FitnessChart data={maxWeightChartData} title={t.best_set_max} yUnit=" kg" />
				<FitnessChart data={volumeChartData} title={t.total_volume} yUnit=" kg" />
			{:else}
				<p class="empty">{t.not_enough_data}</p>
			{/if}
		</div>
	{:else if activeTab === 'records'}
		<div class="tab-content">
			<div class="records-summary">
				{#if prs.estimatedOneRepMax}
					<div class="record-card">
						<span class="record-label">{t.estimated_1rm}</span>
						<span class="record-value">{prs.estimatedOneRepMax} kg</span>
					</div>
				{/if}
				{#if prs.maxVolume}
					<div class="record-card">
						<span class="record-label">{t.max_volume}</span>
						<span class="record-value">{prs.maxVolume} kg</span>
					</div>
				{/if}
				{#if prs.maxWeight}
					<div class="record-card">
						<span class="record-label">{t.max_weight}</span>
						<span class="record-value">{prs.maxWeight} kg</span>
					</div>
				{/if}
			</div>

			{#if records.length}
				<h3>{t.rep_records}</h3>
				<table class="records-table">
					<thead>
						<tr><th>{t.reps}</th><th>{t.best_performance}</th><th>{t.est_1rm}</th></tr>
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

	/* Tags */
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
	.tag.type-stretch,
	.tag.type-strength,
	.tag.type-cardio,
	.tag.type-plyo {
		font-weight: 700;
		letter-spacing: 0.04em;
	}
	.tag.type-stretch { background: rgba(180, 142, 173, 0.2); color: var(--nord15); }
	.tag.type-strength { background: rgba(94, 129, 172, 0.2); color: var(--nord10); }
	.tag.type-cardio { background: rgba(191, 97, 106, 0.2); color: var(--nord11); }
	.tag.type-plyo { background: rgba(235, 203, 139, 0.22); color: var(--nord13); }

	/* About layout — two-column on wide screens */
	.about-layout {
		display: flex;
		flex-direction: column;
	}
	.about-main {
		flex: 1;
		min-width: 0;
	}
	.muscle-sidebar {
		display: none;
	}
	.muscle-section-mobile {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	@media (min-width: 600px) {
		.about-layout {
			flex-direction: row-reverse;
			gap: 1.5rem;
			align-items: flex-start;
		}
		.muscle-sidebar {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.5rem;
			position: sticky;
			top: 1rem;
			flex-shrink: 0;
			width: 180px;
		}
		.muscle-section-mobile {
			display: none;
		}
	}

	/* Muscle pills */
	.muscle-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		justify-content: center;
	}
	.muscle-pill {
		padding: 0.2rem 0.55rem;
		border-radius: 16px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: capitalize;
	}
	.muscle-pill.primary {
		background: rgba(94, 129, 172, 0.2);
		color: var(--nord9);
	}
	.muscle-pill.secondary {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-text-tertiary);
	}

	.overview {
		font-size: 0.85rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		margin: 0.25rem 0 0.5rem;
	}
	h3 {
		font-size: 1rem;
		margin: 0.75rem 0 0.4rem;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.instructions {
		padding-left: 1.25rem;
		font-size: 0.85rem;
		line-height: 1.6;
	}
	.instructions li {
		margin-bottom: 0.4rem;
	}

	/* Similar exercises */
	.similar-section {
		margin-top: 0.25rem;
	}
	.similar-scroll {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.similar-card {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem;
		background: var(--color-surface);
		border-radius: 10px;
		box-shadow: var(--shadow-sm);
		text-decoration: none;
		color: inherit;
		transition: box-shadow 0.15s;
	}
	.similar-card:hover {
		box-shadow: var(--shadow-md, 0 2px 8px rgba(0,0,0,0.12));
	}
.similar-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.similar-name {
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.similar-meta {
		font-size: 0.65rem;
		color: var(--color-text-tertiary);
		text-transform: capitalize;
	}
	.similar-card :global(svg) {
		color: var(--color-text-tertiary);
		flex-shrink: 0;
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
