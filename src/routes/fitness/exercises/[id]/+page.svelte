<script>
	import { getExerciseById } from '$lib/data/exercises';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';

	let { data } = $props();

	let activeTab = $state('about');

	const exercise = $derived(data.exercise?.exercise ?? getExerciseById(data.exercise?.id));
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
		return {
			labels: points.map((/** @type {any} */ p) => new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
			datasets: [{ label: 'Est. 1RM (kg)', data: points.map((/** @type {any} */ p) => p.value) }]
		};
	});

	const maxWeightChartData = $derived.by(() => {
		const points = charts.maxWeightOverTime ?? [];
		return {
			labels: points.map((/** @type {any} */ p) => new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
			datasets: [{ label: 'Max Weight (kg)', data: points.map((/** @type {any} */ p) => p.value), borderColor: '#A3BE8C' }]
		};
	});

	const volumeChartData = $derived.by(() => {
		const points = charts.totalVolumeOverTime ?? [];
		return {
			labels: points.map((/** @type {any} */ p) => new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
			datasets: [{ label: 'Total Volume (kg)', data: points.map((/** @type {any} */ p) => p.value), borderColor: '#EBCB8B' }]
		};
	});

	/** @param {number} weight @param {number} reps */
	function epley1rm(weight, reps) {
		if (reps <= 0) return weight;
		if (reps === 1) return weight;
		return Math.round(weight * (1 + reps / 30));
	}
</script>

<div class="exercise-detail">
	<h1>{exercise?.name ?? 'Exercise'}</h1>

	<div class="tabs">
		{#each tabs as tab}
			<button
				class="tab"
				class:active={activeTab === tab}
				onclick={() => activeTab = tab}
			>
				{tab.toUpperCase()}
			</button>
		{/each}
	</div>

	{#if activeTab === 'about'}
		<div class="tab-content">
			{#if exercise?.imageUrl}
				<img src={exercise.imageUrl} alt={exercise.name} class="exercise-image" />
			{/if}
			<div class="tags">
				<span class="tag body-part">{exercise?.bodyPart}</span>
				<span class="tag equipment">{exercise?.equipment}</span>
				<span class="tag target">{exercise?.target}</span>
			</div>
			{#if exercise?.secondaryMuscles?.length}
				<p class="secondary">Also works: {exercise.secondaryMuscles.join(', ')}</p>
			{/if}
			{#if exercise?.instructions?.length}
				<h3>Instructions</h3>
				<ol class="instructions">
					{#each exercise.instructions as step}
						<li>{step}</li>
					{/each}
				</ol>
			{/if}
		</div>
	{:else if activeTab === 'history'}
		<div class="tab-content">
			{#if history.length === 0}
				<p class="empty">No history for this exercise yet.</p>
			{:else}
				{#each history as entry (entry.sessionId)}
					<div class="history-session">
						<div class="history-header">
							<strong>{entry.sessionName || 'Workout'}</strong>
							<span class="history-date">{new Date(entry.date).toLocaleDateString()}</span>
						</div>
						<table class="history-sets">
							<thead>
								<tr><th>SET</th><th>KG</th><th>REPS</th><th>EST. 1RM</th></tr>
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
				<FitnessChart data={est1rmChartData} title="Best Set (Est. 1RM)" yUnit=" kg" />
				<FitnessChart data={maxWeightChartData} title="Best Set (Max Weight)" yUnit=" kg" />
				<FitnessChart data={volumeChartData} title="Total Volume" yUnit=" kg" />
			{:else}
				<p class="empty">Not enough data to display charts yet.</p>
			{/if}
		</div>
	{:else if activeTab === 'records'}
		<div class="tab-content">
			<div class="records-summary">
				{#if prs.estimatedOneRepMax}
					<div class="record-card">
						<span class="record-label">Estimated 1RM</span>
						<span class="record-value">{prs.estimatedOneRepMax} kg</span>
					</div>
				{/if}
				{#if prs.maxVolume}
					<div class="record-card">
						<span class="record-label">Max Volume</span>
						<span class="record-value">{prs.maxVolume} kg</span>
					</div>
				{/if}
				{#if prs.maxWeight}
					<div class="record-card">
						<span class="record-label">Max Weight</span>
						<span class="record-value">{prs.maxWeight} kg</span>
					</div>
				{/if}
			</div>

			{#if records.length}
				<h3>Rep Records</h3>
				<table class="records-table">
					<thead>
						<tr><th>REPS</th><th>BEST PERFORMANCE</th><th>EST. 1RM</th></tr>
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
		border-bottom: 2px solid var(--nord3, #ddd);
	}
	.tab {
		flex: 1;
		padding: 0.6rem 0.5rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		color: var(--nord4);
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		letter-spacing: 0.05em;
		text-align: center;
	}
	.tab.active {
		color: var(--nord8);
		border-bottom-color: var(--nord8);
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
		color: var(--nord4);
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
		color: var(--nord4);
		padding: 2rem 0;
	}
	.history-session {
		background: var(--accent-dark);
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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
		color: var(--nord4);
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
		color: var(--nord4);
		padding: 0.25rem;
		letter-spacing: 0.05em;
	}
	.history-sets td {
		text-align: center;
		padding: 0.25rem;
	}
	.rpe {
		color: var(--nord13);
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
		background: var(--accent-dark);
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
	.record-label {
		font-size: 0.7rem;
		color: var(--nord4);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.25rem;
	}
	.record-value {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--nord8);
	}
	.records-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.records-table th {
		text-align: left;
		font-size: 0.7rem;
		color: var(--nord4);
		padding: 0.4rem 0.5rem;
		letter-spacing: 0.05em;
		border-bottom: 1px solid var(--nord3);
	}
	.records-table td {
		padding: 0.4rem 0.5rem;
		border-bottom: 1px solid var(--nord3, rgba(0,0,0,0.05));
	}
	.rec-date {
		color: var(--nord4);
		font-size: 0.75rem;
	}

	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme])) .history-session,
		:global(:root:not([data-theme])) .record-card {
			background: var(--nord5);
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
		}
	}
	:global(:root[data-theme="light"]) .history-session,
	:global(:root[data-theme="light"]) .record-card {
		background: var(--nord5);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
	}
</style>
