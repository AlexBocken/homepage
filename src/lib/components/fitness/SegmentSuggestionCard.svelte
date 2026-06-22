<script lang="ts">
	import Route from '@lucide/svelte/icons/route';
	import Repeat from '@lucide/svelte/icons/repeat';
	import X from '@lucide/svelte/icons/x';
	import { m, type FitnessLang } from '$lib/js/fitnessI18n';
	import { createTrackHover } from '$lib/stores/trackHover.svelte';
	import { attachTrackMap } from '$lib/fitness/gpsTrackHover.svelte';

	interface Suggestion {
		routeHash: string;
		sessionId: string;
		exerciseIndex: number | null;
		startIdx: number;
		endIdx: number;
		points: number[][];
		distance: number;
		seenCount: number;
	}

	let {
		suggestion,
		lang = 'en',
		onadded,
		ondismiss
	}: {
		suggestion: Suggestion;
		lang?: FitnessLang;
		onadded?: () => void;
		ondismiss?: () => void;
	} = $props();

	const t = $derived(m[lang]);
	const mapTrack = $derived(suggestion.points.map((p) => ({ lat: p[0], lng: p[1], timestamp: 0 })));
	const hover = createTrackHover();

	let name = $state('');
	let adding = $state(false);
	let error = $state('');

	async function dismiss() {
		// Persist the dismissal (best-effort) so this corridor won't resurface.
		fetch('/api/fitness/segments/suggestions/dismiss', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ routeHash: suggestion.routeHash })
		}).catch(() => {});
		ondismiss?.();
	}

	async function add() {
		if (!name.trim() || adding) return;
		adding = true;
		error = '';
		try {
			const res = await fetch('/api/fitness/segments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId: suggestion.sessionId,
					exerciseIndex: suggestion.exerciseIndex,
					startIdx: suggestion.startIdx,
					endIdx: suggestion.endIdx,
					name: name.trim()
				})
			});
			const d = await res.json();
			if (!res.ok) {
				error = d.error ?? 'Failed';
				return;
			}
			onadded?.();
		} catch {
			error = 'Failed';
		} finally {
			adding = false;
		}
	}
</script>

<div class="suggestion">
	<button class="dismiss" onclick={dismiss} aria-label={t.dismiss}><X size={15} /></button>
	<div class="mini-map" {@attach attachTrackMap(mapTrack, hover, { interactive: false })}></div>
	<div class="body">
		<div class="stats">
			<span class="stat"><Route size={13} /> {suggestion.distance.toFixed(2)} {t.km}</span>
			<span class="stat"><Repeat size={13} /> {t.seen_in} {suggestion.seenCount} {t.runs_word}</span>
		</div>
		<div class="add-row">
			<input
				class="name-input"
				type="text"
				bind:value={name}
				maxlength="100"
				placeholder={t.segment_name_placeholder}
				aria-label={t.segment_name}
			/>
			<button class="add" onclick={add} disabled={adding || !name.trim()}>
				{adding ? t.adding : t.add_word}
			</button>
		</div>
		{#if error}<p class="error">{error}</p>{/if}
	</div>
</div>

<style>
	.suggestion {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--color-surface);
		border-radius: var(--radius-card, 16px);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}
	.dismiss {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		/* Above Leaflet's panes (which share this stacking context, z-index ≤ ~700). */
		z-index: 1000;
		display: flex;
		background: color-mix(in srgb, var(--color-bg-primary) 70%, transparent);
		border: none;
		border-radius: 1000px;
		padding: 0.25rem;
		cursor: pointer;
		color: var(--color-text-secondary);
	}
	.dismiss:hover {
		color: var(--color-text-primary);
	}
	.mini-map {
		width: 100%;
		height: 140px;
		background: var(--color-bg-tertiary);
		display: block;
	}
	:global(.run-hover-pin) {
		display: none;
	}
	.body {
		padding: 0.6rem 0.75rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
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
	.add-row {
		display: flex;
		gap: 0.4rem;
	}
	.name-input {
		flex: 1;
		min-width: 0;
		padding: 0.45rem 0.6rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		color: var(--color-text-primary);
		font-size: 0.85rem;
	}
	.name-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.add {
		padding: 0.45rem 0.8rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: var(--radius-md, 0.5rem);
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.add:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.error {
		margin: 0;
		color: var(--red);
		font-size: 0.8rem;
	}
</style>
