<script>
	import { page } from '$app/stores';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import MuscleHeatmap from '$lib/components/fitness/MuscleHeatmap.svelte';
	import { Dumbbell, Route, Flame, Weight, Beef, Scale, Target } from '@lucide/svelte';
	import FitnessStreakAura from '$lib/components/fitness/FitnessStreakAura.svelte';
	import { onMount } from 'svelte';
	import { detectFitnessLang, fitnessSlugs, t } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';

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
				const d = await res.json();
				goalWeekly = d.weeklyWorkouts;
				goalStreak = d.streak;
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

	// Macro ring SVG parameters — 300° arc with 60° gap at bottom
	const RADIUS = 28;
	const ARC_DEGREES = 300;
	const ARC_LENGTH = (ARC_DEGREES / 360) * 2 * Math.PI * RADIUS;
	const ARC_ROTATE = 120; // gap centered at bottom

	/** @param {number} percent */
	function strokeOffset(percent) {
		return ARC_LENGTH - (percent / 100) * ARC_LENGTH;
	}

	/**
	 * Get SVG coordinates for a triangle marker at a given percentage on the arc.
	 * @param {number} percent
	 */
	function targetMarkerPos(percent) {
		// Arc starts at ARC_ROTATE degrees (120° = 7 o'clock in SVG coords) and sweeps 300° clockwise
		const startAngle = ARC_ROTATE;
		const angleDeg = startAngle + (percent / 100) * ARC_DEGREES;
		const angleRad = (angleDeg * Math.PI) / 180;
		const outerR = RADIUS + 7;
		const cx = 35 + outerR * Math.cos(angleRad);
		const cy = 35 + outerR * Math.sin(angleRad);
		// Label: primarily radial (along center→marker line), with tangential
		// nudge only near 50% where the label would sit right at the top
		const closeness = 1 - Math.abs(percent - 50) / 50; // 0 at edges, 1 at 50%
		// Base radial distance: extra +4 for >50% values outside the close-to-50 zone
		const highBonus = percent > 50 && closeness < 0.4 ? 4 : 0;
		// Bump for the 30-70% zone (peaks at 40% and 60%)
		const midBump = Math.max(0, 1 - Math.abs(closeness - 0.2) / 0.3) * 4;
		const labelR = outerR + 17 + highBonus + midBump - closeness * closeness * 14;
		const tOff = closeness * closeness * 14; // quadratic: stronger nudge near 50%
		const dir = percent < 50 ? -1 : 1;
		const tangentRad = angleRad + dir * Math.PI / 2;
		const lx = 35 + labelR * Math.cos(angleRad) + tOff * Math.cos(tangentRad);
		const ly = 35 + labelR * Math.sin(angleRad) + tOff * Math.sin(tangentRad);
		return { cx, cy, lx, ly, angleDeg };
	}

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

	{#if ns}
		<div class="nutrition-grid">
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
				<div class="card-label">{t('calorie_balance', lang)}</div>
				<div class="card-hint">
					{#if ns.avgCalorieBalance != null}
						{t('seven_day_avg', lang)}
					{:else}
						{t('no_calorie_goal', lang)}
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
				<div class="card-label">{t('diet_adherence', lang)}</div>
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
					<div class="macro-header">{t('macro_split', lang)} <span class="macro-subtitle">({t('seven_day_avg', lang)})</span></div>
					<div class="macro-rings">
						{#each [
							{ pct: ns.macroSplit.protein, target: ns.macroTargets?.protein, label: t('protein', lang), cls: 'ring-protein', fill: '#a3be8c' },
							{ pct: ns.macroSplit.fat, target: ns.macroTargets?.fat, label: t('fat', lang), cls: 'ring-fat', fill: '#d08770' },
							{ pct: ns.macroSplit.carbs, target: ns.macroTargets?.carbs, label: t('carbs', lang), cls: 'ring-carbs', fill: '#81a1c1' },
						] as macro (macro.cls)}
							<div class="macro-ring">
								<svg class="macro-ring-svg" viewBox="0 0 70 70">
									<circle
										class="ring-bg"
										cx="35" cy="35" r={RADIUS}
										stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
										transform="rotate({ARC_ROTATE} 35 35)"
									/>
									<circle
										class="ring-fill {macro.cls}"
										cx="35" cy="35" r={RADIUS}
										stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
										stroke-dashoffset={strokeOffset(macro.pct)}
										transform="rotate({ARC_ROTATE} 35 35)"
									/>
									{#if macro.target != null}
										{@const pos = targetMarkerPos(macro.target)}
										<path
											fill={macro.fill}
											opacity="0.85"
											stroke={macro.fill}
											stroke-width="0.8"
											stroke-linejoin="round"
											d="M{pos.cx},{pos.cy - 3.5}L{pos.cx - 3},{pos.cy + 2.5}L{pos.cx + 3},{pos.cy + 2.5}Z"
											transform="rotate({pos.angleDeg - 90} {pos.cx} {pos.cy})"
										/>
										<text
											class="target-label"
											fill={macro.fill}
											x={pos.lx}
											y={pos.ly}
											text-anchor="middle"
											dominant-baseline="central"
										>{macro.target}%</text>
									{/if}
									<text class="ring-text" x="35" y="35">{macro.pct}%</text>
								</svg>
								<span class="macro-label">{macro.label}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="section-block">
		<h2 class="section-title">{t('muscle_balance', lang)}</h2>
		<MuscleHeatmap data={data.muscleHeatmap} />
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
	.nutrition-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6rem;
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
	.nutrition-grid .card-icon {
		flex-shrink: 0;
	}
	.nutrition-grid .card-hint {
		display: block;
		width: 100%;
		text-align: center;
		font-size: 0.7rem;
	}
	.card-value.positive { color: var(--nord14); }
	.card-value.negative { color: var(--nord11); }
	.card-value-na {
		color: var(--color-text-secondary);
		opacity: 0.5;
	}

	/* Macro split card — spans full row, horizontal layout */
	.macro-card {
		grid-column: 1 / -1;
		padding: 1rem 1.25rem;
		flex-direction: row !important;
		align-items: center !important;
		gap: 1.25rem !important;
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
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		flex: 1;
		max-width: 130px;
	}
	.macro-ring-svg {
		width: 100%;
		height: auto;
		max-width: 110px;
		overflow: visible;
	}
	.ring-bg {
		fill: none;
		stroke: var(--color-border);
		stroke-width: 5;
		stroke-linecap: round;
	}
	.ring-fill {
		fill: none;
		stroke-width: 5;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.4s ease;
	}
	.ring-text {
		font-size: 14px;
		font-weight: 700;
		fill: currentColor;
		text-anchor: middle;
		dominant-baseline: central;
	}
	.ring-protein { stroke: var(--nord14, #a3be8c); }
	.ring-fat { stroke: var(--nord12, #d08770); }
	.ring-carbs { stroke: var(--nord9, #81a1c1); }
	.macro-label {
		font-size: 0.85rem;
		font-weight: 600;
		text-align: center;
	}
	.target-label {
		font-size: 7px;
		font-weight: 700;
	}

	@media (max-width: 600px) {
		.nutrition-grid {
			grid-template-columns: repeat(3, 1fr);
		}
		.macro-card {
			flex-direction: column !important;
		}
		.macro-header {
			text-align: center;
		}
	}
	@media (max-width: 400px) {
		.nutrition-grid {
			grid-template-columns: 1fr;
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
