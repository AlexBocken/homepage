<script>
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { formatElapsed } from '$lib/fitness/segmentFormat';
	import { onMount, onDestroy } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import UserHeader from '$lib/components/UserHeader.svelte';
	import LanguageSelector from '$lib/components/LanguageSelector.svelte';
	import Clock from '@lucide/svelte/icons/clock';
	import Dumbbell from '@lucide/svelte/icons/dumbbell';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import Flag from '@lucide/svelte/icons/flag';
	import { getWorkout } from '$lib/js/workout.svelte';
	import { getWorkoutSync } from '$lib/js/workoutSync.svelte';
	import WorkoutFab from '$lib/components/fitness/WorkoutFab.svelte';
	import { detectFitnessLang, fitnessSlugs, fitnessLabels, m } from '$lib/js/fitnessI18n';
	import { getGpsTracker } from '$lib/js/gps.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import { flushQueue } from '$lib/offline/fitnessQueue';
	import { fitnessShellPages } from '$lib/offline/fitnessShells';
	import { precacheShells } from '$lib/offline/precacheShells';

	let { data, children } = $props();
	let user = $derived(data.session?.user);

	const workout = getWorkout();
	const sync = getWorkoutSync();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const s = $derived(fitnessSlugs(lang));
	const labels = $derived(fitnessLabels(lang));

	function onOnline() {
		flushQueue();
		// Refresh the offline shells with the now-reachable server data.
		precacheShells(fitnessShellPages);
	}

	/**
	 * A native GPS session with no workout to belong to — local state was cleared, or the
	 * workout was ended from another device while this phone kept recording. Native holds
	 * the route on disk, so offer it back rather than leave the service running unseen.
	 */
	async function adoptOrphanGpsSession() {
		if (workout.active) return;
		const gps = getGpsTracker();
		const st = gps.nativeState();
		if (!st || st.prestart || !(st.tracking || st.recoverable)) return;
		if (st.pointCount < 2) {
			gps.discardNative();
			return;
		}

		const t = m[lang];
		const message = t.gps_orphan_message.replace('{km}', st.totalDistanceKm.toFixed(2));
		let keep = await confirm(message, {
			title: t.gps_orphan_title,
			confirmText: t.gps_orphan_recover,
			cancelText: t.gps_orphan_discard,
		});
		// Dismissing that dialog reads as "discard"; never delete a route on a stray tap.
		if (!keep) {
			keep = !await confirm(t.gps_orphan_discard_confirm, {
				title: t.gps_orphan_title,
				confirmText: t.gps_orphan_discard,
				cancelText: t.gps_orphan_recover,
				destructive: true,
			});
		}

		if (!keep) {
			gps.discardNative();
			return;
		}
		// A workout may have arrived from another device while the dialog was open;
		// the route then simply belongs to that one.
		if (!workout.active) {
			const elapsed = Math.max(0, Math.floor((Date.now() - st.startTimeMs) / 1000));
			workout.startGpsWorkout('running', elapsed);
			if (!st.paused) workout.resumeTimer();
		}
		gps.attach();
		await goto(resolve('/fitness/[workout=fitnessWorkout]/[active=fitnessActive]', { workout: s.workout, active: s.active }));
	}

	onMount(async () => {
		workout.restore();
		workout.onChange(() => sync.notifyChange());
		await sync.init();
		adoptOrphanGpsSession();
		flushQueue();
		precacheShells(fitnessShellPages);
		window.addEventListener('online', onOnline);
	});

	onDestroy(() => {
		sync.destroy();
		if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
	});

	/** @param {string} path */
	function isActive(path) {
		const currentPath = page.url.pathname;
		return currentPath.startsWith(path);
	}

	const activePath = $derived(`/fitness/${s.workout}/${s.active}`);
	const isOnActivePage = $derived(page.url.pathname === activePath);
	const isNutritionPage = $derived(
		page.url.pathname.startsWith(`/fitness/${s.nutrition}`) &&
		!page.url.pathname.startsWith(`/fitness/${s.nutrition}/food`) &&
		!page.url.pathname.startsWith(`/fitness/${s.nutrition}/meals`)
	);
	const isMeasureIndex = $derived(
		/^\/fitness\/(check-in|erfassung)\/?$/.test(page.url.pathname)
	);
	const isExercisesIndex = $derived(
		/^\/fitness\/(exercises|uebungen)\/?$/.test(page.url.pathname)
	);
</script>

<Header>
	{#snippet links()}
		<ul class="site_header">
			<li style="--active-fill: var(--color-amber-text)"><a href={resolve('/fitness/[stats=fitnessStats]', { stats: s.stats })} class:active={isActive(`/fitness/${s.stats}`)}><svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18" /><path class="hl" d="M18 17V9M13 17V5M8 17v-3" /></svg><span class="nav-label">{labels.stats}</span></a></li>
			<li style="--active-fill: var(--red)"><a href={resolve('/fitness/[segments=fitnessSegments]', { segments: s.segments })} class:active={isActive(`/fitness/${s.segments}`)}><Flag size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.segments}</span></a></li>
			<li style="--active-fill: var(--blue)"><a href={resolve('/fitness/[history=fitnessHistory]', { history: s.history })} class:active={isActive(`/fitness/${s.history}`)}><Clock size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.history}</span></a></li>
			<li style="--active-fill: var(--nord8)"><a href={resolve('/fitness/[workout=fitnessWorkout]', { workout: s.workout })} class:active={isActive(`/fitness/${s.workout}`)}><Dumbbell size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.workout}</span></a></li>
			<li style="--active-fill: var(--green)"><a href={resolve('/fitness/[exercises=fitnessExercises]', { exercises: s.exercises })} class:active={isActive(`/fitness/${s.exercises}`)}><svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 17 2 2 4-4" /><path d="m3 7 2 2 4-4" /><path class="hl" d="M13 6h8M13 12h8M13 18h8" /></svg><span class="nav-label">{labels.exercises}</span></a></li>
			<li style="--active-fill: var(--orange)"><a href={resolve('/fitness/[checkin=fitnessCheckIn]', { checkin: s.measure })} class:active={isActive(`/fitness/${s.measure}`)}><NotebookPen size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.measure}</span></a></li>
			<li style="--active-fill: var(--purple)"><a href={resolve('/fitness/[nutrition=fitnessNutrition]', { nutrition: s.nutrition })} class:active={isActive(`/fitness/${s.nutrition}`)}><UtensilsCrossed size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">{labels.nutrition}</span></a></li>
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

	<div class="fitness-content" style:--fitness-max-width={isNutritionPage || isMeasureIndex || isExercisesIndex || isOnActivePage ? '1400px' : null}>
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
		onRestAdjust={(/** @type {number} */ delta) => workout.adjustRestTimer(delta)}
		onRestSkip={() => workout.cancelRestTimer()}
	/>
{/if}

<style>
	/* Seven links with labels this long outgrow the pill well before the header's
	   own 800px label breakpoint, so drop to icons only earlier here. */
	@media screen and (max-width: 900px) {
		.site_header .nav-label {
			display: none;
		}
		.site_header li > a {
			padding: 0.4rem;
		}
	}

	.fitness-content {
		max-width: var(--fitness-max-width, 900px);
		margin: 0 auto;
		padding: var(--space-md, 1rem);
	}
	.fitness-content:has(> :global([data-fitness-fullbleed])) {
		max-width: none;
		padding: 0;
	}
</style>
