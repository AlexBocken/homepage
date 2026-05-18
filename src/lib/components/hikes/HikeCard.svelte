<script lang="ts">
	import { resolve } from '$app/paths';
	import Route from '@lucide/svelte/icons/route';
	import Clock from '@lucide/svelte/icons/clock';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import Mountain from '@lucide/svelte/icons/mountain';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import type { HikeManifestEntry } from '$types/hikes';

	interface Props {
		hike: HikeManifestEntry;
	}

	const { hike }: Props = $props();

	const durationLabel = $derived(
		hike.durationMin !== null && hike.durationMin > 0
			? `${Math.floor(hike.durationMin / 60)}h ${hike.durationMin % 60}m`
			: '—'
	);

	// SAC trail-sign colour scheme (matches the detail page):
	// T1 yellow Wegweiser, T2/T3 white-red-white Bergwanderweg,
	// T4–T6 white-blue-white Alpinwanderweg.
	const sacBand = $derived.by<'yellow' | 'red' | 'blue'>(() => {
		if (hike.difficulty === 'T1') return 'yellow';
		if (hike.difficulty === 'T2' || hike.difficulty === 'T3') return 'red';
		return 'blue';
	});

	const MONTHS_DE_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
	const seasonLabel = $derived.by(() => {
		const a = hike.seasonStart;
		const b = hike.seasonEnd;
		if (a == null || b == null) return null;
		if (a < 1 || a > 12 || b < 1 || b > 12) return null;
		return `${MONTHS_DE_SHORT[a - 1]}–${MONTHS_DE_SHORT[b - 1]}`;
	});

	// "Neu" badge for hikes published within the last 30 days. Uses the
	// frontmatter date (`YYYY-MM-DD`) compared against the build clock —
	// good enough for a prerendered listing page that rebuilds on every
	// content change.
	const isRecent = $derived.by(() => {
		const t = Date.parse(hike.date);
		if (!Number.isFinite(t)) return false;
		const days = (Date.now() - t) / 86_400_000;
		return days >= 0 && days <= 30;
	});
</script>

