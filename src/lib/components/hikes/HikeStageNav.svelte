<script lang="ts">
	// Stage switcher styled as a hut-to-hut itinerary line: a leading "Alle"
	// pill, then numbered nodes joined by thin connectors. The active stage's
	// node glows in the accent and its name/distance shows alongside. Light and
	// in-flow (no boxed/blurred bar) — writes the shared stageStore.
	import type { Attachment } from 'svelte/attachments';
	import type { HikeStage } from '$types/hikes';
	import { stage, setActiveStage } from './stageStore.svelte';
	import { page } from '$app/state';
	import { m, type HikesLang } from '$lib/js/hikesI18n';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';

	interface Props {
		stages: HikeStage[];
	}

	const { stages }: Props = $props();

	const lang = $derived((page.data.lang as HikesLang | undefined) ?? 'de');
	const t = $derived(m[lang]);
	const active = $derived(stage.active);
	const totalKm = $derived(stages.reduce((a, s) => a + s.distanceKm, 0));

	// How much of the line is off-screen on either side, so the fades and
	// chevrons only show where there is actually more to see.
	let moreLeft = $state(false);
	let moreRight = $state(false);

	const watchOverflow: Attachment<HTMLElement> = (line) => {
		const update = () => {
			// A pixel of slack: fractional scroll offsets would otherwise leave
			// the chevron up at the very end of the scroll.
			moreLeft = line.scrollLeft > 1;
			moreRight = line.scrollLeft + line.clientWidth < line.scrollWidth - 1;
		};
		update();
		line.addEventListener('scroll', update, { passive: true });
		const ro = new ResizeObserver(update);
		ro.observe(line);
		return () => {
			line.removeEventListener('scroll', update);
			ro.disconnect();
		};
	};

	// The line scrolls sideways once the stages outgrow the screen, so keep the
	// active one in sight — it can also be picked from the map or photo strip.
	const followActive: Attachment<HTMLElement> = (line) => {
		const i = active;
		if (i === null) return;
		const node = line.querySelectorAll('.node')[i];
		node?.scrollIntoView({
			inline: 'center',
			block: 'nearest',
			behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
		});
	};
</script>

<nav class="stepper" aria-label={t.stages}>
	<button
		type="button"
		class="all"
		class:active={active === null}
		aria-pressed={active === null}
		onclick={() => setActiveStage(null)}
	>
		{t.all}
	</button>

	<div class="line-wrap" class:more-left={moreLeft} class:more-right={moreRight}>
		<ol class="line" {@attach followActive} {@attach watchOverflow}>
			{#each stages as s, i (i)}
				{#if i > 0}
					<li class="connector" class:lit={active === null} aria-hidden="true"></li>
				{/if}
				<li>
					<button
						type="button"
						class="node"
						class:active={active === i}
						class:lit={active === null}
						aria-pressed={active === i}
						aria-label={`${t.stage} ${i + 1}: ${s.name}`}
						title={s.name}
						onclick={() => setActiveStage(i)}
					>
						{i + 1}
					</button>
				</li>
			{/each}
		</ol>
		<span class="edge edge-left" aria-hidden="true"><ChevronLeft size={16} strokeWidth={2.5} /></span>
		<span class="edge edge-right" aria-hidden="true"><ChevronRight size={16} strokeWidth={2.5} /></span>
	</div>

	<p class="label" aria-live="polite">
		{#if active === null}
			<span class="title">{t.all_stages}</span>
			<span class="dist">{totalKm.toFixed(1)} km</span>
		{:else}
			<span class="kicker">{t.stage} {active + 1}</span>
			<span class="title">{stages[active].name}</span>
			<span class="dist">{stages[active].distanceKm.toFixed(1)} km</span>
		{/if}
	</p>
</nav>

<style>
	.stepper {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		/* (a) breathing room below the full-bleed hero map; horizontal inset
		 * matches the other detail sections. */
		margin-top: 1.75rem;
		padding: 0 1rem;
	}

	.all {
		flex: 0 0 auto;
		appearance: none;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 600;
		padding: 0.25rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: color var(--transition-fast), background-color var(--transition-fast),
			border-color var(--transition-fast);
	}

	.all:hover {
		color: var(--color-text-primary);
		border-color: var(--color-border-hover);
	}

	.all.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}

	/* A long itinerary (the Alta Via 1 has eleven stages) is wider than a
	 * phone: the line scrolls instead of pushing the page sideways. The wrapper
	 * reaches past the nav's inset to the screen edge, so the stages run out of
	 * view at the edge rather than a margin short of it, and it carries the
	 * fades that say there is more either way. */
	.line-wrap {
		position: relative;
		flex: 1 1 auto;
		min-width: 0;
		margin-inline: -1rem;
	}

	.line {
		display: flex;
		align-items: center;
		gap: 0;
		list-style: none;
		margin: 0;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		/* Left inset matches the nav's; vertical padding keeps the scroll
		 * container from clipping the active node's glow. */
		padding: 0.35rem 0 0.35rem 1rem;
		scrollbar-width: none;
	}

	.line::-webkit-scrollbar {
		display: none;
	}

	/* Chevron on a fade of the page behind, shown only while that side has
	 * more to scroll. */
	.edge {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2.25rem;
		display: flex;
		align-items: center;
		color: var(--color-text-tertiary);
		pointer-events: none;
		opacity: 0;
		transition: opacity var(--transition-normal);
	}

	.edge-left {
		left: 0;
		justify-content: flex-start;
		background: linear-gradient(to right, var(--color-bg-primary) 35%, transparent);
	}

	.edge-right {
		right: 0;
		justify-content: flex-end;
		background: linear-gradient(to left, var(--color-bg-primary) 35%, transparent);
	}

	.line-wrap.more-left .edge-left,
	.line-wrap.more-right .edge-right {
		opacity: 1;
	}

	.connector {
		width: 1.75rem;
		height: 2px;
		flex: 0 0 auto;
		border-radius: 2px;
		background: var(--color-border);
		transition: background-color var(--transition-fast);
	}

	.connector.lit {
		background: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
	}

	.node {
		display: grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		appearance: none;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		border: 1.5px solid var(--color-border);
		border-radius: 50%;
		background: var(--color-surface);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: color var(--transition-fast), background-color var(--transition-fast),
			border-color var(--transition-fast), scale var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	.node:hover {
		scale: 1.1;
		border-color: var(--color-primary);
		color: var(--color-text-primary);
	}

	/* "Alle" selected: whole line subtly lit so it reads as the full route. */
	.node.lit {
		border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
		color: var(--color-text-primary);
	}

	.node.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 22%, transparent);
	}

	.label {
		display: inline-flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.1rem 0.5rem;
		margin: 0;
		min-width: 0;
	}

	.kicker {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-tertiary);
	}

	.title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.dist {
		font-size: 0.82rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}
</style>
