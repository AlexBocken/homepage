<script lang="ts">
	import Trophy from '@lucide/svelte/icons/trophy';
	import Crown from '@lucide/svelte/icons/crown';
	import Flag from '@lucide/svelte/icons/flag';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { resolve } from '$app/paths';
	import { m, fitnessSlugs, type FitnessLang } from '$lib/js/fitnessI18n';
	import { formatElapsed, formatDelta } from '$lib/fitness/segmentFormat';

	interface RunEffort {
		effortId: string;
		segmentId: string;
		segmentName: string;
		segmentDistance: number;
		elapsedSeconds: number;
		startIdx: number;
		endIdx: number;
		exerciseIndex: number | null;
		isBest: boolean;
		myBest: number;
		komTime: number | null;
		rank: number | null;
		totalAthletes: number | null;
	}

	let {
		efforts,
		lang = 'en',
		onhighlight
	}: {
		efforts: RunEffort[];
		lang?: FitnessLang;
		onhighlight?: (e: { startIdx: number; endIdx: number; exerciseIndex: number | null } | null) => void;
	} = $props();

	const t = $derived(m[lang]);
</script>

{#if efforts.length > 0}
	<section class="segments-on-run">
		<h2><Flag size={16} /> {t.segments_on_run}</h2>
		<ul class="effort-list">
			{#each efforts as e (e.effortId)}
				<li
					class="effort"
					onmouseenter={() => onhighlight?.({ startIdx: e.startIdx, endIdx: e.endIdx, exerciseIndex: e.exerciseIndex })}
					onmouseleave={() => onhighlight?.(null)}
				>
					<a class="seg-link" href={resolve('/fitness/[segments=fitnessSegments]/[id]', { segments: fitnessSlugs(lang).segments, id: e.segmentId })}>
						<div class="left">
							<span class="seg-name">{e.segmentName}</span>
							<span class="seg-dist">{e.segmentDistance.toFixed(2)} {t.km}</span>
						</div>
						<div class="middle">
							<span class="elapsed">{formatElapsed(e.elapsedSeconds)}</span>
							<div class="badges">
								{#if e.rank === 1}
									<span class="badge kom"><Crown size={12} /> KOM</span>
								{:else if e.isBest}
									<span class="badge pr"><Trophy size={12} /> {t.segment_pr}</span>
								{/if}
							</div>
						</div>
						<div class="right">
							{#if e.rank != null && e.totalAthletes != null}
								<span class="rank">{e.rank}/{e.totalAthletes}</span>
							{/if}
							{#if !e.isBest}
								<span class="delta slow">{formatDelta(e.elapsedSeconds - e.myBest)}</span>
							{:else if e.komTime != null && e.elapsedSeconds > e.komTime}
								<span class="delta slow">{formatDelta(e.elapsedSeconds - e.komTime)}</span>
							{/if}
							<ChevronRight size={16} class="chev" />
						</div>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.segments-on-run {
		background: var(--color-surface);
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0 0 0.6rem;
		font-size: 1rem;
	}
	.effort-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.seg-link {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0.6rem;
		border-radius: var(--radius-md, 0.5rem);
		background: var(--color-bg-tertiary);
		text-decoration: none;
		color: inherit;
		transition: background var(--transition-fast, 100ms);
	}
	.effort:hover .seg-link {
		background: var(--color-bg-elevated);
	}
	.left {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.seg-name {
		font-weight: 600;
		font-size: 0.88rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.seg-dist {
		font-size: 0.72rem;
		color: var(--color-text-secondary);
	}
	.middle {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.15rem;
	}
	.elapsed {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		font-size: 0.95rem;
	}
	.badges {
		display: flex;
		gap: 0.3rem;
	}
	.badge {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.65rem;
		font-weight: 700;
		padding: 0.1rem 0.35rem;
		border-radius: 1000px;
	}
	.badge.kom {
		color: var(--nord13);
		background: color-mix(in srgb, var(--nord13) 15%, transparent);
	}
	.badge.pr {
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 15%, transparent);
	}
	.right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.rank {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.delta {
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
	}
	.delta.slow {
		color: var(--nord12);
	}
	.right :global(.chev) {
		color: var(--color-text-secondary);
		flex-shrink: 0;
	}
</style>
