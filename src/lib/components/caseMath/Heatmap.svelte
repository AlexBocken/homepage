<script lang="ts">
	import type { DaySummary } from '$lib/server/caseMath';
	import { shiftDay } from '$lib/js/localDate';
	import { weekOf } from '$lib/js/caseMath/adaptive';

	let { days, today, weeks = 18 }: { days: DaySummary[]; today: string; weeks?: number } = $props();

	const byDate = $derived(new Map(days.map((d) => [d.date, d])));
	const start = $derived(shiftDay(weekOf(today), -7 * (weeks - 1)));
	const columns = $derived(
		Array.from({ length: weeks }, (_, w) =>
			Array.from({ length: 7 }, (_, d) => {
				const date = shiftDay(start, w * 7 + d);
				return { date, day: byDate.get(date), future: date > today };
			})
		)
	);

	/** 0–4 by questions answered that day. */
	function level(day: DaySummary | undefined) {
		if (!day) return 0;
		if (day.count >= 40) return 4;
		if (day.count >= 20) return 3;
		if (day.count >= 10) return 2;
		return 1;
	}

	function title(date: string, day: DaySummary | undefined) {
		if (!day) return `${date}: nothing`;
		return `${date}: ${day.correct}/${day.count} right${day.daily ? ' · daily set done' : ''}`;
	}
</script>

<div class="heatmap" role="img" aria-label="Practice over the last {weeks} weeks">
	{#each columns as column (column[0].date)}
		<div class="week">
			{#each column as cell (cell.date)}
				<span
					class="cell l{level(cell.day)}"
					class:daily={cell.day?.daily}
					class:future={cell.future}
					class:today={cell.date === today}
					title={title(cell.date, cell.day)}
				></span>
			{/each}
		</div>
	{/each}
</div>

<style>
	.heatmap {
		display: flex;
		gap: 3px;
		overflow-x: auto;
	}
	.week {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.cell {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		background: var(--color-bg-tertiary);
	}
	.cell.l1 {
		background: color-mix(in srgb, var(--green) 30%, var(--color-bg-tertiary));
	}
	.cell.l2 {
		background: color-mix(in srgb, var(--green) 55%, var(--color-bg-tertiary));
	}
	.cell.l3 {
		background: color-mix(in srgb, var(--green) 80%, var(--color-bg-tertiary));
	}
	.cell.l4 {
		background: var(--green);
	}
	.cell.daily {
		box-shadow: inset 0 0 0 1.5px var(--color-text-secondary);
	}
	.cell.today {
		outline: 1.5px solid var(--color-primary);
		outline-offset: 1px;
	}
	.cell.future {
		visibility: hidden;
	}
</style>
