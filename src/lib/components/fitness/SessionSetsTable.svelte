<script>
	import { getExerciseById, getExerciseMetrics, isTimedMetrics, METRIC_LABELS } from '$lib/data/exercises';
	import { formatSetDuration } from '$lib/fitness/segmentFormat';
	import { estimatedOneRepMax } from '$lib/fitness/strength';
	import { m } from '$lib/js/fitnessI18n';

	/**
	 * Read-only table of one exercise's logged sets: every metric but RPE, then
	 * RPE, then an estimated 1RM for weight × reps exercises.
	 *
	 * `formatTimed` shows a timed exercise's duration with its own unit ("45 s",
	 * "1:30") under a TIME header; without it the stored minutes are shown raw
	 * under MIN, which is what the public share page still does.
	 * @type {{ exerciseId: string, sets: any[], lang?: 'en' | 'de', formatTimed?: boolean }}
	 */
	let { exerciseId, sets, lang = 'en', formatTimed = true } = $props();

	const t = $derived(m[lang]);
	const metrics = $derived(getExerciseMetrics(getExerciseById(exerciseId)));
	const mainMetrics = $derived(metrics.filter((/** @type {string} */ mm) => mm !== 'rpe'));
	const showEst1rm = $derived(metrics.includes('weight') && metrics.includes('reps'));
	const timed = $derived(formatTimed && isTimedMetrics(metrics));
</script>

<table class="sets-table">
	<thead>
		<tr>
			<th>{t.set_header}</th>
			{#each mainMetrics as metric (metric)}
				<!-- A timed set's cell carries its own unit ("45 s" / "1:30"), so the
				     stored-minutes "MIN" header would contradict it. -->
				<th>{timed && metric === 'duration' ? t.time_header : METRIC_LABELS[metric]}</th>
			{/each}
			<th>RPE</th>
			{#if showEst1rm}
				<th>{t.est_1rm}</th>
			{/if}
		</tr>
	</thead>
	<tbody>
		{#each sets as set, i (i)}
			<tr>
				<td class="set-num">{i + 1}</td>
				{#each mainMetrics as metric (metric)}
					<td>{timed && metric === 'duration' ? formatSetDuration(set.duration) : set[metric] ?? '—'}</td>
				{/each}
				<td class="rpe">{set.rpe ?? '—'}</td>
				{#if showEst1rm}
					<td class="est1rm">{set.weight && set.reps ? estimatedOneRepMax(set.weight, set.reps) : '—'}</td>
				{/if}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.sets-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
	}
	.sets-table th {
		text-align: center;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		padding: 0.3rem 0.4rem;
		letter-spacing: 0.05em;
		font-weight: 600;
	}
	.sets-table td {
		text-align: center;
		padding: 0.35rem 0.4rem;
		border-top: 1px solid var(--color-border);
	}
	.set-num {
		font-weight: 700;
		color: var(--color-text-secondary);
	}
	.rpe {
		color: var(--orange);
	}
	.est1rm {
		color: var(--color-primary);
		font-weight: 600;
	}
</style>
