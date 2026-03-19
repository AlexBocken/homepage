<script>
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';

	let { data } = $props();

	const user = $derived(data.session?.user);
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

<div class="profile-page">
	<h1>Profile</h1>

	<div class="user-section">
		{#if user}
			<img
				class="avatar"
				src="https://bocken.org/static/user/thumb/{user.nickname}.webp"
				alt={user.name}
			/>
			<div class="user-info">
				<h2>{user.name}</h2>
				<p class="subtitle">{stats.totalWorkouts ?? 0} workouts</p>
			</div>
		{/if}
	</div>

	<h2 class="section-heading">Dashboard</h2>

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
	.profile-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
	}
	.user-section {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
	}
	.avatar {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		object-fit: cover;
	}
	.user-info h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.subtitle {
		margin: 0.15rem 0 0;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}
	.section-heading {
		font-size: 1.1rem;
		margin: 0.5rem 0 0;
	}
	.empty-chart {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 2rem 0;
	}
</style>
