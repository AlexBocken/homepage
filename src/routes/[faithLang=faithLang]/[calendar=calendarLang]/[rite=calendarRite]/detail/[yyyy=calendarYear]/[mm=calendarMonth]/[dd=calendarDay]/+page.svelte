<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import {
		formatLongDate,
		getMonthName,
		properLabel,
		t,
		t1962,
		type CalendarLang
	} from '../../../../../calendarI18n';
	import HeroCard from '../../../../../HeroCard.svelte';

	let { data }: { data: PageData } = $props();

	const lang = $derived(data.lang as CalendarLang);
	const rite = $derived(data.rite);
	const day = $derived(data.day1);
	const year = $derived(data.year);
	const month = $derived(data.month);
	const iso = $derived(data.iso);
	const todayIso = $derived(data.todayIso);

	type PropersView = 'la' | 'parallel' | 'local';
	const VIEW_KEY = 'litcal.propersView';
	let propersView = $state<PropersView>('parallel');
	if (browser) {
		const saved = localStorage.getItem(VIEW_KEY);
		if (saved === 'la' || saved === 'parallel' || saved === 'local') propersView = saved;
	}
	$effect(() => {
		if (browser) localStorage.setItem(VIEW_KEY, propersView);
	});

	function pad(n: number) {
		return String(n).padStart(2, '0');
	}

	const riteBase = $derived(`/${page.params.faithLang}/${page.params.calendar}/${rite}`);
	const dioceseQuery = $derived.by(() => {
		const q = page.url.searchParams.get('diocese');
		return q ? `?diocese=${q}` : '';
	});

	// Back link: return to the month view for the day's month
	const backHref = $derived(`${riteBase}/${year}/${pad(month + 1)}${dioceseQuery}`);
	// Day cell in the month grid is the same URL, kept the selection by including dd
	const dayInMonthHref = $derived(`${riteBase}/${year}/${pad(month + 1)}/${pad(data.day)}${dioceseQuery}`);

	// Next/prev day navigation inside the detail view
	function shiftDay(days: number): string {
		const [y, m, d] = iso.split('-').map(Number);
		const next = new Date(y, m - 1, d);
		next.setDate(next.getDate() + days);
		return `${riteBase}/detail/${next.getFullYear()}/${pad(next.getMonth() + 1)}/${pad(next.getDate())}${dioceseQuery}`;
	}
	const prevHref = $derived(shiftDay(-1));
	const nextHref = $derived(shiftDay(1));

	const monthTitle = $derived(`${getMonthName(month, lang)} ${year}`);
</script>

<svelte:head>
	<title>{day.name} — {formatLongDate(iso, lang)}</title>
	<meta name="description" content={day.name} />
</svelte:head>

