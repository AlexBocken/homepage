<script>
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import UserHeader from '$lib/components/UserHeader.svelte';
	import { BarChart3, Clock, Dumbbell, ListChecks, Ruler } from 'lucide-svelte';
	import { getWorkout } from '$lib/js/workout.svelte';
	import { getWorkoutSync } from '$lib/js/workoutSync.svelte';
	import WorkoutFab from '$lib/components/fitness/WorkoutFab.svelte';

	let { data, children } = $props();
	let user = $derived(data.session?.user);

	const workout = getWorkout();
	const sync = getWorkoutSync();

	onMount(async () => {
		workout.restore();
		workout.onChange(() => sync.notifyChange());
		await sync.init();
	});

	onDestroy(() => {
		sync.destroy();
	});

	/** @param {string} path */
	function isActive(path) {
		const currentPath = $page.url.pathname;
		return currentPath.startsWith(path);
	}

	const isOnActivePage = $derived($page.url.pathname === '/fitness/workout/active');

	/** @param {number} secs */
	function formatElapsed(secs) {
		const m = Math.floor(secs / 60);
		const s = secs % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}
</script>

<Header>
	{#snippet links()}
		<ul class="site_header">
			<li><a href="/fitness/stats" class:active={isActive('/fitness/stats')}><BarChart3 size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">Stats</span></a></li>
			<li style="--active-fill: var(--nord13)"><a href="/fitness/history" class:active={isActive('/fitness/history')}><Clock size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">History</span></a></li>
			<li style="--active-fill: var(--nord8)"><a href="/fitness/workout" class:active={isActive('/fitness/workout')}><Dumbbell size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">Workout</span></a></li>
			<li style="--active-fill: var(--nord14)"><a href="/fitness/exercises" class:active={isActive('/fitness/exercises')}><ListChecks size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">Exercises</span></a></li>
			<li style="--active-fill: var(--nord12)"><a href="/fitness/measure" class:active={isActive('/fitness/measure')}><Ruler size={16} strokeWidth={1.5} class="nav-icon" /><span class="nav-label">Measure</span></a></li>
		</ul>
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
		href="/fitness/workout/active"
		elapsed={formatElapsed(workout.elapsedSeconds)}
		paused={workout.paused}
	/>
{/if}

<style>
	.fitness-content {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--space-md, 1rem);
	}
</style>
