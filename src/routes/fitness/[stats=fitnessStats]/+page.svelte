<script>
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import MuscleHeatmap from '$lib/components/fitness/MuscleHeatmap.svelte';
	import SegmentCard from '$lib/components/fitness/SegmentCard.svelte';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import Route from '@lucide/svelte/icons/route';
	import Flame from '@lucide/svelte/icons/flame';
	import Weight from '@lucide/svelte/icons/weight';
	import Beef from '@lucide/svelte/icons/beef';
	import Droplet from '@lucide/svelte/icons/droplet';
	import Wheat from '@lucide/svelte/icons/wheat';
	import Scale from '@lucide/svelte/icons/scale';
	import Target from '@lucide/svelte/icons/target';
	import Info from '@lucide/svelte/icons/info';
	import Ruler from '@lucide/svelte/icons/ruler';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import Crown from '@lucide/svelte/icons/crown';
	import Users from '@lucide/svelte/icons/users';
	import Activity from '@lucide/svelte/icons/activity';
	import Zap from '@lucide/svelte/icons/zap';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import X from '@lucide/svelte/icons/x';
	import { formatElapsed, formatPaceKm, formatEffortRate } from '$lib/fitness/segmentFormat';
	import { activityKindOf } from '$lib/fitness/bestEffortDistances';
	import { projectTrack, svgPath } from '$lib/fitness/trackSvg';
	import ActivityIcon from '$lib/components/fitness/ActivityIcon.svelte';
	import FitnessStreakAura from '$lib/components/fitness/FitnessStreakAura.svelte';
	import PeriodTracker from '$lib/components/fitness/PeriodTracker.svelte';
	import { onMount, untrack } from 'svelte';
	import { buildSegStat } from '$lib/fitness/segmentStat';
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import StatsRingGraph from '$lib/components/fitness/StatsRingGraph.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import { BODY_PART_CARDS, bodyPartSlug, bodyPartAccent } from '$lib/js/fitnessBodyParts';

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const statsSlug = $derived(lang === 'en' ? 'stats' : 'statistik');
	const historySlug = $derived(lang === 'en' ? 'history' : 'verlauf');

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
	// Purple trend + orange raw so BF reads differently from weight at a glance
	const bfAccent = $derived('#B48EAD');
	const bfAccentFill = $derived(dark ? 'rgba(180, 142, 173, 0.2)' : 'rgba(180, 142, 173, 0.16)');

	const stats = $derived(data.stats ?? {});

	const latestBp = $derived(data.latest?.measurements?.value ?? {});

	/** @param {import('$lib/js/fitnessBodyParts').BodyPartCard} c */
	function currentValue(c) {
		if (c.paired) {
			const l = /** @type {number|undefined} */ (latestBp[c.dbLeft]);
			const r = /** @type {number|undefined} */ (latestBp[c.dbRight]);
			return { left: l ?? null, right: r ?? null };
		}
		const v = /** @type {number|undefined} */ (latestBp[c.db]);
		return { value: v ?? null };
	}

	/** @param {import('$lib/js/fitnessBodyParts').BodyPartCard} c */
	function hasAny(c) {
		const v = currentValue(c);
		if (c.paired) return v.left != null || v.right != null;
		return v.value != null;
	}

	const cardsWithData = $derived(BODY_PART_CARDS.filter(hasAny));

	let goalStreak = $derived(data.goal?.streak ?? 0);
	let goalWeekly = $derived(data.goal?.weeklyWorkouts ?? null);
	let showBalanceInfo = $state(false);
	let showAdherenceInfo = $state(false);
	let goalEditing = $state(false);
	let goalInput = $state(4);
	let goalSaving = $state(false);

	const hasDemographics = $derived(data.goal?.sex != null && data.goal?.heightCm != null && data.goal?.birthYear != null);

	// --- dashboard section visibility (per-user, /api/fitness/dashboard) ---
	const DASH_KEYS = ['simpleStats', 'streak', 'weight', 'bodyFat', 'dietStats', 'muscleBalance', 'bodyParts', 'segmentStat', 'fastestK', 'ownPeriod', 'sharedPeriods'];
	let prefs = $derived.by(() => {
		const d = data.dashboard ?? {};
		/** @type {Record<string, boolean>} */
		const o = {};
		for (const k of DASH_KEYS) o[k] = d[k] !== false; // default on
		return o;
	});

	// Reflow rules for the diet/muscle grid:
	//  - diet off            → muscle balance goes full width
	//  - muscle off, diet on → body parts move up into the muscle-balance slot
	//  - …and body parts off → the macro split goes horizontal (no bottom row)
	const showMuscleNutrition = $derived(prefs.dietStats || prefs.muscleBalance);
	const bodyPartsMovedUp = $derived(!prefs.muscleBalance && prefs.dietStats && prefs.bodyParts && cardsWithData.length > 0);
	const macroHorizontal = $derived(!prefs.muscleBalance && prefs.dietStats && !prefs.bodyParts);
	const isFemale = $derived(data.goal?.sex === 'female');

	// --- Segment stat cards (track up to two segments: best time, pace, rank,
	// KOM reign, athletes, recent runs, 30d trend) ---
	/** @typedef {{ _id: string, name: string, activityType: string, distance: number, elevationGain: number, points: number[][], athleteCount: number, myBest: number|null, komTime: number|null }} SegSummary */
	/** @typedef {{ best: number|null, pace: number|null, rank: number|null, dir: 'improve'|'worse'|'neutral', delta: number, komDays: number|null, athletes: number, recent: number, failed: boolean }} SegStat */
	// Seeded from the server load (SSR) so the cards render filled on first paint.
	/** @type {SegSummary[]} */
	let segList = $state(untrack(() => data.segList ?? []));
	/** @type {string[]} */
	let segChosenIds = $state(untrack(() => data.segChosenIds ?? []));
	/** @type {Record<string, SegStat>} */
	let segStats = $state(untrack(() => ({ ...(data.segStats ?? {}) })));
	let segModalOpen = $state(false);
	// Activity filter for the segment picker (selection only — not the display cards).
	/** @type {'running' | 'cycling'} */
	let pickActivity = $state('running');
	const pickSegList = $derived(segList.filter((s) => activityKindOf(s.activityType) === pickActivity));

	/** @type {SegSummary[]} */
	const chosenSegs = $derived(segChosenIds.map((id) => segList.find((s) => s._id === id)).filter((s) => s != null));

	/** Fetch & store one segment's stat (used when the user picks a new segment). */
	/** @param {string} id */
	async function loadSegStat(id) {
		if (!id) return;
		try {
			const r = await fetch(`/api/fitness/segments/${encodeURIComponent(id)}`);
			if (!r.ok) return;
			const j = await r.json();
			const seg = segList.find((s) => s._id === id);
			segStats = { ...segStats, [id]: buildSegStat(j, seg?.athleteCount) };
		} catch { /* leave empty */ }
	}

	/** Toggle a segment in the (max two) tracked set. */
	/** @param {string} id */
	function toggleSeg(id) {
		let next = segChosenIds.includes(id)
			? segChosenIds.filter((x) => x !== id)
			: [...segChosenIds, id].slice(-2); // keep at most two, newest wins
		segChosenIds = next;
		for (const sid of next) if (!segStats[sid]) loadSegStat(sid);
		fetch('/api/fitness/dashboard', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ segmentStatIds: next })
		}).catch(() => {});
	}

	/** @param {string} id */
	function segMapFailed(id) {
		const s = segStats[id];
		if (s) segStats = { ...segStats, [id]: { ...s, failed: true } };
	}
	/** @param {SegSummary} seg */
	function segSvgPath(seg) {
		return svgPath(projectTrack(seg.points, 240, 150, 12));
	}
	/** @param {string} d */
	function fmtShortDate(d) {
		try {
			return new Date(d).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
		} catch { return ''; }
	}

	// --- Fastest Nk card (fastest run/ride over a user-set distance) ---
	// Seeded from the server load (SSR) — no on-mount fetch / layout shift.
	let fastestKm = $state(untrack(() => (typeof data.fastestKm === 'number' ? data.fastestKm : 5)));
	let fastestActivity = $state(untrack(() => /** @type {'running' | 'cycling'} */ (data.fastestActivity === 'cycling' ? 'cycling' : 'running')));
	/** @type {{ sessionId: string, name: string, date: string, activityType: string, seconds: number, pace: number, gpsPreview: number[][]|null } | null} */
	let fastest = $state(untrack(() => data.fastest ?? null));
	let fastestLoaded = $state(true);
	let fastestEditOpen = $state(false);
	let fastestMapFailed = $state(false);

	// Distance presets offered in the editor, per board (cycling rides longer).
	const fastestPresets = $derived(fastestActivity === 'cycling' ? [5, 10, 20, 40, 100] : [1, 5, 10, 21, 42]);

	async function loadFastest() {
		fastestLoaded = false;
		fastestMapFailed = false;
		try {
			const r = await fetch(`/api/fitness/stats/fastest?km=${fastestKm}&activity=${fastestActivity}`);
			if (r.ok) fastest = (await r.json()).best ?? null;
		} catch { fastest = null; }
		fastestLoaded = true;
	}
	/** @param {number} n */
	function setFastestKm(n) {
		fastestKm = Math.min(200, Math.max(1, Math.round(n)));
		loadFastest();
		fetch('/api/fitness/dashboard', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fastestKm })
		}).catch(() => {});
	}
	/** @param {'running' | 'cycling'} a */
	function setFastestActivity(a) {
		if (fastestActivity === a) return;
		fastestActivity = a;
		loadFastest();
		// Persist the chosen board so the card opens on it next time (default: running).
		fetch('/api/fitness/dashboard', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fastestActivity: a })
		}).catch(() => {});
	}

	// All segment/fastest cards in one responsive row. A lone trailing card (odd
	// count) stretches full-width, so: 1 → full, 2 → side by side, 3 → 2 + 1 full.
	const statCards = $derived.by(() => {
		/** @type {({ kind: 'seg', seg: SegSummary } | { kind: 'seg-empty' } | { kind: 'fastest' })[]} */
		const arr = [];
		if (prefs.segmentStat) {
			if (segList.length === 0) arr.push({ kind: 'seg-empty' });
			else for (const seg of chosenSegs) arr.push({ kind: 'seg', seg });
		}
		if (prefs.fastestK) arr.push({ kind: 'fastest' });
		return arr;
	});

	let dashEditing = $state(false);
	let dashSaving = $state(false);
	/** @type {Record<string, boolean>} */
	let draft = $state({});
	function openDashSettings() {
		draft = { ...prefs };
		dashEditing = true;
	}
	async function saveDash() {
		dashSaving = true;
		try {
			const res = await fetch('/api/fitness/dashboard', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(draft)
			});
			if (res.ok) {
				dashEditing = false;
				await invalidateAll();
			} else {
				toast.error(t.dash_save_failed);
			}
		} catch {
			toast.error(t.dash_save_failed);
		}
		dashSaving = false;
	}
	// Section toggles to show in the panel (own-cycle only for female users).
	let dashSections = $derived(
		[
			{ key: 'simpleStats', label: t.dash_overview },
			{ key: 'segmentStat', label: t.dash_segment },
			{ key: 'fastestK', label: t.dash_fastest },
			{ key: 'streak', label: t.dash_streak },
			{ key: 'weight', label: t.dash_weight },
			{ key: 'bodyFat', label: t.dash_bodyfat },
			{ key: 'dietStats', label: t.dash_diet },
			{ key: 'muscleBalance', label: t.muscle_balance },
			{ key: 'bodyParts', label: t.body_parts },
			...(isFemale ? [{ key: 'ownPeriod', label: t.dash_own_cycle }] : []),
			{ key: 'sharedPeriods', label: t.dash_shared_cycles }
		]
	);

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

	// Streamed panels. nutrition / periods resolve through $state so the card
	// shells render immediately with "—" placeholders; muscle heatmap is
	// wrapped in {#await} below instead because its internal $derived chain
	// needs the full resolved object in one shot to render correctly.
	/** @type {any} */
	let ns = $state({});
	/** @type {any[]} */
	let periodsData = $state([]);
	/** @type {any[]} */
	let sharedPeriodsData = $state([]);
	$effect(() => {
		Promise.resolve(data.nutritionStats)
			.then(v => { ns = v ?? {}; })
			.catch(err => console.error('nutritionStats stream failed:', err));
	});
	$effect(() => {
		Promise.resolve(data.periods)
			.then(v => { periodsData = v ?? []; })
			.catch(err => console.error('periods stream failed:', err));
	});
	$effect(() => {
		Promise.resolve(data.sharedPeriods)
			.then(v => { sharedPeriodsData = v ?? []; })
			.catch(err => console.error('sharedPeriods stream failed:', err));
	});

	const hasSma = $derived(stats.weightChart?.sma?.some((/** @type {any} */ v) => v !== null));

	const hasSmaBf = $derived(stats.bfChart?.sma?.some((/** @type {any} */ v) => v !== null));

	const bfChartData = $derived({
		labels: stats.bfChart?.labels ?? [],
		dates: stats.bfChart?.dates,
		datasets: [
			...(hasSmaBf ? [
				{
					label: '± 1σ',
					data: stats.bfChart.upper,
					borderColor: 'transparent',
					backgroundColor: bfAccentFill,
					fill: '+1',
					pointRadius: 0,
					borderWidth: 0,
					tension: 0.3,
					order: 2
				},
				{
					label: '± 1σ (lower)',
					data: stats.bfChart.lower,
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
					data: stats.bfChart.sma,
					borderColor: bfAccent,
					pointRadius: 0,
					borderWidth: 3,
					tension: 0.3,
					order: 1
				}
			] : []),
			{
				label: 'Body fat Δ (pp)',
				data: stats.bfChart?.data ?? [],
				borderColor: '#D08770',
				borderWidth: hasSmaBf ? 1 : 2,
				pointRadius: 3,
				order: 0
			}
		]
	});

	/**
	 * Tooltip: show signed delta + absolute %, and for the trend line the ±1σ range.
	 * @param {number} v
	 * @param {number} _datasetIndex
	 * @param {number} dataIndex
	 * @param {string} label
	 */
	function bfTooltipFormatter(v, _datasetIndex, dataIndex, label) {
		const baseline = stats.bfChart?.baseline ?? 0;
		const abs = baseline + v;
		const sign = v > 0 ? '+' : v < 0 ? '' : '±';
		const base = `${sign}${v.toFixed(2)} pp · ${abs.toFixed(1)}%`;
		if (label === 'Trend') {
			const upper = stats.bfChart?.upper?.[dataIndex];
			const lower = stats.bfChart?.lower?.[dataIndex];
			if (upper != null && lower != null) {
				const sigma = (upper - lower) / 2;
				const absLower = baseline + lower;
				const absUpper = baseline + upper;
				return `${sign}${v.toFixed(2)} ±${sigma.toFixed(2)} pp · ${abs.toFixed(1)}% (${absLower.toFixed(1)}–${absUpper.toFixed(1)}%)`;
			}
		}
		return base;
	}

	const bfChartTitle = $derived.by(() => {
		const baseline = stats.bfChart?.baseline;
		const label = t.body_fat.replace(' %', '').replace(' (%)', '');
		if (baseline == null) return label;
		const suffix = `${t.bf_delta_from_prefix} ${baseline.toFixed(1)}%`;
		return `${label} · ${suffix}`;
	});

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