<main class="detail-wrap">
	<nav class="detail-topnav">
		<a class="back-link" href={backHref}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
			<span>{monthTitle}</span>
		</a>
		<div class="day-nav">
			<a class="nav-btn" href={prevHref} aria-label={t('prev', lang)} data-sveltekit-noscroll>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
			</a>
			<a class="nav-btn" href={nextHref} aria-label={t('next', lang)} data-sveltekit-noscroll>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
			</a>
		</div>
	</nav>

	<HeroCard {day} {lang} {todayIso} />

	{#if day.rite1962}
		{@const d = day.rite1962}
		{#if d.vigilOf || d.octave || d.transferredFrom}
			<dl class="detail-extras">
				{#if d.vigilOf}
					<div>
						<dt>{t1962('vigilOf', lang)}</dt>
						<dd>{d.vigilOf}</dd>
					</div>
				{/if}
				{#if d.octave}
					<div>
						<dt>{t1962('octave', lang)}</dt>
						<dd>{d.octave.ofId} · {t1962('octaveDay', lang)} {d.octave.day}</dd>
					</div>
				{/if}
				{#if d.transferredFrom}
					<div>
						<dt>{t1962('transferredFrom', lang)}</dt>
						<dd>{d.transferredFrom}</dd>
					</div>
				{/if}
			</dl>
		{/if}
		{#if d.propers.length}
			<section class="propers">
				<div class="propers-head">
					<h4>{t1962('propers', lang)}</h4>
					{#if lang !== 'la'}
						<div class="view-toggle" role="group" aria-label={t1962('propers', lang)}>
							<button
								type="button"
								class="view-btn"
								class:active={propersView === 'la'}
								aria-pressed={propersView === 'la'}
								onclick={() => (propersView = 'la')}
							>
								{t1962('viewLatin', lang)}
							</button>
							<button
								type="button"
								class="view-btn"
								class:active={propersView === 'parallel'}
								aria-pressed={propersView === 'parallel'}
								onclick={() => (propersView = 'parallel')}
							>
								{t1962('viewParallel', lang)}
							</button>
							<button
								type="button"
								class="view-btn"
								class:active={propersView === 'local'}
								aria-pressed={propersView === 'local'}
								onclick={() => (propersView = 'local')}
							>
								{t1962('viewVernacular', lang)}
							</button>
						</div>
					{/if}
				</div>
				{#each d.propers as section (section.key)}
					{@const rows = Math.max(section.la.length, section.local.length)}
					<article class="proper-card">
						<header class="proper-card-head">
							<span class="proper-label">{properLabel(section.key, lang)}</span>
							{#if section.refLabel}
								<span class="proper-ref">({section.refLabel})</span>
							{/if}
							{#if section.localFromBible && lang !== 'la' && propersView !== 'la'}
								<span class="proper-fallback" title={t1962('fallbackHint', lang)}>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
									{t1962('fallbackBadge', lang)}
								</span>
							{/if}
						</header>
						<div class="proper-content">
							{#each Array(rows) as _, i (i)}
								{@const la = section.la[i] ?? ''}
								{@const local = section.local[i] ?? ''}
								{@const isLaOnly = lang === 'la' || propersView === 'la'}
								{@const isLocalOnly = lang !== 'la' && propersView === 'local'}
								{@const showLa = isLaOnly || propersView === 'parallel' || (isLocalOnly && !local)}
								{@const showLocal = !isLaOnly && local && (propersView === 'parallel' || isLocalOnly)}
								{#if (showLa && la) || (showLocal && local)}
									<div class="proper-segment">
										<div class="proper-cols" class:single={!(showLa && la && showLocal && local)}>
											{#if showLa && la}
												<div class="proper-col proper-col-la" lang="la">{la}</div>
											{/if}
											{#if showLocal && local}
												<div class="proper-col proper-col-local" {lang}>{local}</div>
											{/if}
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</article>
				{/each}
			</section>
		{/if}
	{/if}

	<nav class="back-nav">
		<a class="back-link-lg" href={dayInMonthHref}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
			{monthTitle}
		</a>
	</nav>
</main>

<style>
	.detail-wrap {
		/* Liturgical color tokens — matches overview page. */
		--lit-white: #f3efe6;
		--lit-white-ink: #7a6a42;
		--lit-red: #bf616a;
		--lit-red-ink: #ffffff;
		--lit-green: #a3be8c;
		--lit-green-ink: #2f3a20;
		--lit-violet: #6b5b93;
		--lit-violet-ink: #ffffff;
		--lit-black: #2a2a2a;
		--lit-black-ink: #e5e5e5;
		--lit-rose: #e0a6b4;
		--lit-rose-ink: #553240;
		--lit-gold: #d4af4a;
		--lit-gold-ink: #3a2a0a;

		max-width: 900px;
		margin-inline: auto;
		padding: 1rem 1rem 4rem;
	}

	.detail-topnav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.back-link,
	.back-link-lg {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: 0.9rem;
		padding: 0.4rem 0.7rem;
		border-radius: var(--radius-pill);
		transition: background var(--transition-fast);
	}
	.back-link:hover,
	.back-link-lg:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}
	.day-nav {
		display: flex;
		gap: 0.35rem;
	}
	.nav-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-pill);
		color: var(--color-text-secondary);
		text-decoration: none;
		background: var(--color-surface);
		box-shadow: var(--shadow-sm);
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.nav-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.detail-extras {
		margin: 1.25rem 0 0.5rem;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.5rem 1rem;
		font-size: var(--text-sm);
	}
	.detail-extras div {
		display: flex;
		flex-direction: column;
	}
	.detail-extras dt {
		font-weight: 600;
		color: var(--color-text-secondary);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.detail-extras dd {
		margin: 0;
		color: var(--color-text-primary);
	}
	.propers h4 {
		margin: 0.5rem 0 0.4rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
		font-weight: 600;
	}

	.propers {
		margin-top: 1.5rem;
	}
	.propers-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.propers-head h4 {
		margin: 0;
	}
	.view-toggle {
		display: inline-flex;
		padding: 3px;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		gap: 2px;
	}
	.view-btn {
		appearance: none;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		padding: 0.35rem 0.85rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.view-btn:hover {
		color: var(--color-text-primary);
	}
	.view-btn.active {
		background: var(--color-surface);
		color: var(--color-text-primary);
		box-shadow: var(--shadow-sm);
	}
	.proper-card {
		background: var(--color-bg-elevated);
		border-radius: var(--radius-lg, 12px);
		padding: 1.1rem 1.35rem 1.25rem;
		margin-bottom: 0.9rem;
		box-shadow: var(--shadow-sm);
	}
	.proper-card:last-child {
		margin-bottom: 0;
	}
	.proper-card-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.4rem;
		margin-bottom: 0.6rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.proper-label {
		display: inline-block;
		font-weight: 700;
		font-size: 0.78rem;
		color: var(--nord11);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		line-height: 1.2;
	}
	.proper-ref {
		margin-left: 0.4rem;
		font-size: 0.78rem;
		font-weight: 500;
		color: var(--color-text-tertiary);
		letter-spacing: 0;
		text-transform: none;
	}
	.proper-fallback {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: auto;
		padding: 0.15rem 0.5rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--nord12);
		background: color-mix(in srgb, var(--nord12) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--nord12) 35%, transparent);
		border-radius: var(--radius-pill);
		letter-spacing: 0.02em;
		cursor: help;
	}
	.proper-fallback svg {
		flex-shrink: 0;
	}
	.proper-content {
		min-width: 0;
	}
	.proper-segment {
		margin-top: 0.5rem;
	}
	.proper-segment:first-child {
		margin-top: 0;
	}
	.proper-segment + .proper-segment {
		padding-top: 0.5rem;
		border-top: 1px dashed var(--color-border);
	}
	.proper-cols {
		display: grid;
		grid-template-columns: 1fr 1fr;
		column-gap: 1.25rem;
		row-gap: 0;
		align-items: start;
	}
	.proper-col-la {
		grid-column: 1;
	}
	.proper-col-local {
		grid-column: 2;
	}
	.proper-cols.single {
		grid-template-columns: 1fr;
	}
	.proper-cols.single .proper-col-la,
	.proper-cols.single .proper-col-local {
		grid-column: 1;
	}
	.proper-col {
		white-space: pre-wrap;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--color-text-primary);
	}
	.proper-cols:not(.single) .proper-col-local {
		color: var(--color-text-secondary);
	}

	.back-nav {
		margin-top: 1.5rem;
		display: flex;
		justify-content: center;
	}

	@media (max-width: 640px) {
		.proper-cols {
			grid-template-columns: 1fr;
		}
		.proper-cols .proper-col-la,
		.proper-cols .proper-col-local {
			grid-column: 1;
		}
	}
</style>