<a class="card" href={resolve('/hikes/[slug]', { slug: hike.slug })} style="view-transition-name: hike-{hike.slug}">
	<div class="cover">
		{#if hike.cover.src}
			<picture>
				<source type="image/avif" srcset={hike.cover.srcsetAvif} sizes="(max-width: 600px) 100vw, 400px" />
				<source type="image/webp" srcset={hike.cover.srcsetWebp} sizes="(max-width: 600px) 100vw, 400px" />
				<img
					src={hike.cover.src}
					alt={hike.cover.alt}
					width={hike.cover.width}
					height={hike.cover.height}
					loading="lazy"
					decoding="async"
				/>
			</picture>
		{:else}
			<div class="cover-placeholder"></div>
		{/if}

		{#if hike.icon}
			<span class="icon-pin" aria-hidden="true">
				<img src={hike.icon} alt="" />
			</span>
		{/if}

		<span class="sac-pin" aria-label="SAC-Schwierigkeit {hike.difficulty}">
			<span class="sac-marker sac-marker-{sacBand}">{hike.difficulty}</span>
		</span>

		{#if isRecent}
			<span class="recent-badge">Neu</span>
		{/if}
	</div>

	<div class="body">
		<header class="head">
			<h2 class="title">{hike.title}</h2>
			{#if hike.region}
				<p class="region">{hike.region}{hike.canton && hike.canton !== hike.region ? `, ${hike.canton}` : ''}</p>
			{/if}
		</header>

		<div class="metrics">
			<span title="Distanz"><Route size={14} strokeWidth={1.75} aria-hidden="true" />{hike.distanceKm.toFixed(1)} km</span>
			<span title="Dauer"><Clock size={14} strokeWidth={1.75} aria-hidden="true" />{durationLabel}</span>
			<span title="Aufstieg"><TrendingUp size={14} strokeWidth={1.75} aria-hidden="true" />{hike.elevationGainM} m</span>
			<span title="Abstieg"><TrendingDown size={14} strokeWidth={1.75} aria-hidden="true" />{hike.elevationLossM} m</span>
		</div>

		{#if (hike.elevationMinM !== null && hike.elevationMaxM !== null) || seasonLabel}
			<footer class="foot">
				{#if hike.elevationMinM !== null && hike.elevationMaxM !== null}
					<span class="chip" title="Höhenlage">
						<Mountain size={12} strokeWidth={1.75} aria-hidden="true" />{hike.elevationMinM}–{hike.elevationMaxM} m
					</span>
				{/if}
				{#if seasonLabel}
					<span class="chip" title="Empfohlene Saison">
						<CalendarRange size={12} strokeWidth={1.75} aria-hidden="true" />{seasonLabel}
					</span>
				{/if}
			</footer>
		{/if}
	</div>
</a>

<style>
	.card {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: inherit;
		background: var(--color-surface);
		border-radius: var(--radius-card);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
		transition: scale var(--transition-normal), box-shadow var(--transition-normal);
		height: 100%;
	}

	.card:hover {
		scale: 1.02;
		box-shadow: var(--shadow-hover);
	}

	.cover {
		position: relative;
		aspect-ratio: 16 / 10;
		background: var(--color-bg-elevated);
		overflow: hidden;
	}

	picture,
	.cover-placeholder {
		display: block;
		width: 100%;
		height: 100%;
	}

	picture img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Per-route identity icon, top-left of cover. Floats directly on the
	 * image — a soft drop-shadow keeps it legible without a backdrop. */
	.icon-pin {
		position: absolute;
		top: 0.55rem;
		left: 0.55rem;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.45));
	}

	.icon-pin img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	/* SAC difficulty badge, top-right of cover. Same approach — sits on
	 * the image with a drop-shadow for separation, no white backdrop. */
	.sac-pin {
		position: absolute;
		top: 0.55rem;
		right: 0.55rem;
		display: inline-flex;
		align-items: center;
		filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.45));
	}

	.sac-marker {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 22px;
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		line-height: 1;
	}

	.sac-marker-yellow {
		width: 36px;
		color: #1a1a1a;
		background: #f5a623;
		clip-path: polygon(0 0, 75% 0, 100% 50%, 75% 100%, 0 100%);
		/* Text in the rectangular left portion (arrow tip is right 25%). */
		justify-content: flex-start;
		padding-left: 0.45rem;
	}

	.sac-marker-red,
	.sac-marker-blue {
		width: 44px;
		color: #fff;
		text-shadow: 0 1px 1px rgb(0 0 0 / 0.45);
		border-radius: 2px;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.18);
	}

	.sac-marker-red {
		background: linear-gradient(
			to bottom,
			#fff 0 25%,
			#dc1d2a 25% 75%,
			#fff 75% 100%
		);
	}

	.sac-marker-blue {
		background: linear-gradient(
			to bottom,
			#fff 0 25%,
			#2965c8 25% 75%,
			#fff 75% 100%
		);
	}

	/* Bottom-left freshness marker — only when the hike was published in
	 * the last 30 days. Small, brand-coloured, all-caps. */
	.recent-badge {
		position: absolute;
		bottom: 0.55rem;
		left: 0.55rem;
		padding: 0.18rem 0.6rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		border-radius: var(--radius-pill);
		box-shadow: 0 2px 6px rgb(0 0 0 / 0.25);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.9rem 1rem 1rem;
		flex: 1 1 auto;
	}

	.head {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.title {
		margin: 0;
		font-size: 1.2rem;
		line-height: 1.25;
		color: var(--color-text-primary);
	}

	.region {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	.metrics {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.85rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.metrics span {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.metrics :global(svg) {
		color: var(--color-primary);
		flex: 0 0 auto;
	}

	.foot {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: auto;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.55rem;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		border-radius: var(--radius-pill);
	}

	.chip :global(svg) {
		color: var(--color-text-secondary);
		flex: 0 0 auto;
	}
</style>
