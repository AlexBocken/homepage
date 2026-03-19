<script>
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import { Dumbbell, Route, Flame } from 'lucide-svelte';

	let { data } = $props();

	const stats = $derived(data.stats ?? {});

	const workoutsChartData = $derived({
		labels: stats.workoutsChart?.labels ?? [],
		datasets: [{
			label: 'Workouts',
			data: stats.workoutsChart?.data ?? [],
			backgroundColor: '#88C0D0'
		}]
	});

	const hasSma = $derived(stats.weightChart?.sma?.some((/** @type {any} */ v) => v !== null));

	const weightChartData = $derived({
		labels: stats.weightChart?.labels ?? [],
		datasets: [
			...(hasSma ? [
				{
					label: '± 1σ',
					data: stats.weightChart.upper,
					borderColor: 'transparent',
					backgroundColor: 'rgba(94, 129, 172, 0.15)',
					fill: '+1',
					pointRadius: 0,
					borderWidth: 0,
					tension: 0.3,
					order: 2
				},
				{
					label: '± 1σ (lower)',
					data: stats.weightChart.lower,
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
					data: stats.weightChart.sma,
					borderColor: '#5E81AC',
					pointRadius: 0,
					borderWidth: 3,
					tension: 0.3,
					order: 1
				}
			] : []),
			{
				label: 'Weight (kg)',
				data: stats.weightChart?.data ?? [],
				borderColor: '#A3BE8C',
				borderWidth: hasSma ? 1 : 2,
				pointRadius: 3,
				order: 0
			}
		]
	});

</script>

<div class="stats-page">
	<h1>Stats</h1>

	<div class="lifetime-cards">
		<div class="lifetime-card workouts">
			<div class="card-icon"><Dumbbell size={24} /></div>
			<div class="card-value">{stats.totalWorkouts ?? 0}</div>
			<div class="card-label">Workouts</div>
		</div>
		<div class="lifetime-card tonnage">
			<div class="card-icon"><Flame size={24} /></div>
			<div class="card-value">{stats.totalTonnage ?? 0}<span class="card-unit">t</span></div>
			<div class="card-label">Tonnage Lifted</div>
		</div>
		<div class="lifetime-card cardio">
			<div class="card-icon"><Route size={24} /></div>
			<div class="card-value">{stats.totalCardioKm ?? 0}<span class="card-unit">km</span></div>
			<div class="card-label">Cardio Distance</div>
		</div>
	</div>

	{#if (stats.workoutsChart?.data?.length ?? 0) > 0}
		<FitnessChart
			type="bar"
			data={workoutsChartData}
			title="Workouts per week"
			height="220px"
		/>
	{:else}
		<p class="empty-chart">No workout data to display yet.</p>
	{/if}

	{#if (stats.weightChart?.data?.length ?? 0) > 1}
		<FitnessChart
			data={weightChartData}
			title="Weight"
			yUnit=" kg"
			height="220px"
		/>
	{/if}
</div>

<style>
	.stats-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
	}

	.lifetime-cards {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6rem;
	}
	.lifetime-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 1rem 0.5rem;
		border-radius: 12px;
		background: var(--color-surface);
		box-shadow: var(--shadow-sm);
		text-align: center;
		position: relative;
		overflow: hidden;
	}
	.lifetime-card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 12px;
		opacity: 0.08;
	}
	.lifetime-card.workouts::before {
		background: var(--nord8);
	}
	.lifetime-card.tonnage::before {
		background: var(--nord12);
	}
	.lifetime-card.cardio::before {
		background: var(--nord14);
	}
	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		margin-bottom: 0.15rem;
	}
	.workouts .card-icon {
		color: var(--nord8);
		background: color-mix(in srgb, var(--nord8) 15%, transparent);
	}
	.tonnage .card-icon {
		color: var(--nord12);
		background: color-mix(in srgb, var(--nord12) 15%, transparent);
	}
	.cardio .card-icon {
		color: var(--nord14);
		background: color-mix(in srgb, var(--nord14) 15%, transparent);
	}
	.card-value {
		font-size: 1.4rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}
	.card-unit {
		font-size: 0.7rem;
		font-weight: 600;
		opacity: 0.6;
		margin-left: 0.15rem;
	}
	.card-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-secondary);
	}

	@media (max-width: 400px) {
		.lifetime-cards {
			grid-template-columns: 1fr;
		}
		.lifetime-card {
			flex-direction: row;
			justify-content: flex-start;
			gap: 0.75rem;
			padding: 0.75rem 1rem;
			text-align: left;
		}
		.card-icon {
			margin-bottom: 0;
		}
	}

	.empty-chart {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 2rem 0;
	}
</style>
