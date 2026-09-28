<script lang="ts">
	// The side panel of the ring and hills views: the active season, its span,
	// and its feasts, scrolled so the selected day sits in the middle. Where the
	// panel sits is up to the view.
	import type { FeastDot, SeasonArc } from './+page.server';
	import { viewLabels, type CalendarLang } from '../../../../calendarI18n';
	import { litBg, litInk } from '../../../../calendarColors';
	import { fmtRange, fmtShort } from '../../../../calendarWindow';
	import { prefersReducedMotion } from 'svelte/motion';

	let {
		active,
		isNow,
		feasts,
		selectedIso,
		todayIso,
		lang,
		dayHref
	}: {
		active: SeasonArc;
		/** Whether to mark the season as the current one. */
		isNow: boolean;
		/** The feasts inside the season. */
		feasts: FeastDot[];
		selectedIso: string | null;
		todayIso: string;
		lang: CalendarLang;
		dayHref: (iso: string) => string;
	} = $props();

	const T = $derived(viewLabels[lang]);

	let feastListEl = $state<HTMLDivElement | null>(null);
	let didInitialScroll = false;

	$effect(() => {
		feasts;
		selectedIso;
		const list = feastListEl;
		if (!list || list.clientHeight === 0) return;
		let el = list.querySelector<HTMLElement>('[aria-current="date"]');
		if (!el && selectedIso) {
			// Selected day isn't a listed feast (e.g. ferial) — center the
			// closest feast by date so the user still lands near "today".
			const items = list.querySelectorAll<HTMLElement>('.feast-item[data-iso]');
			let best: HTMLElement | null = null;
			let bestDelta = Infinity;
			const selTime = Date.parse(selectedIso);
			for (const item of items) {
				const iso = item.dataset.iso;
				if (!iso) continue;
				const delta = Math.abs(Date.parse(iso) - selTime);
				if (delta < bestDelta) {
					bestDelta = delta;
					best = item;
				}
			}
			el = best;
		}
		if (!el) return;
		const listRect = list.getBoundingClientRect();
		const elRect = el.getBoundingClientRect();
		const relTop = elRect.top - listRect.top + list.scrollTop;
		const target = relTop - (list.clientHeight - elRect.height) / 2;
		const max = list.scrollHeight - list.clientHeight;
		list.scrollTo({
			top: Math.max(0, Math.min(max, target)),
			behavior: didInitialScroll && !prefersReducedMotion.current ? 'smooth' : 'auto'
		});
		didInitialScroll = true;
	});
</script>

<aside class="season-panel" style="border-top: 6px solid {litBg(active.color)}">
	<h3>
		{active.name}
		{#if isNow}
			<span
				class="season-now-chip"
				style="background: {litBg(active.color)}; color: {litInk(active.color)}"
			>
				{T.now}
			</span>
		{/if}
	</h3>
	<div class="range">
		{fmtRange(active.start, active.end, lang)}
	</div>

	{#if feasts.length}
		<h4 class="section-h">{T.feastsIn}</h4>
		<div class="feast-list" bind:this={feastListEl}>
			{#each feasts as f (f.iso + f.name)}
				{@const isSel = f.iso === selectedIso}
				{@const isToday = f.iso === todayIso}
				<a
					class="feast-item"
					class:selected={isSel}
					class:today={isSel && isToday}
					aria-current={isSel ? 'date' : undefined}
					data-iso={f.iso}
					href={dayHref(f.iso)}
					data-sveltekit-noscroll
					data-sveltekit-replacestate
				>
					<span class="d">{fmtShort(f.iso, lang)}</span>
					<span class="sq" style="background: {litBg(f.color)}"></span>
					<span class="n">{f.name}</span>
					<span class="r">{f.rank.replace(/^Class/, '')}</span>
				</a>
			{/each}
		</div>
	{/if}
</aside>

<style>
	/* Sizing and placement (height, how the feast list grows) are the view's. */
	.season-panel {
		background: var(--color-surface);
		border-radius: var(--radius-card);
		padding: 22px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
	.season-panel h3 {
		margin: 0 0 8px;
		font-size: 1.35rem;
		color: var(--color-text-primary);
	}
	.season-now-chip {
		margin-left: 10px;
		vertical-align: middle;
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 700;
		padding: 4px 10px;
		border-radius: 100px;
		box-shadow: var(--shadow-sm);
	}
	.range {
		font-size: 0.88rem;
		color: var(--color-text-secondary);
		margin-top: 2px;
	}
	.section-h {
		margin: 18px 0 6px;
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 700;
	}
	.feast-list {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
		padding-right: 4px;
	}
	.feast-list::-webkit-scrollbar {
		width: 6px;
	}
	.feast-list::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 100px;
	}
	.feast-list::-webkit-scrollbar-track {
		background: transparent;
	}
	.feast-item {
		display: grid;
		grid-template-columns: 72px 14px 1fr auto;
		gap: 10px;
		align-items: center;
		padding: 8px 10px;
		border-radius: var(--radius-md);
		text-decoration: none;
		color: inherit;
		transition: background var(--transition-fast), box-shadow var(--transition-fast);
		font-size: 0.9rem;
	}
	.feast-item:hover {
		background: var(--color-surface-hover);
	}
	.feast-item.selected {
		/* Mix text color into surface: darkens in light mode, lightens in dark. */
		background: color-mix(in srgb, var(--color-text-primary) 16%, var(--color-surface));
	}
	.feast-item.selected .n {
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.feast-item.selected .d,
	.feast-item.selected .r {
		color: var(--color-text-primary);
	}
	.feast-item.selected.today {
		background: color-mix(in srgb, var(--lit-gold) 38%, var(--color-surface));
	}
	.feast-item .d {
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
		font-size: 0.82rem;
	}
	.feast-item .sq {
		width: 12px;
		height: 12px;
		border-radius: 100px;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
	}
	.feast-item .n {
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.feast-item .r {
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		font-weight: 700;
		letter-spacing: 0.05em;
	}
</style>
