<script>
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import UserHeader from '$lib/components/UserHeader.svelte';
	import LanguageSelector from '$lib/components/LanguageSelector.svelte';
	import { BarChart3, Clock, Dumbbell, ListChecks, Ruler } from 'lucide-svelte';
	import { getWorkout } from '$lib/js/workout.svelte';
	import { getWorkoutSync } from '$lib/js/workoutSync.svelte';
	import WorkoutFab from '$lib/components/fitness/WorkoutFab.svelte';
	import { detectFitnessLang, fitnessSlugs, fitnessLabels } from '$lib/js/fitnessI18n';
	import { flushQueue } from '$lib/offline/fitnessQueue';

	let { data, children } = $props();
	let user = $derived(data.session?.user);

	const workout = getWorkout();
	const sync = getWorkoutSync();

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const s = $derived(fitnessSlugs(lang));
	const labels = $derived(fitnessLabels(lang));

	/** Pre-cache all fitness page shells so they work offline */
	function precacheFitnessShells() {
		if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
		const slugs = [
			'workout', 'training', 'workout/active', 'training/aktiv',
			'exercises', 'uebungen', 'stats', 'statistik',
			'history', 'verlauf', 'measure', 'messen'
		];
		const urls = slugs.map((s) => `/fitness/${s}`);
		navigator.serviceWorker.controller.postMessage({ type: 'CACHE_PAGES', urls });
	}

	function onOnline() {
		flushQueue();
	}

	onMount(async () => {
		workout.restore();
		workout.onChange(() => sync.notifyChange());
		await sync.init();
		flushQueue();
		precacheFitnessShells();
		window.addEventListener('online', onOnline);
	});

	onDestroy(() => {
		sync.destroy();
		if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
	});

	/** @param {string} path */
	function isActive(path) {
		const currentPath = $page.url.pathname;
		return currentPath.startsWith(path);
	}

	const activePath = $derived(`/fitness/${s.workout}/${s.active}`);
	const isOnActivePage = $derived($page.url.pathname === activePath);

	/** @param {number} secs */
	function formatElapsed(secs) {
		const m = Math.floor(secs / 60);
		const sec = secs % 60;
		return `${m}:${sec.toString().padStart(2, '0')}`;
	}
</script>

<Header>
	{#snippet links()}
		<ul class="site_header">
			<li><a href="/fitness/{s.stats}" class:active={isActive(`/fitness/${s.stats}`)}><BarChart3 size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.stats}</span></a></li>
			<li style="--active-fill: var(--nord13)"><a href="/fitness/{s.history}" class:active={isActive(`/fitness/${s.history}`)}><Clock size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.history}</span></a></li>
			<li style="--active-fill: var(--nord8)"><a href="/fitness/{s.workout}" class:active={isActive(`/fitness/${s.workout}`)}><Dumbbell size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.workout}</span></a></li>
			<li style="--active-fill: var(--nord14)"><a href="/fitness/{s.exercises}" class:active={isActive(`/fitness/${s.exercises}`)}><ListChecks size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.exercises}</span></a></li>
			<li style="--active-fill: var(--nord12)"><a href="/fitness/{s.measure}" class:active={isActive(`/fitness/${s.measure}`)}><Ruler size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.measure}</span></a></li>
		</ul>
	{/snippet}

	{#snippet language_selector_mobile()}
		<LanguageSelector lang={lang} />
	{/snippet}

	{#snippet language_selector_desktop()}
		<LanguageSelector lang={lang} />
	{/snippet}

	{#snippet right_side()}
		<UserHeader {user} />
	{/snippet}

	<div class="fitness-content">
		{@render children()}
	</div>
</Header>

{#if workout.active && !isOnActivePage}
	<WorkoutFab
		href={activePath}
		elapsed={formatElapsed(workout.elapsedSeconds)}
		paused={workout.paused}
		syncStatus={sync.status}
		onPauseToggle={() => workout.paused ? workout.resumeTimer() : workout.pauseTimer()}
		restSeconds={workout.restTimerSeconds}
		restTotal={workout.restTimerTotal}
		onRestAdjust={(delta) => workout.adjustRestTimer(delta)}
		onRestSkip={() => workout.cancelRestTimer()}
	/>
{/if}

<style>
	.fitness-content {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--space-md, 1rem);
	}
</style>
