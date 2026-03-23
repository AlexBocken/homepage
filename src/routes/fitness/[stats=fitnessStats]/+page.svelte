<script>
	import { page } from '$app/stores';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import { Dumbbell, Route, Flame, Weight } from 'lucide-svelte';
	import FitnessStreakAura from '$lib/components/fitness/FitnessStreakAura.svelte';
	import { onMount } from 'svelte';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';

	const lang = $derived(detectFitnessLang($page.url.pathname));

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
	const primaryFill = $derived(dark ? 'rgba(136, 192, 208, 0.15)' : 'rgba(94, 129, 172, 0.15)');

	const stats = $derived(data.stats ?? {});

	let goalStreak = $state(data.goal?.streak ?? 0);
	let goalWeekly = $state(data.goal?.weeklyWorkouts ?? null);
	let goalEditing = $state(false);
	let goalInput = $state(4);
	let goalSaving = $state(false);

	const hasDemographics = $derived(data.goal?.sex != null && data.goal?.heightCm != null);

	function startGoalEdit() {
		goalInput = goalWeekly ?? 4;
		goalEditing = true;
	}

	async function saveGoal() {
		goalSaving = true;
		try {
			const res = await fetch('/api/fitness/goal', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ weeklyWorkouts: goalInput })
			});
			if (res.ok) {
				const d = await res.json();
				goalWeekly = d.weeklyWorkouts;
				goalStreak = d.streak;
				goalEditing = false;
			}
		} finally {
			goalSaving = false;
		}
	}

	const workoutsChartData = $derived({
		labels: stats.workoutsChart?.labels ?? [],
		datasets: [{
			label: 'Workouts',
			data: stats.workoutsChart?.data ?? [],
			backgroundColor: primary
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
					backgroundColor: primaryFill,
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
					borderColor: primary,
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

<svelte:head><title>{t('stats_title', lang)} - Fitness</title></svelte:head>

<div class="stats-page">
	<h1>{t('stats_title', lang)}</h1>

	<div class="lifetime-cards">
		<div class="lifetime-card workouts">
			<div class="card-icon"><Dumbbell size={24} /></div>
			<div class="card-value">{stats.totalWorkouts ?? 0}</div>
			<div class="card-label">{(stats.totalWorkouts ?? 0) === 1 ? t('workout_singular', lang) : t('workouts_plural', lang)}</div>
		</div>
		<div class="lifetime-card tonnage">
			<div class="card-icon"><Weight size={24} /></div>
			<div class="card-value">{stats.totalTonnage ?? 0}<span class="card-unit">t</span></div>
			<div class="card-label">{t('lifted', lang)}</div>
		</div>
		{#if stats.kcalEstimate}
			<div class="lifetime-card kcal">
				<div class="card-icon"><Flame size={24} /></div>
				<div class="card-value">~{stats.kcalEstimate.kcal.toLocaleString()}<span class="card-unit">kcal</span></div>
				<div class="card-label">{t('est_kcal', lang)}</div>
				{#if !hasDemographics}
					<div class="card-hint">{t('kcal_set_profile', lang)} <a href="/fitness/{fitnessSlugs(lang).measure}">{t('measure_title', lang)}</a></div>
				{/if}
			</div>
		{/if}
		<div class="lifetime-card cardio">
			<div class="card-icon"><Route size={24} /></div>
			<div class="card-value">{stats.totalCardioKm ?? 0}<span class="card-unit">km</span></div>
			<div class="card-label">{t('distance_covered', lang)}</div>
		</div>
	</div>

	{#if goalEditing}
		<div class="goal-editor-overlay" onkeydown={(e) => { if (e.key === 'Escape') goalEditing = false; }} role="dialog">
			<div class="goal-editor-backdrop" onclick={() => goalEditing = false}></div>
			<div class="goal-editor-panel">
				<h3>{t('weekly_goal', lang)}</h3>
				<div class="goal-input-row">
					<button class="adj-btn" onclick={() => { if (goalInput > 1) goalInput--; }} disabled={goalInput <= 1}>-</button>
					<span class="goal-value">{goalInput}</span>
					<button class="adj-btn" onclick={() => { if (goalInput < 14) goalInput++; }} disabled={goalInput >= 14}>+</button>
				</div>
				<span class="goal-unit">{t('workouts_per_week_goal', lang)}</span>
				<div class="goal-actions">
					<button class="goal-save" onclick={saveGoal} disabled={goalSaving}>
						{goalSaving ? t('saving', lang) : t('save', lang)}
					</button>
					<button class="goal-cancel" onclick={() => goalEditing = false}>{t('cancel', lang)}</button>
				</div>
			</div>
		</div>
	{/if}

	<div class="chart-streak-row">
		<div class="chart-streak-chart">
			{#if (stats.workoutsChart?.data?.length ?? 0) > 0}
				<FitnessChart
					type="bar"
					data={workoutsChartData}
					title={t('workouts_per_week', lang)}
					height="220px"
					goalLine={goalWeekly ?? undefined}
				/>
			{:else}
				<p class="empty-chart">{t('no_workout_data', lang)}</p>
			{/if}
		</div>
		<button class="streak-section" onclick={startGoalEdit}>
			<FitnessStreakAura value={goalStreak} />
			<div class="streak-meta">
				<span class="streak-unit">{goalStreak === 1 ? t('streak_week', lang) : t('streak_weeks', lang)}</span>
				<span class="streak-label">{t('streak', lang)}</span>
				{#if goalWeekly !== null}
					<span class="streak-goal">{goalWeekly}x / {t('streak_week', lang).toLowerCase()}</span>
				{:else}
					<span class="streak-goal">{t('set_goal', lang)}</span>
				{/if}
			</div>
		</button>
	</div>

	{#if (stats.weightChart?.data?.length ?? 0) > 1}
		<FitnessChart
			data={weightChartData}
			title={t('weight', lang)}
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
		grid-template-columns: repeat(4, 1fr);
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
	}
	.lifetime-card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 12px;
		opacity: 0.08;
	}
	.lifetime-card.workouts::before {
		background: var(--color-primary);
	}
	.lifetime-card.tonnage::before {
		background: var(--nord10);
	}
	.lifetime-card.kcal::before {
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
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 15%, transparent);
	}
	.tonnage .card-icon {
		color: var(--nord10);
		background: color-mix(in srgb, var(--nord10) 15%, transparent);
	}
	.kcal .card-icon {
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
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}
	.card-hint {
		font-size: 0.55rem;
		color: var(--color-text-secondary);
		opacity: 0.7;
		margin-top: 0.1rem;
		line-height: 1.3;
	}
	.card-hint a {
		color: var(--nord12);
		text-decoration: underline;
	}

	/* Chart + Streak row */
	.chart-streak-row {
		display: flex;
		gap: 1rem;
		align-items: stretch;
	}
	.chart-streak-chart {
		flex: 1;
		min-width: 0;
	}

	/* Streak section */
	.streak-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		background: var(--color-surface);
		border: none;
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		font-family: inherit;
		color: inherit;
		transition: box-shadow 0.15s;
	}
	.streak-section:hover {
		box-shadow: var(--shadow-sm), 0 0 0 2px var(--nord13);
	}
	.streak-meta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
	}
	.streak-unit {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-secondary);
	}
	.streak-label {
		font-size: 1rem;
		font-weight: 700;
		color: var(--nord13);
	}
	.streak-goal {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		opacity: 0.7;
	}

	@media (max-width: 600px) {
		.lifetime-cards {
			grid-template-columns: repeat(2, 1fr);
		}
		.chart-streak-row {
			flex-direction: column-reverse;
		}
		.streak-section {
			flex-direction: row;
			gap: 1rem;
		}
		.streak-meta {
			align-items: flex-start;
		}
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

	/* Goal editor overlay */
	.goal-editor-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: center;
	}
	.goal-editor-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
	}
	.goal-editor-panel {
		position: relative;
		background: var(--color-surface);
		border-radius: 16px;
		padding: 1.5rem 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		min-width: 240px;
	}
	.goal-editor-panel h3 {
		margin: 0;
		font-size: 1.1rem;
	}
	.goal-input-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.adj-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1.5px solid var(--color-border, var(--nord3));
		background: transparent;
		color: inherit;
		font-size: 1.3rem;
		font-weight: 600;
		cursor: pointer;
		display: grid;
		place-items: center;
		font-family: inherit;
		transition: background 0.15s;
	}
	.adj-btn:hover:not(:disabled) {
		background: var(--nord13);
		color: var(--nord0);
		border-color: var(--nord13);
	}
	.adj-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.goal-value {
		font-size: 2rem;
		font-weight: 700;
		min-width: 2ch;
		text-align: center;
	}
	.goal-unit {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.goal-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}
	.goal-save {
		padding: 0.4rem 1rem;
		border: none;
		border-radius: 8px;
		background: var(--nord13);
		color: var(--nord0);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
	}
	.goal-save:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.goal-cancel {
		padding: 0.4rem 1rem;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-family: inherit;
	}

	.empty-chart {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 2rem 0;
	}
</style>
