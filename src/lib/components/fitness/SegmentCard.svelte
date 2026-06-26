<script lang="ts">
	import Route from '@lucide/svelte/icons/route';
	import Mountain from '@lucide/svelte/icons/mountain';
	import Crown from '@lucide/svelte/icons/crown';
	import Users from '@lucide/svelte/icons/users';
	import { resolve } from '$app/paths';
	import { m, fitnessSlugs, type FitnessLang } from '$lib/js/fitnessI18n';
	import { projectTrack, svgPath } from '$lib/fitness/trackSvg';
	import { formatElapsed } from '$lib/fitness/segmentFormat';
	import ActivityIcon from '$lib/components/fitness/ActivityIcon.svelte';

	interface SegmentSummary {
		_id: string;
		name: string;
		activityType: string;
		distance: number;
		elevationGain: number;
		points: number[][];
		athleteCount: number;
		myBest: number | null;
		komTime: number | null;
	}

	// `onselect` turns the card into a selectable button (used by the stats-page
	// segment picker) instead of a link to the segment detail page.
	let {
		segment,
		lang = 'en',
		onselect,
		selected = false
	}: {
		segment: SegmentSummary;
		lang?: FitnessLang;
		onselect?: (id: string) => void;
		selected?: boolean;
	} = $props();

	const t = $derived(m[lang]);
	const W = 220;
	const H = 90;
	const path = $derived(svgPath(projectTrack(segment.points, W, H, 8)));

	// Prefer the server-rendered map (real tiles), fall back to the SVG polyline.
	let mapImgFailed = $state(false);
</script>

{#snippet inner()}
	<span class="activity-badge" title={segment.activityType}>
		<ActivityIcon activity={segment.activityType} size={13} />
	</span>
	{#if !mapImgFailed}
		<img
			class="mini-map map-img"
			src={`/api/fitness/segments/${segment._id}/map.webp`}
			alt=""
			loading="lazy"
			decoding="async"
			onerror={() => (mapImgFailed = true)}
		/>
	{:else}
		<svg class="mini-map" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
			<path d={path} class="casing" />
			<path d={path} class="route" />
		</svg>
	{/if}
	<div class="body">
		<h3 class="name">{segment.name}</h3>
		<div class="stats">
			<span class="stat"><Route size={13} /> {segment.distance.toFixed(2)} {t.km}</span>
			{#if segment.elevationGain > 0}
				<span class="stat"><Mountain size={13} /> +{segment.elevationGain} m</span>
			{/if}
			<span class="stat"><Users size={13} /> {segment.athleteCount}</span>
		</div>
		<div class="times">
			{#if segment.komTime != null}
				<span class="time kom"><Crown size={13} /> {formatElapsed(segment.komTime)}</span>
			{/if}
			{#if segment.myBest != null}
				<span class="time mine">{t.your_best}: {formatElapsed(segment.myBest)}</span>
			{/if}
		</div>
	</div>
{/snippet}

{#if onselect}
	<button type="button" class="segment-card" class:selected onclick={() => onselect?.(segment._id)}>
		{@render inner()}
	</button>
{:else}
	<a class="segment-card" href={resolve('/fitness/[segments=fitnessSegments]/[id]', { segments: fitnessSlugs(lang).segments, id: segment._id })}>
		{@render inner()}
	</a>
{/if}

<style>
	.segment-card {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		border: none;
		border-radius: var(--radius-card, 16px);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
		text-decoration: none;
		text-align: left;
		color: inherit;
		font: inherit;
		width: 100%;
		padding: 0;
		cursor: pointer;
		transition: scale var(--transition-normal, 200ms), box-shadow var(--transition-normal, 200ms);
	}
	.segment-card:hover {
		scale: 1.02;
		box-shadow: var(--shadow-hover, var(--shadow-md));
	}
	.segment-card.selected {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.activity-badge {
		position: absolute;
		top: 8px;
		left: 8px;
		z-index: 1;
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--color-surface) 88%, transparent);
		backdrop-filter: blur(6px);
		color: var(--color-text-secondary);
		box-shadow: var(--shadow-sm);
	}
	.mini-map {
		width: 100%;
		height: 140px;
		background: var(--color-bg-tertiary);
		display: block;
	}
	.map-img {
		object-fit: cover;
	}
	.casing {
		fill: none;
		stroke: var(--color-surface);
		stroke-width: 5;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.route {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 2.5;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.body {
		padding: 0.6rem 0.75rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.name {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
	}
	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.stat {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
	}
	.times {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	.time {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	.time.kom {
		color: var(--color-amber-text);
	}
	.time.mine {
		color: var(--color-primary);
	}
</style>
