<script>
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import MuscleHeatmap from '$lib/components/fitness/MuscleHeatmap.svelte';
	import { Dumbbell, Route, Flame, Weight, Beef, Droplet, Wheat, Scale, Target, Info } from '@lucide/svelte';
	import FitnessStreakAura from '$lib/components/fitness/FitnessStreakAura.svelte';
	import { onMount } from 'svelte';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import StatsRingGraph from '$lib/components/fitness/StatsRingGraph.svelte';

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

	let goalStreak = $derived(data.goal?.streak ?? 0);
	let goalWeekly = $derived(data.goal?.weeklyWorkouts ?? null);
	let showBalanceInfo = $state(false);
	let showAdherenceInfo = $state(false);
	let goalEditing = $state(false);
	let goalInput = $state(4);
	let goalSaving = $state(false);

	const hasDemographics = $derived(data.goal?.sex != null && data.goal?.heightCm != null && data.goal?.birthYear != null);

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
				await invalidateAll();
				goalEditing = false;
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to save goal');
			}
		} catch { toast.error('Failed to save goal'); } finally {
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

	const ns = $derived(data.nutritionStats);

	const hasSma = $derived(stats.weightChart?.sma?.some((/** @type {any} */ v) => v !== null));

	const weightChartData = $derived({
		labels: stats.weightChart?.labels ?? [],
		dates: stats.weightChart?.dates,
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

<svelte:head><title>{t('stats_title', lang)} - Bocken</title></svelte:head>

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
				<div class="card-label">{t('burned', lang)}</div>
				{#if !hasDemographics}
					<div class="card-hint">{t('kcal_set_profile', lang)} <a href="/fitness/{fitnessSlugs(lang).measure}">{t('measure_title', lang)}</a></div>
				{/if}
			</div>
		{/if}
		<div class="lifetime-card cardio">
			<div class="card-icon"><Route size={24} /></div>
			<div class="card-value">{stats.totalCardioKm ?? 0}<span class="card-unit">km</span></div>
			<div class="card-label">{t('covered', lang)}</div>
		</div>
	</div>

	{#if goalEditing}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="goal-editor-overlay" onkeydown={(e) => { if (e.key === 'Escape') goalEditing = false; }} role="dialog" tabindex="-1">
			<div class="goal-editor-backdrop" onclick={() => goalEditing = false} onkeydown={(e) => { if (e.key === 'Escape') goalEditing = false; }} role="presentation"></div>
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

	<div class="muscle-nutrition-layout">
		{#if ns}
			<div class="lifetime-card protein-card">
				<div class="card-icon"><Beef size={24} /></div>
				{#if ns.avgProteinPerKg != null}
					<div class="card-value">{ns.avgProteinPerKg.toFixed(1)}<span class="card-unit">{t('protein_per_kg_unit', lang)}</span></div>
				{:else}
					<div class="card-value card-value-na">—</div>
				{/if}
				<div class="card-label">{t('protein_per_kg', lang)}</div>
				<div class="card-hint">
					{#if ns.avgProteinPerKg != null}
						{t('seven_day_avg', lang)}
					{:else if !ns.trendWeight}
						{t('no_weight_data', lang)}
					{:else}
						{t('no_nutrition_data', lang)}
					{/if}
				</div>
			</div>

			<div class="lifetime-card balance-card" class:surplus={ns.avgCalorieBalance > 0} class:deficit={ns.avgCalorieBalance < 0}>
				<div class="card-icon"><Scale size={24} /></div>
				{#if ns.avgCalorieBalance != null}
					<div class="card-value" class:positive={ns.avgCalorieBalance > 0} class:negative={ns.avgCalorieBalance < 0}>
						{ns.avgCalorieBalance > 0 ? '+' : ''}{ns.avgCalorieBalance}<span class="card-unit">{t('calorie_balance_unit', lang)}</span>
					</div>
				{:else}
					<div class="card-value card-value-na">—</div>
				{/if}
				<div class="card-label card-label-info">
					{t('calorie_balance', lang)}
					<button class="card-info-trigger" onclick={() => showBalanceInfo = !showBalanceInfo} aria-label="Info"><Info size={12} /></button>
					{#if showBalanceInfo}
						<div class="card-info-tooltip">
							{lang === 'en'
								? 'Average daily calories eaten minus estimated expenditure (TDEE + tracked workout calories) over the last 7 days. Negative = deficit, positive = surplus.'
								: 'Durchschnittlich gegessene Kalorien minus geschätzter Verbrauch (TDEE + erfasste Trainingskilokalorien) der letzten 7 Tage. Negativ = Defizit, positiv = Überschuss.'}
							{#if ns.avgDailyExpenditure}
								{lang === 'en'
									? `Est. daily expenditure: ~${ns.avgDailyExpenditure} kcal`
									: `Geschätzter Tagesverbrauch: ~${ns.avgDailyExpenditure} kcal`}
							{/if}
						</div>
					{/if}
				</div>
				<div class="card-hint">
					{#if ns.avgCalorieBalance != null}
						{t('seven_day_avg', lang)}
					{:else}
						{lang === 'en' ? 'Set height, birth year & weight' : 'Größe, Geburtsjahr & Gewicht eintragen'}
					{/if}
				</div>
			</div>

			<div class="lifetime-card adherence-card">
				<div class="card-icon"><Target size={24} /></div>
				{#if ns.adherencePercent != null}
					<div class="card-value">{ns.adherencePercent}<span class="card-unit">%</span></div>
				{:else}
					<div class="card-value card-value-na">—</div>
				{/if}
				<div class="card-label card-label-info">
					{t('diet_adherence', lang)}
					<button class="card-info-trigger" onclick={() => showAdherenceInfo = !showAdherenceInfo} aria-label="Info"><Info size={12} /></button>
					{#if showAdherenceInfo}
						<div class="card-info-tooltip">
							{lang === 'en'
								? 'Percentage of days where calories eaten were within ±10% of your goal (adjusted for exercise calories burned). Days without tracking count as misses.'
								: 'Prozent der Tage, an denen die gegessenen Kalorien innerhalb von ±10 % deines Ziels lagen (bereinigt um verbrannte Trainings\u00ADkalorien). Nicht erfasste Tage zählen als verfehlt.'}
						</div>
					{/if}
				</div>
				<div class="card-hint">
					{#if ns.adherencePercent != null}
						{t('since_start', lang)} ({ns.adherenceDays} {t('days', lang)})
					{:else}
						{t('no_calorie_goal', lang)}
					{/if}
				</div>
			</div>

			{#if ns.macroSplit}
				<div class="lifetime-card macro-card">
					<div class="macro-left">
						<div class="macro-header">{t('macro_split', lang)} <span class="macro-subtitle">({t('seven_day_avg', lang)})</span></div>
						<div class="macro-legend">
							<span class="macro-legend-item">
								<svg viewBox="0 0 12 12" width="12" height="12"><path d="M3,9.5 A4,4 0 1,1 9,9.5" fill="none" stroke="var(--color-text-secondary)" stroke-width="2" stroke-linecap="round"/></svg>
								{lang === 'en' ? 'Actual' : 'Ist'}
							</span>
							<span class="macro-legend-item">
								<svg viewBox="0 0 12 12" width="12" height="12"><path d="M6,10 L10,2 L2,2 Z" fill="var(--color-text-secondary)" stroke="var(--color-text-secondary)" stroke-width="1.5" stroke-linejoin="round"/></svg>
								{lang === 'en' ? 'Target' : 'Ziel'}
							</span>
						</div>
					</div>
					<div class="macro-rings">
						{#each [
							{ pct: ns.macroSplit.protein, target: ns.macroTargets?.protein, label: t('protein', lang), color: 'var(--nord14)', fill: '#a3be8c', icon: Beef },
							{ pct: ns.macroSplit.fat, target: ns.macroTargets?.fat, label: t('fat', lang), color: 'var(--nord12)', fill: '#d08770', icon: Droplet },
							{ pct: ns.macroSplit.carbs, target: ns.macroTargets?.carbs, label: t('carbs', lang), color: 'var(--nord9)', fill: '#81a1c1', icon: Wheat },
						] as macro (macro.color)}
							{@const MacroIcon = macro.icon}
							<div class="macro-ring">
								<StatsRingGraph
									percent={macro.pct}
									color={macro.color}
									label={macro.label}
									target={macro.target}
									markerColor={macro.fill}
								>
									{#snippet labelIcon()}<MacroIcon size={12} />{/snippet}
								</StatsRingGraph>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<div class="section-block muscle-heatmap-block">
			<h2 class="section-title">{t('muscle_balance', lang)}</h2>
			<MuscleHeatmap data={data.muscleHeatmap} />
		</div>
	</div>
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

	/* Nutrition masonry grid */
	.muscle-nutrition-layout {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.6rem;
	}
	.muscle-nutrition-layout .muscle-heatmap-block {
		grid-column: 1 / -1;
	}
	@media (min-width: 750px) {
		.muscle-nutrition-layout {
			grid-template-columns: 1fr 1fr 1fr 1fr;
			grid-template-rows: auto 1fr;
		}
		.muscle-nutrition-layout .macro-card {
			grid-column: 4;
			grid-row: 1 / 3;
			flex-direction: column !important;
			align-items: center !important;
		}
		.muscle-nutrition-layout .macro-card .macro-rings {
			flex-direction: column;
			align-items: center;
			gap: 0.5rem;
		}
		.muscle-nutrition-layout .macro-card .macro-header {
			text-align: center;
			margin-bottom: 1.25rem;
		}
		.muscle-nutrition-layout .muscle-heatmap-block {
			grid-column: 1 / 4;
		}
	}
	.protein-card::before { background: var(--nord14); }
	.balance-card::before { background: var(--color-text-secondary); }
	.balance-card.surplus::before { background: var(--nord14); }
	.balance-card.deficit::before { background: var(--nord11); }
	.adherence-card::before { background: var(--nord13); }
	.macro-card::before { background: var(--color-primary); }
	.protein-card .card-icon {
		color: var(--nord14);
		background: color-mix(in srgb, var(--nord14) 15%, transparent);
	}
	.balance-card .card-icon {
		color: var(--color-text-secondary);
		background: color-mix(in srgb, var(--color-text-secondary) 15%, transparent);
	}
	.balance-card.surplus .card-icon {
		color: var(--nord14);
		background: color-mix(in srgb, var(--nord14) 15%, transparent);
	}
	.balance-card.deficit .card-icon {
		color: var(--nord11);
		background: color-mix(in srgb, var(--nord11) 15%, transparent);
	}
	.adherence-card .card-icon {
		color: var(--nord13);
		background: color-mix(in srgb, var(--nord13) 15%, transparent);
	}
	.muscle-nutrition-layout .card-icon {
		flex-shrink: 0;
	}
	.muscle-nutrition-layout .card-hint {
		display: block;
		width: 100%;
		text-align: center;
		font-size: 0.7rem;
	}
	.card-label-info {
		position: relative;
	}
	.card-info-trigger {
		display: inline-flex;
		align-items: center;
		vertical-align: middle;
		opacity: 0.4;
		cursor: pointer;
		margin-left: 0.15rem;
		background: none;
		border: none;
		padding: 0;
		color: inherit;
	}
	.card-info-trigger:hover {
		opacity: 0.8;
	}
	.card-info-tooltip {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-bottom: 0.4rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 0.5rem 0.65rem;
		font-size: 0.7rem;
		font-weight: 400;
		line-height: 1.5;
		color: var(--color-text-secondary);
		text-transform: none;
		letter-spacing: normal;
		white-space: normal;
		max-width: 240px;
		width: max-content;
		text-align: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		z-index: 20;
	}
	.card-value.positive { color: var(--nord14); }
	.card-value.negative { color: var(--nord11); }
	.card-value-na {
		color: var(--color-text-secondary);
		opacity: 0.5;
	}

	/* Macro split card — spans full row on mobile, sidebar on desktop */
	.macro-card {
		grid-column: 1 / -1;
		padding: 1rem 1.25rem;
		flex-direction: row !important;
		align-items: center !important;
		gap: 1.25rem !important;
	}
	@media (min-width: 750px) {
		.macro-card {
			grid-column: auto;
			padding: 0.75rem;
			gap: 0.75rem !important;
		}
	}
	.macro-header {
		font-size: 1.15rem;
		font-weight: 700;
		white-space: nowrap;
		text-align: left;
		line-height: 1.3;
	}
	.macro-subtitle {
		display: block;
		font-weight: 400;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
	.macro-rings {
		display: flex;
		justify-content: space-evenly;
		flex: 1;
		width: 100%;
	}
	.macro-ring {
		flex: 1;
		max-width: 130px;
	}
	.macro-ring :global(.ring-svg) {
		width: 100%;
		height: auto;
		max-width: 110px;
	}
	.macro-ring :global(.ring-label) {
		font-size: 0.85rem;
	}
	.macro-left {
		flex-shrink: 0;
	}
	.macro-legend {
		display: flex;
		gap: 1rem;
		margin-top: 0.25rem;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
	}
	.macro-legend-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	@media (max-width: 600px) {
		.muscle-nutrition-layout {
			grid-template-columns: repeat(3, 1fr);
		}
		.macro-card {
			flex-direction: column !important;
		}
		.macro-header {
			text-align: center;
		}
		.macro-legend {
			justify-content: center;
		}
	}
	@media (max-width: 400px) {
		.muscle-nutrition-layout {
			grid-template-columns: 1fr;
		}
		.muscle-nutrition-layout .muscle-heatmap-block {
			grid-column: 1;
		}
		.macro-card {
			grid-column: 1;
			flex-direction: column !important;
		}
		.macro-header {
			text-align: center;
		}
	}
	@media (max-width: 357px) {
		.macro-rings {
			flex-direction: column;
			align-items: center;
			gap: 0.5rem;
		}
	}

	.empty-chart {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 2rem 0;
	}

	.section-block {
		background: var(--color-surface);
		border-radius: 12px;
		padding: 1rem;
		box-shadow: var(--shadow-sm);
	}
	.section-title {
		margin: 0 0 0.75rem;
		font-size: 1rem;
		font-weight: 700;
	}
</style>
