<script lang="ts">
	import type { CalendarDay } from '$lib/calendarTypes';
	import { formatLongDate, rankEmphasis, humanizePsalterWeek, humanizeSundayCycle, type CalendarLang, m, m1962 } from './calendarI18n';
	import { litBg, litInk } from './calendarColors';

	let {
		day,
		lang,
		todayIso,
		href
	}: {
		day: CalendarDay;
		lang: CalendarLang;
		todayIso: string;
		href?: string;
	} = $props();
	const t1962 = $derived(m1962[lang]);
	const t = $derived(m[lang]);

	const color = $derived(day.colorKeys[0] ?? 'GREEN');
	const isToday = $derived(day.iso === todayIso);
	const rankEmph = $derived(rankEmphasis(day.rank));
	const rankNum = $derived(
		rankEmph === 3 ? 'I' : rankEmph === 2 ? 'II' : rankEmph === 1 ? 'III' : 'IV'
	);

	function firstOr(arr: string[], fallback = ''): string {
		return arr && arr.length ? arr[0] : fallback;
	}
</script>

{#snippet card()}
	<section
		class="hero-banner"
		style="background: {litBg(color)}; color: {litInk(color)}"
	>
		<span class="hc-rank" aria-hidden="true">{rankNum}</span>
		<div class="hc-date">
			{#if isToday}{t.today} · {/if}{formatLongDate(day.iso, lang)}
		</div>
		<h2 class="hc-name">{day.name}</h2>
		<div class="hc-tags">
			{#if day.rankName}
				<span class="hc-tag">{day.rankName}</span>
			{/if}
			{#if day.colorNames.length}
				<span class="hc-tag">{firstOr(day.colorNames)}</span>
			{/if}
			{#if day.seasonNames.length}
				<span class="hc-tag">{firstOr(day.seasonNames)}</span>
			{/if}
			{#if day.psalterWeek}
				<span class="hc-tag">{t.psalterWeek}: {humanizePsalterWeek(day.psalterWeek, lang)}</span>
			{/if}
			{#if day.sundayCycle}
				<span class="hc-tag">{t.cycle}: {humanizeSundayCycle(day.sundayCycle)}</span>
			{/if}
		</div>
		{#if day.rite1962 && day.rite1962.commemorations.length}
			<div class="hc-commems">
				<div class="hc-commems-head">
					<svg class="hc-commems-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
					<span class="hc-commems-title">{t1962.commemorations}</span>
				</div>
				<div class="hc-commems-list">
					{#each day.rite1962.commemorations as c (c.id)}
						<span class="hc-commem">{c.name}</span>
					{/each}
				</div>
			</div>
		{/if}
		{#if day.rite1962?.stationChurches?.length}
			<div class="hc-stations">
				<svg class="hc-stations-label" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 9h4"/><path d="M12 7v5"/><path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="M18 22V5l-6-3-6 3v17"/><path d="M4 10.5V22"/><path d="M20 10.5V22"/><path d="M22 22H2"/></svg>
				<span class="hc-stations-text">
					<span class="hc-stations-title">{t1962.stationChurch}:</span>
					{#each day.rite1962.stationChurches as s, i (s.key + (s.mass ?? ''))}
						{#if i > 0}<span class="hc-stations-sep"> · </span>{/if}<span class="hc-station-name">{s.name}</span>{#if s.mass}<span class="hc-station-mass"> ({s.mass.replace(/_/g, ' ')})</span>{/if}
					{/each}
				</span>
			</div>
		{/if}
		{#if href}
			<svg class="hc-chevron" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
		{/if}
	</section>
{/snippet}

{#if href}
	<a class="hero-link" {href} aria-label={day.name}>
		{@render card()}
	</a>
{:else}
	{@render card()}
{/if}

<style>
	.hero-link {
		display: block;
		text-decoration: none;
		color: inherit;
	}
	.hero-banner {
		position: relative;
		border-radius: var(--radius-card);
		padding: 2rem 2.2rem 3rem;
		margin-bottom: 1.5rem;
		box-shadow: var(--shadow-md);
		overflow: hidden;
		transition: transform var(--transition-normal), box-shadow var(--transition-normal),
			background 650ms cubic-bezier(0.33, 1, 0.68, 1),
			color 650ms cubic-bezier(0.33, 1, 0.68, 1);
	}
	.hero-banner::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle at 10% 110%, rgba(255, 255, 255, 0.14), transparent 45%),
			radial-gradient(circle at 95% -10%, rgba(0, 0, 0, 0.12), transparent 45%);
		pointer-events: none;
	}
	.hero-banner > * {
		position: relative;
	}
	.hero-link:hover .hero-banner {
		transform: translateY(-2px);
		box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
	}
	.hero-link:active .hero-banner {
		transform: translateY(0);
	}
	.hero-link:focus-visible .hero-banner {
		outline: 3px solid var(--color-primary);
		outline-offset: 3px;
	}
	.hc-rank {
		position: absolute;
		top: 1.2rem;
		right: 1.4rem;
		min-width: 2.9rem;
		height: 2.9rem;
		padding: 0 0.85rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: Georgia, 'Times New Roman', serif;
		font-style: italic;
		font-weight: 600;
		font-size: 1.4rem;
		letter-spacing: 0.04em;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.28);
		opacity: 0.88;
	}
	.hc-date {
		font-size: 0.74rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-weight: 700;
		opacity: 0.88;
		margin-bottom: 0.6rem;
	}
	.hc-name {
		font-size: clamp(1.4rem, 3vw, 2rem);
		line-height: 1.12;
		margin: 0 0 0.3rem;
		letter-spacing: -0.01em;
		font-weight: 700;
	}
	.hc-tags {
		margin-top: 0.9rem;
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.hc-tag {
		padding: 0.3rem 0.75rem;
		border-radius: var(--radius-pill);
		background: rgba(255, 255, 255, 0.22);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.hc-commems {
		margin-top: 1.4rem;
		padding-top: 1.1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.22);
	}
	.hc-commems-head {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin-bottom: 0.55rem;
	}
	.hc-commems-icon {
		flex-shrink: 0;
		opacity: 0.75;
	}
	.hc-commems-title {
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-size: 0.7rem;
		opacity: 0.85;
	}
	.hc-commems-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 0.6rem;
	}
	.hc-commem {
		padding: 0.3rem 0.7rem;
		border-radius: var(--radius-pill);
		background: rgba(255, 255, 255, 0.18);
		border: 1px solid rgba(255, 255, 255, 0.22);
		font-size: 0.82rem;
	}
	.hc-stations {
		margin-top: 0.9rem;
		display: flex;
		align-items: flex-start;
		gap: 0.55rem;
		font-size: 0.85rem;
		line-height: 1.45;
	}
	.hc-stations-label {
		flex-shrink: 0;
		margin-top: 0.1rem;
		opacity: 0.78;
	}
	.hc-stations-title {
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		font-size: 0.72rem;
		opacity: 0.85;
		margin-right: 0.35rem;
	}
	.hc-station-name {
		font-style: italic;
	}
	.hc-station-mass {
		opacity: 0.75;
		font-size: 0.78rem;
	}
	.hc-stations-sep {
		opacity: 0.6;
	}
	.hc-chevron {
		position: absolute;
		bottom: 1.2rem;
		right: 1.5rem;
		width: 30px;
		height: 30px;
		opacity: 0;
		transform: translateX(-6px);
		transition: transform var(--transition-normal), opacity var(--transition-normal);
	}
	.hero-link:hover .hc-chevron,
	.hero-link:focus-visible .hc-chevron {
		opacity: 0.88;
		transform: translateX(0);
	}
	@media (max-width: 640px) {
		.hero-banner {
			padding: 1.5rem 1.4rem 2.2rem;
		}
		.hc-rank {
			top: 1rem;
			right: 1rem;
			min-width: 1.9rem;
			height: 1.9rem;
			padding: 0 0.5rem;
			font-size: 0.9rem;
		}
		.hc-chevron {
			bottom: 0.9rem;
			right: 1.1rem;
			width: 22px;
			height: 22px;
		}
	}
</style>
