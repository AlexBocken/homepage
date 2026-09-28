<script>
	import Clock from '@lucide/svelte/icons/clock';
	import { createDarkMode } from '$lib/js/darkMode.svelte';
	import NotebookPen from '@lucide/svelte/icons/notebook-pen';
	import Weight from '@lucide/svelte/icons/weight';
	import Trophy from '@lucide/svelte/icons/trophy';
	import { m } from '$lib/js/fitnessI18n';
	import { getExerciseById } from '$lib/data/exercises';
	import { prTypeLongLabel, prValueLabel } from '$lib/fitness/prLabel';
	import { formatDurationMin } from '$lib/fitness/segmentFormat';
	import ExerciseName from '$lib/components/fitness/ExerciseName.svelte';
	import WeatherPill from '$lib/components/fitness/WeatherPill.svelte';
	import KcalEstimatePill from '$lib/components/fitness/KcalEstimatePill.svelte';
	import SessionSetsTable from '$lib/components/fitness/SessionSetsTable.svelte';
	import GpsTrackPanel from '$lib/components/fitness/GpsTrackPanel.svelte';

	/**
	 * Read-only render of a workout session — the same body the history detail
	 * page shows, minus any editing. Used by the public share page.
	 *
	 * Unlike the history page it still shows a timed set's stored minutes raw, and
	 * a ride's best efforts as pace rather than speed.
	 * @type {{ session: any, lang?: 'en' | 'de', showPrs?: boolean }}
	 */
	let { session, lang = 'en', showPrs = true } = $props();

	const t = $derived(m[lang]);
	const kcalResult = $derived(session?.kcalEstimate ?? null);

	const darkMode = createDarkMode();
	const dark = $derived(darkMode.dark);
</script>

<div class="run-detail">
	<div class="stats-row">
		{#if session.duration}
			<div class="stat-pill"><Clock size={14} /><span>{formatDurationMin(session.duration)}</span></div>
		{/if}
		{#if session.totalVolume}
			<div class="stat-pill"><Weight size={14} /><span>{Math.round(session.totalVolume).toLocaleString()} kg</span></div>
		{/if}
		{#if kcalResult}
			<KcalEstimatePill estimate={kcalResult} />
		{/if}
		{#if showPrs && session.prs?.length > 0}
			<div class="stat-pill pr"><Trophy size={14} /><span>{session.prs.length} PR{session.prs.length !== 1 ? 's' : ''}</span></div>
		{/if}
		<WeatherPill weather={session.weather} />
	</div>

	{#each session.exercises as ex, exIdx (ex.exerciseId + '-' + exIdx)}
		<div class="exercise-block">
			<h3 class="exercise-title"><ExerciseName exerciseId={ex.exerciseId} /></h3>
			<SessionSetsTable exerciseId={ex.exerciseId} sets={ex.sets} {lang} formatTimed={false} />

			{#if ex.gpsTrack?.length > 0}
				<GpsTrackPanel
					track={ex.gpsTrack}
					totalDistance={ex.totalDistance}
					mapId={`be-map-${exIdx}`}
					{dark}
					{lang}
					bestEfforts={session.bestEfforts}
				/>
			{/if}
		</div>
	{/each}

	{#if showPrs && session.prs?.length > 0}
		<div class="prs-section">
			<h2>{t.personal_records}</h2>
			<div class="pr-list">
				{#each session.prs as pr (pr.exerciseId + pr.type)}
					{@const exercise = getExerciseById(pr.exerciseId, lang)}
					<div class="pr-item">
						<Trophy size={14} class="pr-icon" />
						<span class="pr-exercise">{exercise?.localName ?? pr.exerciseId}</span>
						<span class="pr-type">
							{prTypeLongLabel(pr)}
						</span>
						<span class="pr-value">
							{prValueLabel(pr)}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if session.notes}
		<div class="notes-section">
			<h2><NotebookPen size={15} /> {t.notes}</h2>
			<p class="note-body">{session.notes}</p>
		</div>
	{/if}
</div>

<style>
	.run-detail {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.stats-row {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.stat-pill {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.7rem;
		background: var(--color-surface);
		border-radius: 20px;
		box-shadow: var(--shadow-sm);
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.stat-pill.pr {
		color: var(--color-amber-text);
		border-color: var(--yellow);
		background: color-mix(in srgb, var(--yellow) 10%, transparent);
	}
	.exercise-block {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
	.exercise-title { margin: 0 0 0.5rem; font-size: 0.95rem; }
	.prs-section {
		background: color-mix(in srgb, var(--yellow) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--yellow) 30%, transparent);
		border-radius: 12px;
		padding: 1rem;
	}
	.prs-section h2 { margin: 0 0 0.5rem; font-size: 1rem; color: var(--color-amber-text); }
	.pr-list { display: flex; flex-direction: column; gap: 0.4rem; }
	.pr-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
	.pr-item :global(.pr-icon) { color: var(--color-amber-text); flex-shrink: 0; }
	.pr-exercise { font-weight: 600; }
	.pr-type { color: var(--color-text-secondary); font-size: 0.75rem; }
	.pr-value { margin-left: auto; font-weight: 700; color: var(--color-amber-text); }
	.notes-section {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
	.notes-section h2 { display: flex; align-items: center; gap: 0.4rem; margin: 0 0 0.5rem; font-size: 1rem; }
	/* Same margin-ruled note as the strength detail view — see its .note-body. */
	.notes-section .note-body {
		margin: 0;
		padding: 0.55rem 0.8rem;
		background: var(--color-bg-tertiary);
		border-left: 3px solid var(--color-primary);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		font-size: 0.9rem;
		line-height: 1.65;
		color: var(--color-text-primary);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
