<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		getMonthName,
		getWeekdayShort,
		rankEmphasis,
		t,
		dioceseLabel,
		DIOCESES_1962,
		DIOCESES_1969,
		DEFAULT_DIOCESE_1962,
		DEFAULT_DIOCESE_1969,
		type CalendarLang
	} from '../../../../calendarI18n';
	import { litBg, litInk, LIT_COLOR_VAR } from '../../../../calendarColors';
	import RingView from './RingView.svelte';
	import HeroCard from '../../../../HeroCard.svelte';

	let { data }: { data: PageData } = $props();

	const lang = $derived(data.lang as CalendarLang);

	const year = $derived(data.year);
	const liturgicalYear = $derived(data.liturgicalYear);
	const month = $derived(data.month);
	const monthDays = $derived(data.monthDays);
	const yearDays = $derived(data.yearDays);
	const seasonArcs = $derived(data.seasonArcs);
	const today = $derived(data.today);
	const todayIso = $derived(data.todayIso);
	const selected = $derived(data.selected);
	const selectedIso = $derived(data.selectedIso);
	const diocese = $derived(data.diocese);
	const windowStart = $derived(data.windowStart);
	const windowEnd = $derived(data.windowEnd);
	const liturgicalYearStart = $derived(data.liturgicalYearStart);
	const inPostPentecost = $derived(data.inPostPentecost);

	type CalView = 'ring' | 'grid';
	let view = $state<CalView>('ring');
	onMount(() => {
		const saved = localStorage.getItem('litcal.view');
		if (saved === 'ring' || saved === 'grid') view = saved;
	});
	$effect(() => {
		localStorage.setItem('litcal.view', view);
	});

	const monthTitle = $derived(`${getMonthName(month, lang)} ${year}`);

	const prevMonth = $derived(month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 });
	const nextMonth = $derived(month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 });

	const weekdayLabels = $derived(
		[1, 2, 3, 4, 5, 6, 0].map((w) => getWeekdayShort(w, lang))
	);

	const leadingBlanks = $derived.by(() => {
		const firstDow = new Date(year, month, 1).getDay();
		return (firstDow + 6) % 7;
	});

	const rite = $derived(data.rite);
	const wip = $derived(data.wip);
	const riteSubtitle = $derived(t(rite === 'vetus' ? 'rite1962Long' : 'rite1969Long', lang));

	function pad(n: number) {
		return String(n).padStart(2, '0');
	}

	function toRoman(n: number): string {
		const map: [number, string][] = [
			[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
			[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
			[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
		];
		let out = '';
		let num = n;
		for (const [v, s] of map) {
			while (num >= v) {
				out += s;
				num -= v;
			}
		}
		return out;
	}
	const yearRoman = $derived(toRoman(year));
	function rankRoman(r: number): string {
		return r === 3 ? 'I' : r === 2 ? 'II' : r === 1 ? 'III' : '';
	}

	// Only append ?diocese= when non-default, keeps default URLs clean.
	const dioceseQuery = $derived.by(() => {
		const def = rite === 'vetus' ? DEFAULT_DIOCESE_1962 : DEFAULT_DIOCESE_1969;
		return diocese && diocese !== def ? `?diocese=${diocese}` : '';
	});

	const dioceseOptions = $derived(rite === 'vetus' ? DIOCESES_1962 : DIOCESES_1969);

	// URL: /{faithLang}/{calendar}/{rite}/{yyyy}/{mm}/{dd} — rite is a required
	// path segment so day/month nav stays inside the active rite.
	const riteBase = $derived(`/${page.params.faithLang}/${page.params.calendar}/${rite}`);
	const calendarBase = $derived(`/${page.params.faithLang}/${page.params.calendar}`);

	function dayHref(iso: string) {
		const [yy, mm, dd] = iso.split('-');
		return `${riteBase}/${yy}/${mm}/${dd}${dioceseQuery}`;
	}

	function detailHref(iso: string) {
		const [yy, mm, dd] = iso.split('-');
		return `${riteBase}/detail/${yy}/${mm}/${dd}${dioceseQuery}`;
	}

	// Hero card: prefer the currently-selected day; fall back to today when
	// nothing is explicitly selected.
	const hero = $derived(selected ?? today);

	function monthHref(y: number, m: number) {
		return `${riteBase}/${y}/${pad(m + 1)}${dioceseQuery}`;
	}

	const todayHref = $derived.by(() => {
		const now = new Date();
		return `${riteBase}/${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}${dioceseQuery}`;
	});

	const pageTitle = $derived(t('calendar', lang));

	// When switching rites we drop ?diocese because the ID spaces differ (1962 has
	// diocesan calendars, 1969 only "general" or "switzerland"). The server
	// re-applies each rite's default if none is given.
	function riteHref(r: 'novus' | 'vetus') {
		const dd = selectedIso.slice(8, 10);
		return `${calendarBase}/${r}/${year}/${pad(month + 1)}/${dd}`;
	}

	function onDioceseChange(e: Event) {
		const next = (e.currentTarget as HTMLSelectElement).value;
		const def = rite === 'vetus' ? DEFAULT_DIOCESE_1962 : DEFAULT_DIOCESE_1969;
		const dd = selectedIso.slice(8, 10);
		const path = `${riteBase}/${year}/${pad(month + 1)}/${dd}`;
		goto(next === def ? path : `${path}?diocese=${next}`, { noScroll: true });
	}
</script>

<svelte:head>
	<title>{pageTitle} — Bocken</title>
	<meta name="description" content={pageTitle} />
</svelte:head>

<main class="cal-wrap">
	<header class="cal-head">
		<h1>{pageTitle}</h1>
		<p class="rite-subtitle">{riteSubtitle}</p>
		<div class="rite-toggle" role="tablist" aria-label="Rite">
			<a
				role="tab"
				aria-selected={rite === 'novus'}
				class="rite-pill"
				class:active={rite === 'novus'}
				href={riteHref('novus')}
			>
				Novus
			</a>
			<a
				role="tab"
				aria-selected={rite === 'vetus'}
				class="rite-pill"
				class:active={rite === 'vetus'}
				href={riteHref('vetus')}
			>
				Vetus
			</a>
		</div>
		<label class="diocese-picker">
			<span class="diocese-label">{t('calendarVariant', lang)}</span>
			<select value={diocese} onchange={onDioceseChange} aria-label={t('calendarVariant', lang)}>
				{#each dioceseOptions as d (d)}
					<option value={d}>{dioceseLabel(d, lang)}</option>
				{/each}
			</select>
		</label>
		{#if rite === 'novus'}
			<p class="diocese-note">{t('rite1969SwissNote', lang)}</p>
		{/if}
	</header>

	{#if wip}
		<section class="wip">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8v4"/><path d="M12 16h.01"/><circle cx="12" cy="12" r="10"/></svg>
			<h2>{t('wipTitle', lang)}</h2>
			<p>{t('wipBody', lang)}</p>
		</section>
	{:else}
	{#if rite === 'vetus'}
		<aside class="disclaimer" role="note">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
			<div>
				<strong>{t('rite1962DisclaimerTitle', lang)}</strong>
				<p>{t('rite1962DisclaimerBody', lang)}</p>
			</div>
		</aside>
	{/if}
	{#if hero}
		<HeroCard
			day={hero}
			{lang}
			{todayIso}
			href={rite === 'vetus' ? detailHref(hero.iso) : undefined}
		/>
	{/if}

	<!-- Color legend + view switcher -->
	<div class="overview-controls">
		<div class="view-switcher" role="tablist" aria-label={t('calendar', lang)}>
			<button
				class:active={view === 'ring'}
				role="tab"
				aria-selected={view === 'ring'}
				onclick={() => (view = 'ring')}
			>
				◯ {lang === 'de' ? 'Jahr' : lang === 'la' ? 'Annus' : 'Year'}
			</button>
			<button
				class:active={view === 'grid'}
				role="tab"
				aria-selected={view === 'grid'}
				onclick={() => (view = 'grid')}
			>
				▦ {lang === 'de' ? 'Monat' : lang === 'la' ? 'Mensis' : 'Month'}
			</button>
		</div>
		<div class="overview-right">
			<div class="legend" aria-hidden={!Object.keys(LIT_COLOR_VAR).length}>
				{#each Object.keys(LIT_COLOR_VAR) as key (key)}
					{@const label =
						lang === 'de'
							? { WHITE: 'Weiß', RED: 'Rot', GREEN: 'Grün', PURPLE: 'Violett', ROSE: 'Rosa', BLACK: 'Schwarz' }[key]
							: lang === 'la'
								? { WHITE: 'Albus', RED: 'Ruber', GREEN: 'Viridis', PURPLE: 'Violaceus', ROSE: 'Rosaceus', BLACK: 'Niger' }[key]
								: { WHITE: 'White', RED: 'Red', GREEN: 'Green', PURPLE: 'Violet', ROSE: 'Rose', BLACK: 'Black' }[key]}
					<span class="swatch">
						<span class="sq" style="background: {litBg(key)}"></span>
						<span>{label}</span>
					</span>
				{/each}
			</div>
			<a
				class="jump-btn jump-btn-gold"
				href={todayHref}
				data-sveltekit-noscroll
				data-sveltekit-replacestate
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
				{t('jumpToToday', lang)}
			</a>
		</div>
	</div>

	{#if view === 'ring'}
		<section class="ring-stage">
			<RingView
				{year}
				{liturgicalYear}
				{yearDays}
				{seasonArcs}
				{todayIso}
				{selectedIso}
				{lang}
				{dayHref}
				{windowStart}
				{windowEnd}
				{liturgicalYearStart}
				{inPostPentecost}
			/>
		</section>
	{:else}
	<nav class="month-nav" aria-label={monthTitle}>
		<a
			class="nav-btn"
			href={monthHref(prevMonth.y, prevMonth.m)}
			aria-label={t('prev', lang)}
			data-sveltekit-noscroll
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
		</a>
		<div class="month-header">
			<h2 class="month-title">{getMonthName(month, lang)}</h2>
			<div class="month-sub">{yearRoman} · {pad(month + 1)}</div>
		</div>
		<a
			class="nav-btn"
			href={monthHref(nextMonth.y, nextMonth.m)}
			aria-label={t('next', lang)}
			data-sveltekit-noscroll
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
		</a>
	</nav>

	<div class="grid">
		<div class="grid-header" role="row">
			{#each weekdayLabels as wd (wd)}
				<div class="wd-cell" role="columnheader">{wd}</div>
			{/each}
		</div>

		<div class="grid-body" role="grid">
			{#each Array.from({ length: leadingBlanks }, (_, i) => i) as i (i)}
				<div class="day-cell blank" aria-hidden="true"></div>
			{/each}

			{#each monthDays as day (day.iso)}
				{@const isToday = day.iso === todayIso}
				{@const isSelected = day.iso === selectedIso}
				{@const rank = rankEmphasis(day.rank)}
				{@const hasFeast = rank >= 2 || (rank === 1 && !!day.name)}
				{@const fillColor = day.colorKeys[0]}
				{@const rankNum = rankRoman(rank)}
				<a
					class="day-cell"
					class:today={isToday}
					class:selected={isSelected}
					class:rank-low={rank === 1}
					href={dayHref(day.iso)}
					style={hasFeast
						? `background: ${litBg(fillColor)}; color: ${litInk(fillColor)}`
						: undefined}
					data-sveltekit-noscroll
					data-sveltekit-replacestate
				>
					<span class="day-num">{Number(day.iso.slice(8, 10))}</span>
					{#if isToday}
						<span class="day-today-dot" aria-hidden="true"></span>
					{:else if rankNum}
						<span class="day-rank-badge" aria-hidden="true">{rankNum}</span>
					{/if}
					{#if day.name}
						<span class="day-name" title={day.name}>{day.name}</span>
					{/if}
				</a>
			{/each}
		</div>
	</div>
	{/if}

	{/if}
</main>

<style>
	.cal-wrap {
		/* Liturgical color tokens scoped to the calendar page. */
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
		--lit-ferial: #cfc9b9;
		--lit-ferial-ink: #3a3632;

		max-width: 1120px;
		margin-inline: auto;
		padding: 1rem 1rem 4rem;
	}

	.cal-head {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin: 0.5rem 0 1.5rem;
	}
	.cal-head h1 {
		text-align: center;
		font-size: 2.4rem;
		margin: 0;
		color: var(--color-text-primary);
	}
	.rite-subtitle {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		text-align: center;
		font-style: italic;
	}

	.rite-toggle {
		display: inline-flex;
		gap: 0.25rem;
		padding: 0.25rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		box-shadow: inset 0 0 0 1px var(--color-border);
		margin-top: 0.25rem;
	}
	.rite-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 4.5rem;
		padding: 0.4rem 1rem;
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		font-weight: 600;
		letter-spacing: 0.03em;
		color: var(--color-text-secondary);
		text-decoration: none;
		transition: color var(--transition-fast), background var(--transition-fast),
			box-shadow var(--transition-fast);
	}
	.rite-pill:hover:not(.active) {
		color: var(--color-text-primary);
		background: var(--color-bg-elevated);
	}
	.rite-pill.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		box-shadow: var(--shadow-sm);
	}
	.rite-pill:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.diocese-picker {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.diocese-label {
		font-weight: 600;
	}
	.diocese-picker select {
		padding: 0.35rem 0.6rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		color: var(--color-text-primary);
		font: inherit;
		cursor: pointer;
	}
	.diocese-picker select:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.diocese-note {
		margin: 0.25rem 0 0;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		text-align: center;
		max-width: 38rem;
	}

	.wip {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.75rem;
		padding: 3rem 1.5rem;
		background: var(--color-surface);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-md);
		margin-bottom: 1.5rem;
		color: var(--color-text-secondary);
		border: 1px dashed var(--color-border);
	}
	.wip svg {
		color: var(--color-primary);
		opacity: 0.75;
	}
	.wip h2 {
		margin: 0;
		font-size: 1.3rem;
		color: var(--color-text-primary);
	}
	.wip p {
		margin: 0;
		max-width: 36ch;
		line-height: 1.5;
	}

	.disclaimer {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		margin-bottom: 1.25rem;
		background: var(--color-surface);
		border-left: 3px solid var(--color-primary);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-sm, var(--shadow-md));
		color: var(--color-text-secondary);
		font-size: 0.9rem;
		line-height: 1.45;
	}
	.disclaimer svg {
		flex-shrink: 0;
		margin-top: 0.15rem;
		color: var(--color-primary);
	}
	.disclaimer strong {
		display: block;
		color: var(--color-text-primary);
		font-weight: 600;
		margin-bottom: 0.2rem;
	}
	.disclaimer p {
		margin: 0;
	}

	/* ====== View switcher + color legend ====== */
	.overview-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}
	.view-switcher {
		display: inline-flex;
		background: var(--color-surface);
		border-radius: var(--radius-pill);
		padding: 0.25rem;
		box-shadow: var(--shadow-sm);
	}
	.view-switcher button {
		background: none;
		border: 0;
		cursor: pointer;
		font: inherit;
		font-size: 0.88rem;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-pill);
		color: var(--color-text-secondary);
		transition: background var(--transition-normal), color var(--transition-normal),
			transform var(--transition-fast);
	}
	.view-switcher button:hover {
		color: var(--color-text-primary);
	}
	.view-switcher button.active {
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		box-shadow: var(--shadow-sm);
	}
	.view-switcher button:active {
		transform: scale(0.95);
	}
	.overview-right {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: flex-end;
	}
	.legend {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}
	.legend .swatch {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.3rem 0.7rem;
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		box-shadow: var(--shadow-sm);
		font-size: 0.78rem;
		color: var(--color-text-secondary);
	}
	.legend .swatch .sq {
		width: 12px;
		height: 12px;
		border-radius: 4px;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.ring-stage {
		margin-top: 0.5rem;
	}

	.month-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin: 1rem 0 0.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}
	.month-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		flex: 1;
	}
	.month-title {
		font-size: 2.25rem;
		margin: 0;
		color: var(--color-text-primary);
		text-align: center;
		font-weight: 700;
		line-height: 1.1;
	}
	.month-sub {
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.22em;
		font-weight: 500;
	}
	.nav-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--color-surface);
		color: var(--color-text-primary);
		box-shadow: var(--shadow-sm);
		transition: transform var(--transition-fast), box-shadow var(--transition-normal),
			background var(--transition-normal);
	}
	.nav-btn:hover {
		transform: scale(1.05);
		background: var(--color-bg-elevated);
		box-shadow: var(--shadow-hover);
	}

	.jump-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.9rem;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		box-shadow: var(--shadow-sm);
		transition: background var(--transition-fast), transform var(--transition-fast),
			box-shadow var(--transition-fast);
	}
	.jump-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
		transform: scale(1.03);
		box-shadow: var(--shadow-hover);
	}
	.jump-btn-gold {
		background: var(--lit-gold);
		color: var(--lit-gold-ink);
		font-weight: 600;
	}
	.jump-btn-gold:hover {
		background: var(--lit-gold);
		color: var(--lit-gold-ink);
		filter: brightness(1.08);
	}

	.grid {
		background: transparent;
	}
	.grid-header {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 0.6rem;
		background: transparent;
		border-top: 1px solid var(--color-border);
		margin-bottom: 0.6rem;
	}
	.wd-cell {
		padding: 0.7rem 0.3rem 0.3rem;
		text-align: center;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.18em;
	}
	.wd-cell:last-child {
		color: var(--lit-violet);
	}
	.grid-body {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 0.6rem;
		background: transparent;
	}

	.day-cell {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		min-height: 5.8rem;
		padding: 0.85rem 0.85rem;
		border-radius: var(--radius-lg);
		background: var(--lit-ferial);
		color: var(--lit-ferial-ink);
		text-decoration: none;
		box-shadow: var(--shadow-sm);
		transition: transform var(--transition-fast), box-shadow var(--transition-fast);
	}
	.day-cell.blank {
		background: transparent;
		box-shadow: none;
		pointer-events: none;
	}
	.day-cell:not(.blank):hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-hover);
	}
	.day-num {
		font-size: 1.45rem;
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.02em;
	}
	.day-name {
		font-size: 0.8rem;
		line-height: 1.2;
		font-weight: 600;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		margin-top: auto;
	}
	.day-cell.rank-low .day-name {
		font-weight: 500;
		opacity: 0.85;
	}

	.day-today-dot {
		position: absolute;
		top: 0.75rem;
		right: 0.85rem;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--lit-gold);
		box-shadow: 0 0 0 2px rgba(212, 175, 74, 0.28);
	}
	.day-rank-badge {
		position: absolute;
		top: 0.65rem;
		right: 0.7rem;
		min-width: 20px;
		height: 20px;
		padding: 0 5px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: Georgia, 'Times New Roman', serif;
		font-style: italic;
		font-size: 0.68rem;
		font-weight: 600;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.12);
		color: currentColor;
		opacity: 0.7;
	}

	.day-cell.today {
		outline: 2px solid var(--lit-gold);
		outline-offset: -2px;
	}
	.day-cell.selected:not(.today) {
		outline: 2px solid var(--color-primary);
		outline-offset: -2px;
		z-index: 1;
	}

	@media (max-width: 560px) {
		.cal-wrap {
			padding: 0.5rem 0.5rem 3rem;
		}
		.cal-head h1 {
			font-size: 1.8rem;
		}
		.month-title {
			font-size: 1.6rem;
		}
		.nav-btn {
			width: 38px;
			height: 38px;
		}
		.grid-header,
		.grid-body {
			gap: 0.4rem;
		}
		.day-cell {
			min-height: 4.2rem;
			padding: 0.55rem 0.55rem;
			border-radius: var(--radius-md);
			gap: 0.3rem;
		}
		.day-num {
			font-size: 1.1rem;
		}
		.day-name {
			font-size: 0.66rem;
			-webkit-line-clamp: 2;
			line-clamp: 2;
		}
		.day-today-dot {
			width: 8px;
			height: 8px;
			top: 0.5rem;
			right: 0.55rem;
		}
		.day-rank-badge {
			top: 0.45rem;
			right: 0.45rem;
			min-width: 16px;
			height: 16px;
			font-size: 0.58rem;
			padding: 0 3px;
		}
		.wd-cell {
			font-size: 0.64rem;
			padding: 0.5rem 0.15rem 0.3rem;
			letter-spacing: 0.12em;
		}
	}

	@media (max-width: 410px) {
		.day-name {
			display: none;
		}
		.day-cell {
			min-height: 3.4rem;
			padding: 0.45rem;
		}
		.day-num {
			font-size: 1rem;
		}
	}
</style>
