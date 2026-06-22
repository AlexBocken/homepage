<script lang="ts">
	import { untrack } from 'svelte';
	import Route from '@lucide/svelte/icons/route';
	import Mountain from '@lucide/svelte/icons/mountain';
	import X from '@lucide/svelte/icons/x';
	import { m, type FitnessLang } from '$lib/js/fitnessI18n';
	import { haversine } from '$lib/fitness/gpsSeries.js';
	import { projectTrack, svgPath } from '$lib/fitness/trackSvg';
	import RangeSlider from '$lib/components/hikes/RangeSlider.svelte';
	import Toggle from '$lib/components/Toggle.svelte';

	interface GpsPoint {
		lat: number;
		lng: number;
		altitude?: number | null;
		timestamp: number;
	}

	let {
		track,
		exerciseIndex,
		sessionId,
		lang = 'en',
		oncreated,
		oncancel
	}: {
		track: GpsPoint[];
		exerciseIndex: number | null;
		sessionId: string;
		lang?: FitnessLang;
		oncreated?: (segment: { _id: string }) => void;
		oncancel?: () => void;
	} = $props();

	const t = $derived(m[lang]);
	const n = $derived(track.length);

	// Cumulative distance (km) per track point — drives the slider readout.
	const cumDist = $derived.by(() => {
		const c = new Array(track.length).fill(0);
		for (let i = 1; i < track.length; i++) c[i] = c[i - 1] + haversine(track[i - 1], track[i]);
		return c;
	});

	let low = $state(untrack(() => Math.round((track.length - 1) * 0.25)));
	let high = $state(untrack(() => Math.round((track.length - 1) * 0.75)));
	let name = $state('');
	let isPublic = $state(true);
	let saving = $state(false);
	let error = $state('');

	const selDistance = $derived(Math.max(0, cumDist[high] - cumDist[low]));
	const selGain = $derived.by(() => {
		let gain = 0;
		let prev: number | null = null;
		for (let i = low; i <= high; i++) {
			const a = track[i]?.altitude;
			if (a == null) continue;
			if (prev != null && a > prev) gain += a - prev;
			prev = a;
		}
		return Math.round(gain);
	});

	const W = 320;
	const H = 120;
	const xy = $derived(projectTrack(track, W, H, 8));
	const fullPath = $derived(svgPath(xy));
	const selPath = $derived(svgPath(xy.slice(low, high + 1)));

	async function save() {
		if (!name.trim() || saving || high <= low) return;
		saving = true;
		error = '';
		try {
			const res = await fetch('/api/fitness/segments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId,
					exerciseIndex,
					startIdx: low,
					endIdx: high,
					name: name.trim(),
					public: isPublic
				})
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Failed';
				return;
			}
			oncreated?.(data.segment);
		} catch {
			error = 'Failed';
		} finally {
			saving = false;
		}
	}
</script>

<div class="creator">
	<div class="head">
		<h3>{t.create_segment}</h3>
		<button class="close" onclick={() => oncancel?.()} aria-label={t.cancel}><X size={18} /></button>
	</div>

	<svg class="preview" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
		<path d={fullPath} class="full" />
		<path d={selPath} class="sel" />
		{#if xy[low]}<circle cx={xy[low].x} cy={xy[low].y} r="4" class="dot start" />{/if}
		{#if xy[high]}<circle cx={xy[high].x} cy={xy[high].y} r="4" class="dot end" />{/if}
	</svg>

	<RangeSlider
		label={t.select_section}
		min={0}
		max={n - 1}
		step={1}
		bind:low
		bind:high
		format={(v) => `${(cumDist[v] ?? 0).toFixed(2)} ${t.km}`}
	/>

	<div class="sel-stats">
		<span class="stat"><Route size={14} /> {selDistance.toFixed(2)} {t.km}</span>
		{#if selGain > 0}<span class="stat"><Mountain size={14} /> +{selGain} m</span>{/if}
	</div>

	<input
		class="name-input"
		type="text"
		bind:value={name}
		maxlength="100"
		placeholder={t.segment_name_placeholder}
		aria-label={t.segment_name}
	/>

	<div class="public-row">
		<Toggle bind:checked={isPublic} label={t.public_segment} />
	</div>

	{#if error}<p class="error">{error === 'Selected section is too short' ? t.segment_too_short : error}</p>{/if}

	<button class="save" onclick={save} disabled={saving || !name.trim() || high <= low}>
		{saving ? t.creating : t.save_segment}
	</button>
</div>

<style>
	.creator {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 1rem;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.head h3 {
		margin: 0;
		font-size: 0.95rem;
	}
	.close {
		display: flex;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-secondary);
		padding: 0.2rem;
	}
	.close:hover {
		color: var(--color-text-primary);
	}
	.preview {
		width: 100%;
		height: 120px;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md, 0.5rem);
		display: block;
	}
	.full {
		fill: none;
		stroke: var(--color-border);
		stroke-width: 3;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.sel {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 3.5;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.dot.start {
		fill: var(--green);
	}
	.dot.end {
		fill: var(--red);
	}
	.sel-stats {
		display: flex;
		gap: 1rem;
	}
	.stat {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.name-input {
		width: 100%;
		padding: 0.55rem 0.7rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		color: var(--color-text-primary);
		font-size: 0.9rem;
	}
	.name-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.public-row {
		display: flex;
	}
	.error {
		margin: 0;
		color: var(--red);
		font-size: 0.82rem;
	}
	.save {
		padding: 0.6rem 1rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: var(--radius-md, 0.5rem);
		font-weight: 600;
		cursor: pointer;
		transition: background var(--transition-normal, 200ms);
	}
	.save:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}
	.save:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
