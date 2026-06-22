<script lang="ts">
	import Route from '@lucide/svelte/icons/route';
	import Mountain from '@lucide/svelte/icons/mountain';
	import Crown from '@lucide/svelte/icons/crown';
	import Users from '@lucide/svelte/icons/users';
	import { resolve } from '$app/paths';
	import { m, type FitnessLang } from '$lib/js/fitnessI18n';
	import { projectTrack, svgPath } from '$lib/fitness/trackSvg';
	import { formatElapsed } from '$lib/fitness/segmentFormat';

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

	let { segment, lang = 'en' }: { segment: SegmentSummary; lang?: FitnessLang } = $props();

	const t = $derived(m[lang]);
	const W = 220;
	const H = 90;
	const path = $derived(svgPath(projectTrack(segment.points, W, H, 8)));

	// Prefer the server-rendered map (real tiles), fall back to the SVG polyline.
	let mapImgFailed = $state(false);
</script>

<a class="segment-card" href={resolve('/fitness/segments/[id]', { id: segment._id })}>
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
</a>

<style>
	.segment-card {
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		border-radius: var(--radius-card, 16px);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
		text-decoration: none;
		color: inherit;
		transition: scale var(--transition-normal, 200ms), box-shadow var(--transition-normal, 200ms);
	}
	.segment-card:hover {
		scale: 1.02;
		box-shadow: var(--shadow-hover, var(--shadow-md));
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
		color: var(--nord13);
	}
	.time.mine {
		color: var(--color-primary);
	}
</style>