<svelte:head><title>{t.stats_title} - Bocken</title></svelte:head>

<div class="stats-page">
	<h1 class="sr-only">{t.stats_title}</h1>

	{#if dashEditing}
		<div class="dash-overlay" onkeydown={(e) => { if (e.key === 'Escape') dashEditing = false; }} role="dialog" tabindex="-1">
			<div class="dash-backdrop" onclick={() => dashEditing = false} role="presentation"></div>
			<div class="dash-panel">
				<h3>{t.dash_customize}</h3>
				<div class="dash-toggles">
					{#each dashSections as section (section.key)}
						<div class="dash-row">
							<span class="dash-row-label">{section.label}</span>
							<Toggle bind:checked={draft[section.key]} />
						</div>
					{/each}
				</div>
				<div class="dash-actions">
					<button class="dash-cancel" onclick={() => dashEditing = false}>{t.cancel}</button>
					<button class="dash-save" onclick={saveDash} disabled={dashSaving}>{dashSaving ? t.saving : t.save}</button>
				</div>
			</div>
		</div>
	{/if}

	{#if prefs.simpleStats}
	<div class="lifetime-cards">
		<div class="lifetime-card workouts">
			<div class="card-icon"><Dumbbell size={24} /></div>
			<div class="card-value">{stats.totalWorkouts ?? 0}</div>
			<div class="card-label">{(stats.totalWorkouts ?? 0) === 1 ? t.workout_singular : t.workouts_plural}</div>
		</div>
		<div class="lifetime-card tonnage">
			<div class="card-icon"><Weight size={24} /></div>
			<div class="card-value">{stats.totalTonnage ?? 0}<span class="card-unit">t</span></div>
			<div class="card-label">{t.lifted}</div>
		</div>
		{#if stats.kcalEstimate}
			<div class="lifetime-card kcal">
				<div class="card-icon"><Flame size={24} /></div>
				<div class="card-value">~{stats.kcalEstimate.kcal.toLocaleString()}<span class="card-unit">kcal</span></div>
				<div class="card-label">{t.burned}</div>
				{#if !hasDemographics}
					<div class="card-hint">{t.kcal_set_profile} <a href={resolve('/fitness/[checkin=fitnessCheckIn]', { checkin: fitnessSlugs(lang).measure })}>{t.measure_title}</a></div>
				{/if}
			</div>
		{/if}
		<div class="lifetime-card cardio">
			<div class="card-icon"><Route size={24} /></div>
			<div class="card-value">{stats.totalCardioKm ?? 0}<span class="card-unit">km</span></div>
			<div class="card-label">{t.covered}</div>
		</div>
	</div>
	{/if}

	{#if prefs.segmentStat || prefs.fastestK}
	<div class="segment-stat-row">
		{#each statCards as card, i (card.kind === 'seg' ? card.seg._id : card.kind)}
			{@const full = statCards.length % 2 === 1 && i === statCards.length - 1}
			{#if card.kind === 'seg-empty'}
				<div class="seg-card-empty" class:span-full={full}>
					<div class="seg-empty-icon"><Route size={22} /></div>
					<p class="seg-empty-text">
						{t.seg_stat_none}
						<a href={resolve('/fitness/[segments=fitnessSegments]', { segments: lang === 'en' ? 'segments' : 'segmente' })}>{t.segments}</a>
					</p>
				</div>
			{:else if card.kind === 'seg'}
				{@const seg = card.seg}
				{@const st = segStats[seg._id]}
				<div class="seg-card-wrap" class:span-full={full}>
					<button type="button" class="seg-card" onclick={() => (segModalOpen = true)} aria-label={t.dash_segment}>
					<div class="seg-map">
						{#if !st?.failed}
							<img class="seg-map-img" src={`/api/fitness/segments/${seg._id}/map.webp`} alt="" loading="lazy" decoding="async" onerror={() => segMapFailed(seg._id)} />
						{:else}
							<svg class="seg-map-svg" viewBox="0 0 240 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
								<path d={segSvgPath(seg)} class="seg-route-casing" />
								<path d={segSvgPath(seg)} class="seg-route" />
							</svg>
						{/if}
						{#if st?.rank != null}
							<span class="seg-rank" class:kom={st.rank === 1} title={t.rank}>
								{#if st.rank === 1}<Crown size={12} />{/if}
								{st.rank === 1 ? t.seg_stat_1st : `#${st.rank}`}
							</span>
						{/if}
						<span class="seg-activity-badge" title={seg.activityType}><ActivityIcon activity={seg.activityType} size={13} /></span>
					</div>

					<div class="seg-body">
						<span class="seg-name" title={seg.name}>{seg.name}</span>

						<div class="seg-figures">
							{#if st?.best != null}
								<span class="seg-time">{formatElapsed(st.best)}</span>
								{#if st.pace != null}<span class="seg-pace">{formatPaceKm(st.pace)}</span>{/if}
							{:else}
								<span class="seg-time muted">{st ? '—' : '…'}</span>
								<span class="seg-pace">{st ? t.no_efforts : ''}</span>
							{/if}
							{#if st?.best != null}
								{#if st.dir === 'improve'}
									<span class="seg-delta improve" title={t.seg_stat_trend_hint}><TrendingDown size={14} /> {formatElapsed(st.delta)}</span>
								{:else if st.dir === 'worse'}
									<span class="seg-delta worse" title={t.seg_stat_trend_hint}><TrendingUp size={14} /> {formatElapsed(st.delta)}</span>
								{/if}
							{/if}
						</div>

						<div class="seg-meta">
							<span class="seg-chip" title={t.distance}><Route size={13} /> {seg.distance.toFixed(2)} {t.km}</span>
							{#if st?.komDays != null}
								<span class="seg-chip kom" title={t.record_held_tooltip}><Crown size={13} /> {st.komDays}{t.days_short}</span>
							{/if}
							<span class="seg-chip" title={t.athletes}><Users size={13} /> {st?.athletes ?? '—'}</span>
							<span class="seg-chip" title={t.seg_runs_30d}><Activity size={13} /> {st?.recent ?? 0} <span class="seg-chip-sub">/ 30{t.days_short}</span></span>
						</div>
					</div>
				</button>
					<a class="seg-open-link" href={resolve('/fitness/[segments=fitnessSegments]/[id]', { segments: fitnessSlugs(lang).segments, id: seg._id })} title={t.view_segment} aria-label={t.view_segment}>
						<ExternalLink size={15} />
					</a>
					</div>
			{:else}
				<div class="seg-card-wrap" class:span-full={full}>
				<button type="button" class="seg-card" onclick={() => (fastestEditOpen = true)} aria-label={t.dash_fastest}>
					<div class="seg-map">
						{#if fastest && !fastestMapFailed}
							<img class="seg-map-img" src={`/api/fitness/sessions/${fastest.sessionId}/map.webp`} alt="" loading="lazy" decoding="async" onerror={() => (fastestMapFailed = true)} />
						{:else if fastest?.gpsPreview?.length}
							<svg class="seg-map-svg" viewBox="0 0 240 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
								<path d={svgPath(projectTrack(fastest.gpsPreview, 240, 150, 12))} class="seg-route-casing" />
								<path d={svgPath(projectTrack(fastest.gpsPreview, 240, 150, 12))} class="seg-route" />
							</svg>
						{:else}
							<div class="seg-map-blank"><Zap size={26} /></div>
						{/if}
						<span class="seg-rank dist"><ActivityIcon activity={fastestActivity} size={11} /> {fastestKm}{t.km_short}</span>
					</div>

					<div class="seg-body">
						<span class="seg-name">{t.fastest_title.replace('{n}', String(fastestKm))}</span>

						<div class="seg-figures">
							{#if fastest}
								<span class="seg-time">{formatElapsed(fastest.seconds)}</span>
								<span class="seg-pace">{formatEffortRate(fastestKm, fastest.seconds, fastestActivity)}</span>
							{:else}
								<span class="seg-time muted">{fastestLoaded ? '—' : '…'}</span>
								<span class="seg-pace">{fastestLoaded ? t.fastest_none : ''}</span>
							{/if}
						</div>

						{#if fastest}
							<div class="seg-meta">
								<span class="seg-chip seg-chip-name" title={fastest.name}>{fastest.name}</span>
								<span class="seg-chip">{fmtShortDate(fastest.date)}</span>
							</div>
						{/if}
					</div>
				</button>
				{#if fastest}
					<a class="seg-open-link" href={`${resolve('/fitness/[history=fitnessHistory]/[id]', { history: historySlug, id: fastest.sessionId })}?highlight=${fastestKm}k`} title={t.view_workout} aria-label={t.view_workout}>
						<ExternalLink size={15} />
					</a>
				{/if}
				</div>
			{/if}
		{/each}
	</div>

	{#if fastestEditOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="seg-modal-overlay" onclick={(e) => { if (e.target === e.currentTarget) fastestEditOpen = false; }} onkeydown={(e) => { if (e.key === 'Escape') fastestEditOpen = false; }} role="dialog" aria-modal="true" tabindex="-1">
			<div class="fastest-editor">
				<h3>{t.fastest_set}</h3>
				<div class="fastest-mode" role="group" aria-label={t.activity}>
					<button class:active={fastestActivity === 'running'} onclick={() => setFastestActivity('running')} aria-pressed={fastestActivity === 'running'}>
						<ActivityIcon activity="running" size={16} /> {t.activity_running}
					</button>
					<button class:active={fastestActivity === 'cycling'} onclick={() => setFastestActivity('cycling')} aria-pressed={fastestActivity === 'cycling'}>
						<ActivityIcon activity="cycling" size={16} /> {t.activity_cycling}
					</button>
				</div>
				<div class="goal-input-row">
					<button class="adj-btn" onclick={() => setFastestKm(fastestKm - 1)} disabled={fastestKm <= 1}>−</button>
					<span class="goal-value">{fastestKm}<span class="fastest-km-unit">{t.km_short}</span></span>
					<button class="adj-btn" onclick={() => setFastestKm(fastestKm + 1)} disabled={fastestKm >= 200}>+</button>
				</div>
				<div class="fastest-presets">
					{#each fastestPresets as p (p)}
						<button class="fastest-preset" class:active={fastestKm === p} onclick={() => setFastestKm(p)}>{p}{t.km_short}</button>
					{/each}
				</div>
				<button class="goal-save" onclick={() => (fastestEditOpen = false)}>{t.done}</button>
			</div>
		</div>
	{/if}

	{#if segModalOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="seg-modal-overlay" onclick={(e) => { if (e.target === e.currentTarget) segModalOpen = false; }} onkeydown={(e) => { if (e.key === 'Escape') segModalOpen = false; }} role="dialog" aria-modal="true" tabindex="-1">
			<div class="seg-modal">
				<div class="seg-modal-head">
					<div>
						<h3>{t.seg_stat_pick}</h3>
						<span class="seg-modal-sub">{t.seg_stat_pick_hint}</span>
					</div>
					<button class="seg-modal-close" onclick={() => (segModalOpen = false)} aria-label={t.close}><X size={18} /></button>
				</div>
				<div class="seg-pick-tabs" role="group" aria-label={t.activity}>
					<button class:active={pickActivity === 'running'} onclick={() => (pickActivity = 'running')} aria-pressed={pickActivity === 'running'}>
						<ActivityIcon activity="running" size={15} /> {t.activity_running}
					</button>
					<button class:active={pickActivity === 'cycling'} onclick={() => (pickActivity = 'cycling')} aria-pressed={pickActivity === 'cycling'}>
						<ActivityIcon activity="cycling" size={15} /> {t.activity_cycling}
					</button>
				</div>
				<div class="seg-modal-grid">
					{#if pickSegList.length === 0}
						<p class="seg-pick-empty">{t.no_segments}</p>
					{:else}
						{#each pickSegList as s (s._id)}
							<SegmentCard segment={s} {lang} selected={segChosenIds.includes(s._id)} onselect={toggleSeg} />
						{/each}
					{/if}
				</div>
			</div>
		</div>
	{/if}
	{/if}

	{#if goalEditing}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="goal-editor-overlay" onkeydown={(e) => { if (e.key === 'Escape') goalEditing = false; }} role="dialog" tabindex="-1">
			<div class="goal-editor-backdrop" onclick={() => goalEditing = false} onkeydown={(e) => { if (e.key === 'Escape') goalEditing = false; }} role="presentation"></div>
			<div class="goal-editor-panel">
				<h3>{t.weekly_goal}</h3>
				<div class="goal-input-row">
					<button class="adj-btn" onclick={() => { if (goalInput > 1) goalInput--; }} disabled={goalInput <= 1}>-</button>
					<span class="goal-value">{goalInput}</span>
					<button class="adj-btn" onclick={() => { if (goalInput < 14) goalInput++; }} disabled={goalInput >= 14}>+</button>
				</div>
				<span class="goal-unit">{t.workouts_per_week_goal}</span>
				<div class="goal-actions">
					<button class="goal-save" onclick={saveGoal} disabled={goalSaving}>
						{goalSaving ? t.saving : t.save}
					</button>
					<button class="goal-cancel" onclick={() => goalEditing = false}>{t.cancel}</button>
				</div>
			</div>
		</div>
	{/if}

	{#if prefs.streak}
	<div class="chart-streak-row">
		<div class="chart-streak-chart">
			{#if (stats.workoutsChart?.data?.length ?? 0) > 0}
				<FitnessChart
					type="bar"
					data={workoutsChartData}
					title={t.workouts_per_week}
					height="220px"
					goalLine={goalWeekly ?? undefined}
				/>
			{:else}
				<p class="empty-chart">{t.no_workout_data}</p>
			{/if}
		</div>
		<button class="streak-section" onclick={startGoalEdit}>
			<FitnessStreakAura value={goalStreak} />
			<div class="streak-meta">
				<span class="streak-unit">{goalStreak === 1 ? t.streak_week : t.streak_weeks}</span>
				<span class="streak-label">{t.streak}</span>
				{#if goalWeekly !== null}
					<span class="streak-goal">{goalWeekly}x / {t.streak_week.toLowerCase()}</span>
				{:else}
					<span class="streak-goal">{t.set_goal}</span>
				{/if}
			</div>
		</button>
	</div>
	{/if}

	{#if prefs.weight && (stats.weightChart?.data?.length ?? 0) > 1}
		<FitnessChart
			data={weightChartData}
			title={t.weight}
			yUnit=" kg"
			height="220px"
		/>
	{/if}

	{#if prefs.bodyFat && (stats.bfChart?.data?.length ?? 0) > 1}
		<FitnessChart
			data={bfChartData}
			title={bfChartTitle}
			yUnit=" pp"
			height="220px"
			tooltipFormatter={bfTooltipFormatter}
		/>
	{/if}

	{#if showMuscleNutrition}
	<div class="muscle-nutrition-layout" class:diet-off={!prefs.dietStats} class:macro-horizontal={macroHorizontal}>
			{#if prefs.dietStats}
			<div class="lifetime-card protein-card">
				<div class="card-icon"><Beef size={24} /></div>
				{#if ns.avgProteinPerKg != null}
					<div class="card-value">{ns.avgProteinPerKg.toFixed(1)}<span class="card-unit">{t.protein_per_kg_unit}</span></div>
				{:else}
					<div class="card-value card-value-na">—</div>
				{/if}
				<div class="card-label">{t.protein}</div>
				<div class="card-hint">
					{#if ns.avgProteinPerKg != null}
						{t.seven_day_avg}
					{:else if !ns.trendWeight}
						{t.no_weight_data}
					{:else}
						{t.no_nutrition_data}
					{/if}
				</div>
			</div>

			<div class="lifetime-card balance-card" class:surplus={ns.avgCalorieBalance > 0} class:deficit={ns.avgCalorieBalance < 0}>
				<div class="card-icon"><Scale size={24} /></div>
				{#if ns.avgCalorieBalance != null}
					<div class="card-value" class:positive={ns.avgCalorieBalance > 0} class:negative={ns.avgCalorieBalance < 0}>
						{ns.avgCalorieBalance > 0 ? '+' : ''}{ns.avgCalorieBalance}<span class="card-unit">{t.calorie_balance_unit}</span>
					</div>
				{:else}
					<div class="card-value card-value-na">—</div>
				{/if}
				<div class="card-label card-label-info">
					{t.calorie_balance}
					<button class="card-info-trigger" onclick={() => showBalanceInfo = !showBalanceInfo} aria-label="Info"><Info size={12} /></button>
					{#if showBalanceInfo}
						<div class="card-info-tooltip">
							{t.calorie_balance_tooltip}
							{#if ns.avgDailyExpenditure}
								{t.daily_expenditure_estimate_prefix} ~{ns.avgDailyExpenditure} kcal
							{/if}
						</div>
					{/if}
				</div>
				<div class="card-hint" class:card-hint-warning={ns.avgCalorieBalance == null && hasDemographics && ns.trendWeight && ns.daysTracked7 === 0}>
					{#if ns.avgCalorieBalance != null}
						{t.seven_day_avg}
					{:else if !hasDemographics || !ns.trendWeight}
						{t.set_height_birthyear_weight}
					{:else}
						{t.no_nutrition_data}
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
					{t.diet_adherence}
					<button class="card-info-trigger" onclick={() => showAdherenceInfo = !showAdherenceInfo} aria-label="Info"><Info size={12} /></button>
					{#if showAdherenceInfo}
						<div class="card-info-tooltip">
							{t.diet_adherence_tooltip}
						</div>
					{/if}
				</div>
				<div class="card-hint">
					{#if ns.adherencePercent != null}
						{t.since_start} ({ns.adherenceDays} {t.days})
					{:else}
						{t.no_calorie_goal}
					{/if}
				</div>
			</div>

			<div class="lifetime-card macro-card" class:macro-card-empty={!ns.macroSplit}>
				<div class="macro-left">
					<div class="macro-header">{t.macro_split} <span class="macro-subtitle">({t.seven_day_avg})</span></div>
					<div class="macro-legend">
						<span class="macro-legend-item">
							<svg viewBox="0 0 12 12" width="12" height="12"><path d="M3,9.5 A4,4 0 1,1 9,9.5" fill="none" stroke="var(--color-text-secondary)" stroke-width="2" stroke-linecap="round"/></svg>
							{t.actual_label}
						</span>
						<span class="macro-legend-item">
							<svg viewBox="0 0 12 12" width="12" height="12"><path d="M6,10 L10,2 L2,2 Z" fill="var(--color-text-secondary)" stroke="var(--color-text-secondary)" stroke-width="1.5" stroke-linejoin="round"/></svg>
							{t.target_label}
						</span>
					</div>
					{#if !ns.macroSplit}
						<div class="macro-empty-hint">{t.no_nutrition_data}</div>
					{/if}
				</div>
				<div class="macro-rings">
					{#each [
						{ pct: ns.macroSplit?.protein ?? 0, target: ns.macroTargets?.protein, label: t.protein, color: 'var(--nord14)', fill: '#a3be8c', icon: Beef },
						{ pct: ns.macroSplit?.fat ?? 0, target: ns.macroTargets?.fat, label: t.fat, color: 'var(--nord12)', fill: '#d08770', icon: Droplet },
						{ pct: ns.macroSplit?.carbs ?? 0, target: ns.macroTargets?.carbs, label: t.carbs, color: 'var(--nord9)', fill: '#81a1c1', icon: Wheat },
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

			{#if prefs.muscleBalance}
			<div class="section-block muscle-heatmap-block">
				<h2 class="section-title">{t.muscle_balance}</h2>
				{#await data.muscleHeatmap}
					<div class="muscle-heatmap-pending" aria-hidden="true"></div>
				{:then muscleHeatmap}
					<MuscleHeatmap data={muscleHeatmap} />
				{:catch}
					<div class="muscle-heatmap-failed">{lang === 'de' ? 'Fehler beim Laden' : 'Failed to load'}</div>
				{/await}
			</div>
			{:else if bodyPartsMovedUp}
			<div class="section-block bp-in-mb">
				{@render bodyPartsBlock()}
			</div>
			{/if}
	</div>
	{/if}

	{#snippet bodyPartsBlock()}
		<h2>{t.body_parts}</h2>
		<div class="bp-grid">
			{#each cardsWithData as card (card.key)}
					{@const cv = currentValue(card)}
					<a
						class="bp-card"
						style="--accent: {bodyPartAccent(card.key)}"
						href={resolve('/fitness/[stats=fitnessStats]/[history=fitnessHistory]/[part]', { stats: statsSlug, history: historySlug, part: bodyPartSlug(card, lang) })}
					>
						<div class="bp-img-wrap" aria-hidden="true">
							{#if card.img}
								<div
									class="bp-img"
									style="--bp-src: url(/fitness/measure/{card.img})"
								></div>
							{:else}
								<Ruler size={36} strokeWidth={1.5} />
							{/if}
						</div>
						<div class="bp-meta">
							<span class="bp-label">{t[card.labelKey]}</span>
							{#if card.paired}
								{#if cv.left != null && cv.right != null && cv.left === cv.right}
									<span class="bp-value">{cv.left.toFixed(1)}<span class="bp-unit">cm</span></span>
								{:else if cv.left != null && cv.right != null}
									<span class="bp-value paired">
										<span class="bp-side"><em>L</em> {cv.left.toFixed(1)}</span>
										<span class="bp-side-sep">·</span>
										<span class="bp-side"><em>R</em> {cv.right.toFixed(1)}</span>
										<span class="bp-unit">cm</span>
									</span>
								{:else if cv.left != null}
									<span class="bp-value"><em>L</em> {cv.left.toFixed(1)}<span class="bp-unit">cm</span></span>
								{:else if cv.right != null}
									<span class="bp-value"><em>R</em> {cv.right.toFixed(1)}<span class="bp-unit">cm</span></span>
								{/if}
							{:else if cv.value != null}
								<span class="bp-value">{cv.value.toFixed(1)}<span class="bp-unit">cm</span></span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
	{/snippet}

	{#if prefs.bodyParts && cardsWithData.length > 0 && !bodyPartsMovedUp}
		<section class="body-parts-section">
			{@render bodyPartsBlock()}
		</section>
	{/if}

	{#if isFemale && prefs.ownPeriod}
		<PeriodTracker periods={periodsData} {lang} mode="projection" />
	{/if}

	{#if prefs.sharedPeriods}
		{#each sharedPeriodsData as shared (shared.owner)}
			<PeriodTracker periods={shared.entries} {lang} readOnly ownerName={shared.owner} mode="projection" />
		{/each}
	{/if}

	<button class="dash-gear" onclick={openDashSettings}>
		<Settings2 size={14} />
		<span>{t.dash_customize}</span>
	</button>
</div>

<style>
	.stats-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Dashboard customize gear + panel */
	.dash-gear {
		align-self: flex-end;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		margin-top: 0.25rem;
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		border-radius: var(--radius-pill);
		transition: color var(--transition-fast, 120ms), background var(--transition-fast, 120ms);
	}
	.dash-gear:hover {
		color: var(--color-text-primary);
		background: color-mix(in oklab, var(--color-text-primary) 6%, transparent);
	}
	.dash-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	.dash-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(3px);
	}
	.dash-panel {
		position: relative;
		width: 100%;
		max-width: 360px;
		max-height: 85vh;
		overflow-y: auto;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg, 0.75rem);
		padding: 1.25rem;
		box-shadow: var(--shadow-lg);
	}
	.dash-panel h3 {
		margin: 0 0 0.75rem;
		font-size: 1.05rem;
	}
	.dash-toggles {
		display: flex;
		flex-direction: column;
	}
	.dash-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-border);
	}
	.dash-row:last-child { border-bottom: none; }
	.dash-row-label {
		font-size: 0.9rem;
		color: var(--color-text-primary);
	}
	.dash-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 1rem;
	}
	.dash-save {
		padding: 0.45rem 1.1rem;
		border: none;
		border-radius: var(--radius-pill, 1000px);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-weight: 600;
		cursor: pointer;
	}
	.dash-save:disabled { opacity: 0.6; cursor: not-allowed; }
	.dash-cancel {
		padding: 0.45rem 1.1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill, 1000px);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.lifetime-cards {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.6rem;
	}
	/* Segment-stat card: 2 of the 4 top-row tiles wide, laid out horizontally. */
	/* Segment-stat card: 2 of the 4 top-row tiles wide; the route map is the hero. */
	/* Segment-stat cards: two side by side, one stretched full-width, the route
	   map as the hero. Stack on narrow screens. */
	.segment-stat-row {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.6rem;
		/* The .stats-page flex gap is 1rem; pull the segment cards up so they sit
		   0.6rem below the overview stats they belong with. */
		margin-top: -0.4rem;
	}
	.seg-card {
		display: flex;
		align-items: stretch;
		min-height: 140px;
		border: none;
		border-radius: 14px;
		background: var(--color-surface);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
		padding: 0;
		text-align: left;
		font: inherit;
		color: inherit;
		cursor: pointer;
		transition: box-shadow 0.15s;
	}
	.seg-card:hover,
	.seg-card:focus-visible {
		box-shadow: var(--shadow-sm), 0 0 0 2px var(--blue);
		outline: none;
	}
	.seg-map {
		position: relative;
		flex: 0 0 clamp(150px, 38%, 320px);
		background: var(--color-bg-tertiary);
	}
	.seg-map-img,
	.seg-map-svg {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
	}
	.seg-route-casing {
		fill: none;
		stroke: var(--color-surface);
		stroke-width: 5;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.seg-route {
		fill: none;
		stroke: var(--blue);
		stroke-width: 3;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.seg-rank {
		position: absolute;
		top: 7px;
		left: 7px;
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
		padding: 0.12rem 0.45rem;
		border-radius: var(--radius-pill, 1000px);
		background: var(--color-bg-elevated);
		color: var(--color-text-secondary);
		font-size: 0.68rem;
		font-weight: 700;
		box-shadow: var(--shadow-sm);
	}
	.seg-rank.kom {
		background: #e3b341;
		color: #3b2f0b;
	}
	/* Activity glyph, top-right of a segment card's map (rank sits top-left). */
	.seg-activity-badge {
		position: absolute;
		top: 7px;
		right: 7px;
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-surface) 88%, transparent);
		backdrop-filter: blur(6px);
		color: var(--color-text-secondary);
		box-shadow: var(--shadow-sm);
	}
	/* Running / cycling filter for the segment picker modal. */
	.seg-pick-tabs {
		display: flex;
		gap: 0.25rem;
		align-self: center;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill, 1000px);
		padding: 0.2rem;
		margin: 0.75rem 0 0.4rem;
		flex-shrink: 0;
	}
	.seg-pick-tabs button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: none;
		background: none;
		padding: 0.35rem 0.8rem;
		border-radius: var(--radius-pill, 1000px);
		cursor: pointer;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		transition: background var(--transition-fast, 100ms);
	}
	.seg-pick-tabs button.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.seg-pick-empty {
		grid-column: 1 / -1;
		text-align: center;
		color: var(--color-text-secondary);
		padding: 1.5rem;
	}
	.seg-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.7rem 0.95rem;
	}
	.seg-name {
		min-width: 0;
		font-size: 0.95rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.seg-figures {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.seg-time {
		font-size: 1.75rem;
		font-weight: 700;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.seg-time.muted {
		color: var(--color-text-secondary);
	}
	.seg-pace {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.seg-delta {
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
		font-size: 0.8rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.seg-delta.improve { color: var(--green); }
	.seg-delta.worse { color: var(--red); }
	.seg-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.7rem;
	}
	.seg-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.74rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.seg-chip.kom {
		color: #b8860b;
		font-weight: 600;
	}
	.seg-chip-name {
		max-width: 16ch;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.seg-chip-sub { color: var(--color-text-tertiary); }
	.seg-card-empty {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.9rem 1rem;
		border-radius: 14px;
		background: var(--color-surface);
		box-shadow: var(--shadow-sm);
	}
	.seg-empty-icon {
		width: 2.5rem;
		height: 2.5rem;
		flex-shrink: 0;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--blue) 16%, transparent);
		color: var(--blue);
	}
	.seg-empty-text {
		margin: 0;
		font-size: 0.82rem;
		color: var(--color-text-secondary);
	}
	.seg-empty-text a { color: var(--blue); }
	.span-full { grid-column: 1 / -1; }
	/* Fastest card wrapper: the card-button plus a corner "view workout" link. */
	.seg-card-wrap {
		position: relative;
		display: flex;
	}
	.seg-card-wrap > .seg-card {
		flex: 1;
		min-width: 0;
	}
	.seg-open-link {
		position: absolute;
		top: 8px;
		right: 8px;
		z-index: 2;
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--color-surface);
		color: var(--color-text-secondary);
		box-shadow: var(--shadow-sm);
		transition: color var(--transition-fast, 100ms), background var(--transition-fast, 100ms);
	}
	.seg-open-link:hover {
		color: var(--blue);
		background: var(--color-bg-elevated);
	}
	.seg-map-blank {
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
		color: var(--blue);
		background: color-mix(in srgb, var(--blue) 10%, var(--color-bg-tertiary));
	}
	.seg-rank.dist {
		background: var(--blue);
		color: var(--color-text-on-primary, #fff);
	}
	@media (max-width: 700px) {
		.segment-stat-row { grid-template-columns: 1fr; }
	}
	/* Fastest-Nk distance editor */
	.fastest-editor {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		border-radius: var(--radius-lg, 0.75rem);
		background: var(--color-bg-primary, var(--color-surface));
		box-shadow: var(--shadow-lg, var(--shadow-md));
	}
	.fastest-editor h3 {
		margin: 0;
		font-size: 1rem;
	}
	/* Running / cycling board switch — preference is persisted to user settings. */
	.fastest-mode {
		display: flex;
		gap: 0.25rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill, 1000px);
		padding: 0.2rem;
	}
	.fastest-mode button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: none;
		background: none;
		padding: 0.4rem 0.9rem;
		border-radius: var(--radius-pill, 1000px);
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		transition: background var(--transition-fast, 100ms);
	}
	.fastest-mode button.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.fastest-km-unit {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		margin-left: 0.1rem;
	}
	.fastest-presets {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4rem;
	}
	.fastest-preset {
		padding: 0.3rem 0.7rem;
		border: 1.5px solid var(--color-border);
		border-radius: var(--radius-pill, 1000px);
		background: transparent;
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast, 100ms);
	}
	.fastest-preset:hover {
		border-color: var(--blue);
		color: var(--blue);
	}
	.fastest-preset.active {
		background: var(--blue);
		border-color: var(--blue);
		color: var(--color-text-on-primary, #fff);
	}
	/* Segment picker modal */
	.seg-modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: color-mix(in srgb, var(--nord0, #2e3440) 55%, transparent);
		backdrop-filter: blur(3px);
	}
	/* The segment picker can get tall — anchor it below the sticky header and let
	   it grow downward instead of centering (which lets it expand up behind the
	   header). Clearance = header top offset + height (3rem) + a small gap. */
	.seg-modal-overlay:has(.seg-modal) {
		--seg-modal-clear: calc(max(12px, env(safe-area-inset-top, 0px) + 4px) + 3rem + 0.75rem);
		align-items: flex-start;
		padding-top: var(--seg-modal-clear);
		/* Let the modal grow past the viewport and scroll the overlay instead of
		   constraining the card grid (which made cards overlap on short screens). */
		overflow-y: auto;
	}
	.seg-modal {
		display: flex;
		flex-direction: column;
		width: min(720px, 100%);
		/* Grows to fit all cards; the overlay scrolls when it exceeds the screen. */
		margin-bottom: 1rem;
		border-radius: var(--radius-lg, 0.75rem);
		background: var(--color-bg-primary, var(--color-surface));
		box-shadow: var(--shadow-lg, var(--shadow-md));
		overflow: hidden;
	}
	.seg-modal-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.9rem 1.1rem;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.seg-modal-head h3 {
		margin: 0;
		font-size: 1rem;
	}
	.seg-modal-sub {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
	.seg-modal-close {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: background var(--transition-fast, 100ms);
	}
	.seg-modal-close:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.seg-modal-grid {
		display: grid;
		/* min(220px, 100%) so a single card never forces horizontal overflow on a
		   phone narrower than 220px. */
		grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
		gap: 0.8rem;
		padding: 1rem 1.1rem 1.2rem;
		/* Each card keeps its natural height so the stats below the map never clip. */
		align-items: start;
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
	.card-hint-warning {
		color: var(--orange);
		opacity: 1;
		font-weight: 600;
	}
	.macro-empty-hint {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin-top: 0.35rem;
		line-height: 1.3;
	}
	.macro-card-empty .macro-rings {
		opacity: 0.45;
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
		color: var(--color-amber-text);
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
	.muscle-nutrition-layout .muscle-heatmap-block,
	.muscle-nutrition-layout .bp-in-mb {
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
		.muscle-nutrition-layout .muscle-heatmap-block,
		.muscle-nutrition-layout .bp-in-mb {
			grid-column: 1 / 4;
		}
		/* macro-horizontal: muscle balance off + body parts off → the 3 stat cards
		   sit on the top row and the macro split drops to its own full-width row */
		.muscle-nutrition-layout.macro-horizontal {
			grid-template-columns: 1fr 1fr 1fr;
			grid-template-rows: auto auto;
		}
		.muscle-nutrition-layout.macro-horizontal .macro-card {
			grid-column: 1 / -1;
			grid-row: 2;
			flex-direction: row !important;
			align-items: center !important;
		}
		.muscle-nutrition-layout.macro-horizontal .macro-card .macro-rings {
			flex-direction: row;
		}
		.muscle-nutrition-layout.macro-horizontal .macro-card .macro-header {
			text-align: left;
			margin-bottom: 0;
		}
	}
	/* diet off → only the muscle-balance block remains; let it span full width */
	.muscle-nutrition-layout.diet-off {
		display: block;
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
		color: var(--color-amber-text);
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

	.body-parts-section h2 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
	}
	.bp-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.6rem;
	}
	.bp-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.35rem;
		padding: 0.7rem 0.5rem 0.6rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		cursor: pointer;
		color: inherit;
		font: inherit;
		text-decoration: none;
		position: relative;
		overflow: hidden;
		isolation: isolate;
		transition: border-color var(--transition-normal), box-shadow var(--transition-normal), transform var(--transition-normal);
	}
	.bp-card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: var(--accent, var(--color-primary));
		opacity: 0.08;
		z-index: -1;
		pointer-events: none;
	}
	.bp-card:hover {
		border-color: var(--accent, var(--color-primary));
		box-shadow: var(--shadow-sm);
	}
	.bp-img-wrap {
		display: grid;
		place-items: center;
		width: 3.25rem;
		height: 3.25rem;
		flex-shrink: 0;
		border-radius: 50%;
		background: color-mix(in oklab, var(--accent, var(--color-primary)) 18%, transparent);
		color: var(--accent, var(--color-primary));
	}
	.bp-img {
		width: 2.4rem;
		height: 2.4rem;
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
	.bp-meta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		min-width: 0;
		width: 100%;
	}
	.bp-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-secondary);
	}
	.bp-value {
		font-size: 1rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
		letter-spacing: -0.01em;
	}
	.bp-value.paired {
		font-size: 0.78rem;
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: center;
		gap: 0.2rem;
	}
	.bp-value em {
		font-style: normal;
		font-weight: 600;
		font-size: 0.62rem;
		color: var(--color-text-tertiary);
		margin-right: 0.15rem;
		letter-spacing: 0.05em;
	}
	.bp-side {
		white-space: nowrap;
	}
	.bp-side-sep {
		color: var(--color-text-tertiary);
	}
	.bp-unit {
		margin-left: 0.2rem;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
	}
	@media (max-width: 420px) {
		.bp-grid { gap: 0.45rem; }
		.bp-card { padding: 0.55rem 0.35rem; }
		.bp-img-wrap { width: 2.6rem; height: 2.6rem; }
		.bp-img { width: 1.9rem; height: 1.9rem; }
		.bp-label { font-size: 0.58rem; }
		.bp-value { font-size: 0.88rem; }
		.bp-value.paired { font-size: 0.7rem; }
	}
	@media (min-width: 768px) {
		.bp-grid { gap: 0.85rem; }
		.bp-card {
			flex-direction: row;
			align-items: center;
			text-align: left;
			gap: 0.85rem;
			padding: 0.9rem 1rem;
		}
		.bp-img-wrap {
			width: 3.75rem;
			height: 3.75rem;
		}
		.bp-img {
			width: 2.75rem;
			height: 2.75rem;
		}
		.bp-meta {
			align-items: flex-start;
			text-align: left;
			gap: 0.25rem;
		}
		.bp-value.paired {
			justify-content: flex-start;
		}
		.bp-label {
			font-size: 0.68rem;
		}
		.bp-value {
			font-size: 1.15rem;
		}
	}
</style>
