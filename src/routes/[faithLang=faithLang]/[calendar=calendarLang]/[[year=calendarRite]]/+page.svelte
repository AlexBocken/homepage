<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import {
		getMonthName,
		getWeekdayShort,
		formatLongDate,
		hexFor,
		rankEmphasis,
		humanizePsalterWeek,
		humanizeSundayCycle,
		t,
		t1962,
		properLabel,
		type CalendarLang
	} from '../calendarI18n';

	let { data }: { data: PageData } = $props();

	const lang = $derived(data.lang as CalendarLang);

	const year = $derived(data.year);
	const month = $derived(data.month);
	const monthDays = $derived(data.monthDays);
	const today = $derived(data.today);
	const todayIso = $derived(data.todayIso);
	const selected = $derived(data.selected);
	const selectedIso = $derived(data.selectedIso);

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

	function dayHref(iso: string) {
		return `?y=${year}&m=${month}&d=${iso}`;
	}

	function monthHref(y: number, m: number) {
		return `?y=${y}&m=${m}`;
	}

	const todayHref = $derived.by(() => {
		const now = new Date();
		return `?y=${now.getFullYear()}&m=${now.getMonth()}&d=${todayIso}`;
	});

	const pageTitle = $derived(t('calendar', lang));

	const rite = $derived(data.rite);
	const wip = $derived(data.wip);
	const riteSubtitle = $derived(t(rite === '1962' ? 'rite1962Long' : 'rite1969Long', lang));

	function firstOr(arr: string[], fallback = ''): string {
		return arr && arr.length ? arr[0] : fallback;
	}

	const calendarBase = $derived(
		page.url.pathname.replace(/\/(1962|1969)\/?$/, '').replace(/\/$/, '')
	);

	function riteHref(r: '1969' | '1962') {
		const seg = r === '1962' ? '' : '/1969';
		const params = new URLSearchParams();
		params.set('y', String(year));
		params.set('m', String(month));
		if (selectedIso) params.set('d', selectedIso);
		return `${calendarBase}${seg}?${params.toString()}`;
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
				aria-selected={rite === '1969'}
				class="rite-pill"
				class:active={rite === '1969'}
				href={riteHref('1969')}
			>
				1969
			</a>
			<a
				role="tab"
				aria-selected={rite === '1962'}
				class="rite-pill"
				class:active={rite === '1962'}
				href={riteHref('1962')}
			>
				1962
			</a>
		</div>
	</header>

	{#if wip}
		<section class="wip">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8v4"/><path d="M12 16h.01"/><circle cx="12" cy="12" r="10"/></svg>
			<h2>{t('wipTitle', lang)}</h2>
			<p>{t('wipBody', lang)}</p>
		</section>
	{:else}
	{#if rite === '1962'}
		<aside class="disclaimer" role="note">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
			<div>
				<strong>{t('rite1962DisclaimerTitle', lang)}</strong>
				<p>{t('rite1962DisclaimerBody', lang)}</p>
			</div>
		</aside>
	{/if}
	{#if today}
		{@const todayHex = hexFor(today.colorKeys)}
		<section class="today-hero" style="--accent: {todayHex}">
			<div class="today-meta">
				<span class="today-label">{t('today', lang)}</span>
				<span class="today-date">{formatLongDate(today.iso, lang)}</span>
			</div>
			<h2 class="today-name">{today.name}</h2>
			<div class="today-tags">
				{#if today.seasonNames.length}
					<span class="tag tag-season">{firstOr(today.seasonNames)}</span>
				{/if}
				{#if today.rankName}
					<span class="tag tag-rank">{today.rankName}</span>
				{/if}
				{#if today.colorNames.length}
					<span class="tag tag-color">
						<span class="color-swatch" style="background: {todayHex}"></span>
						{firstOr(today.colorNames)}
					</span>
				{/if}
				{#if today.psalterWeek}
					<span class="tag">{t('psalterWeek', lang)}: {humanizePsalterWeek(today.psalterWeek, lang)}</span>
				{/if}
				{#if today.sundayCycle}
					<span class="tag">{t('cycle', lang)}: {humanizeSundayCycle(today.sundayCycle)}</span>
				{/if}
			</div>
		</section>
	{/if}

	<nav class="month-nav" aria-label={monthTitle}>
		<a
			class="nav-btn"
			href={monthHref(prevMonth.y, prevMonth.m)}
			aria-label={t('prev', lang)}
			data-sveltekit-noscroll
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
		</a>
		<h2 class="month-title">{monthTitle}</h2>
		<a
			class="nav-btn"
			href={monthHref(nextMonth.y, nextMonth.m)}
			aria-label={t('next', lang)}
			data-sveltekit-noscroll
		>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
		</a>
	</nav>

	<div class="today-jump-row">
		<a class="jump-btn" href={todayHref} data-sveltekit-noscroll>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
			{t('jumpToToday', lang)}
		</a>
	</div>

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
				{@const dayHex = hexFor(day.colorKeys)}
				<a
					class="day-cell"
					class:today={isToday}
					class:selected={isSelected}
					class:rank-high={rank === 3}
					class:rank-mid={rank === 2}
					class:rank-low={rank === 1}
					href={dayHref(day.iso)}
					style="--day-color: {dayHex}"
					data-sveltekit-noscroll
					data-sveltekit-replacestate
				>
					<span class="day-num">{Number(day.iso.slice(8, 10))}</span>
					<span class="day-color-dot" aria-hidden="true"></span>
					{#if day.name}
						<span class="day-name" title={day.name}>{day.name}</span>
					{/if}
				</a>
			{/each}
		</div>
	</div>

	{#if selected}
		{@const selectedHex = hexFor(selected.colorKeys)}
		<section class="detail" style="--accent: {selectedHex}" aria-live="polite">
			<div class="detail-head">
				<span class="detail-date">{formatLongDate(selected.iso, lang)}</span>
				{#if selected.rankName}
					<span class="tag tag-rank">{selected.rankName}</span>
				{/if}
			</div>
			<h3 class="detail-name">{selected.name}</h3>
			<div class="detail-tags">
				{#if selected.seasonNames.length}
					<span class="tag tag-season">{firstOr(selected.seasonNames)}</span>
				{/if}
				{#if selected.colorNames.length}
					<span class="tag tag-color">
						<span class="color-swatch" style="background: {selectedHex}"></span>
						{firstOr(selected.colorNames)}
					</span>
				{/if}
				{#if selected.psalterWeek}
					<span class="tag">{t('psalterWeek', lang)}: {humanizePsalterWeek(selected.psalterWeek, lang)}</span>
				{/if}
				{#if selected.sundayCycle}
					<span class="tag">{t('cycle', lang)}: {humanizeSundayCycle(selected.sundayCycle)}</span>
				{/if}
			</div>
			{#if selected.rite1962}
				{@const d = selected.rite1962}
				<dl class="detail-extras">
					<div>
						<dt>{t1962('source', lang)}</dt>
						<dd>{d.kind}{d.properSource ? ` · ${d.properSource}` : ''}{d.communeSlug ? ` (${d.communeSlug})` : ''}</dd>
					</div>
					{#if d.vigilOf}
						<div>
							<dt>{t1962('vigilOf', lang)}</dt>
							<dd>{d.vigilOf}</dd>
						</div>
					{/if}
					{#if d.octave}
						<div>
							<dt>{t1962('octave', lang)}</dt>
							<dd>{d.octave.id} · {t1962('octaveDay', lang)} {d.octave.day} · {d.octave.rank}</dd>
						</div>
					{/if}
					{#if d.transferredFrom}
						<div>
							<dt>{t1962('transferredFrom', lang)}</dt>
							<dd>{d.transferredFrom}</dd>
						</div>
					{/if}
				</dl>
				<div class="rubrics-grid">
					<h4>{t1962('rubrics', lang)}</h4>
					<div class="rubric-row">
						<span class="rubric-chip" class:on={d.rubrics.gloria}>{t1962('gloria', lang)}: {d.rubrics.gloria ? t1962('yes', lang) : t1962('no', lang)}</span>
						<span class="rubric-chip" class:on={d.rubrics.credo}>{t1962('credo', lang)}: {d.rubrics.credo ? t1962('yes', lang) : t1962('no', lang)}</span>
						{#if d.rubrics.preface}
							<span class="rubric-chip on">{t1962('preface', lang)}: {d.rubrics.preface}</span>
						{/if}
						{#if d.rubrics.lastGospel}
							<span class="rubric-chip on">{t1962('lastGospel', lang)}: {d.rubrics.lastGospel}</span>
						{/if}
						{#if d.rubrics.ite}
							<span class="rubric-chip on">{t1962('ite', lang)}: {d.rubrics.ite}</span>
						{/if}
					</div>
				</div>
				{#if d.commemorations.length}
					<div class="commems">
						<h4>{t1962('commemorations', lang)}</h4>
						<ul>
							{#each d.commemorations as c (c.key)}
								{@const cHex = hexFor(c.colorKeys)}
								<li>
									<span class="color-swatch" style="background: {cHex}"></span>
									<span class="commem-name">{c.name}</span>
									<span class="commem-rank">{c.rankName}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if d.propers.length}
					<section class="propers">
						<h4>{t1962('propers', lang)}</h4>
						{#each d.propers as section (section.key)}
							<div class="proper-block">
								<div class="proper-label">{properLabel(section.key, lang)}</div>
								<div class="proper-cols" class:single={lang === 'la' || !section.local}>
									<div class="proper-col proper-col-la" lang="la">{section.la}</div>
									{#if lang !== 'la' && section.local}
										<div class="proper-col proper-col-local" lang={lang}>{section.local}</div>
									{/if}
								</div>
							</div>
						{/each}
					</section>
				{/if}
				{#if d.extraSections.length}
					<section class="propers">
						<h4>{t1962('extraSections', lang)}</h4>
						{#each d.extraSections as section (section.key)}
							<div class="proper-block">
								<div class="proper-label">{properLabel(section.key, lang)}</div>
								<div class="proper-cols" class:single={lang === 'la' || !section.local}>
									<div class="proper-col proper-col-la" lang="la">{section.la}</div>
									{#if lang !== 'la' && section.local}
										<div class="proper-col proper-col-local" lang={lang}>{section.local}</div>
									{/if}
								</div>
							</div>
						{/each}
					</section>
				{/if}
			{/if}
		</section>
	{/if}
	{/if}
</main>

<style>
	.cal-wrap {
		max-width: 1000px;
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

	/* --- Rite toggle (segmented pill) --- */
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

	/* --- WIP placeholder --- */
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

	/* --- 1962 accuracy disclaimer --- */
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

	/* --- Today hero --- */
	.today-hero {
		position: relative;
		background: var(--color-surface);
		border-radius: var(--radius-card);
		padding: 1.5rem 1.75rem;
		margin-bottom: 1.5rem;
		box-shadow: var(--shadow-md);
		border-left: 6px solid var(--accent);
		overflow: hidden;
	}
	.today-hero::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, var(--accent) 0%, transparent 40%);
		opacity: 0.08;
		pointer-events: none;
	}
	.today-meta {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}
	.today-label {
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--accent);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.today-date {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.today-name {
		font-size: clamp(1.3rem, 3vw, 1.8rem);
		margin: 0 0 0.75rem;
		color: var(--color-text-primary);
		line-height: 1.2;
	}
	.today-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.7rem;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.tag-season {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.tag-rank {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.color-swatch {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1px solid var(--color-border);
		display: inline-block;
	}

	/* --- Month nav --- */
	.month-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}
	.month-title {
		font-size: 1.5rem;
		margin: 0;
		color: var(--color-text-primary);
		text-align: center;
		flex: 1;
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

	.today-jump-row {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
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
		transition: background var(--transition-fast), transform var(--transition-fast);
	}
	.jump-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
		transform: scale(1.03);
	}

	/* --- Grid --- */
	.grid {
		background: var(--color-surface);
		border-radius: var(--radius-card);
		overflow: hidden;
		box-shadow: var(--shadow-md);
	}
	.grid-header {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		background: var(--color-bg-elevated);
	}
	.wd-cell {
		padding: 0.5rem;
		text-align: center;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.grid-body {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 1px;
		background: var(--color-border);
	}

	.day-cell {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-height: 5.5rem;
		padding: 0.4rem 0.45rem;
		background: var(--color-surface);
		color: var(--color-text-primary);
		text-decoration: none;
		transition: background var(--transition-fast);
		overflow: hidden;
	}
	.day-cell.blank {
		background: var(--color-bg-secondary);
	}
	.day-cell:not(.blank):hover {
		background: var(--color-bg-elevated);
	}
	.day-num {
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1;
		color: var(--color-text-secondary);
	}
	.day-color-dot {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--day-color);
		box-shadow: 0 0 0 1px var(--color-border);
	}
	.day-name {
		font-size: 0.72rem;
		line-height: 1.15;
		color: var(--color-text-tertiary);
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
	}

	.day-cell.rank-high .day-name {
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.day-cell.rank-mid .day-name {
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.day-cell.rank-low .day-name {
		color: var(--color-text-secondary);
	}

	.day-cell.today {
		background: var(--color-bg-elevated);
	}
	.day-cell.today .day-num {
		color: var(--color-primary);
		font-weight: 800;
	}
	.day-cell.today .day-num::before {
		content: '';
		display: inline-block;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--color-primary);
		vertical-align: middle;
		position: absolute;
		top: 0.3rem;
		left: 0.3rem;
		z-index: 0;
		opacity: 0.15;
	}

	.day-cell.selected {
		outline: 2px solid var(--color-primary);
		outline-offset: -2px;
		z-index: 1;
	}

	/* --- Detail panel --- */
	.detail {
		background: var(--color-surface);
		border-radius: var(--radius-card);
		padding: 1.25rem 1.5rem;
		margin-top: 1.5rem;
		box-shadow: var(--shadow-md);
		border-left: 4px solid var(--accent);
	}
	.detail-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}
	.detail-date {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.detail-name {
		font-size: 1.3rem;
		margin: 0 0 0.75rem;
		color: var(--color-text-primary);
		line-height: 1.25;
	}
	.detail-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.detail-extras {
		margin: 1rem 0 0.5rem;
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
	.rubrics-grid {
		margin-top: 0.75rem;
	}
	.rubrics-grid h4,
	.commems h4 {
		margin: 0.5rem 0 0.4rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
		font-weight: 600;
	}
	.rubric-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.rubric-chip {
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.78rem;
		border: 1px solid var(--color-border);
	}
	.rubric-chip.on {
		background: color-mix(in srgb, var(--accent) 15%, var(--color-bg-tertiary));
		color: var(--color-text-primary);
		border-color: color-mix(in srgb, var(--accent) 30%, var(--color-border));
	}
	.commems {
		margin-top: 0.75rem;
	}
	.commems ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.commems li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-sm, 6px);
		font-size: 0.85rem;
	}
	.commem-name {
		flex: 1 1 auto;
		color: var(--color-text-primary);
	}
	.commem-rank {
		font-size: 0.72rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.propers {
		margin-top: 1rem;
		border-top: 1px solid var(--color-border);
		padding-top: 0.75rem;
	}
	.propers h4 {
		margin: 0 0 0.6rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
		font-weight: 600;
	}
	.proper-block {
		margin-bottom: 0.75rem;
	}
	.proper-label {
		font-weight: 600;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		margin-bottom: 0.2rem;
	}
	.proper-cols {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	.proper-cols.single {
		grid-template-columns: 1fr;
	}
	.proper-col {
		white-space: pre-wrap;
		font-size: 0.92rem;
		line-height: 1.5;
		color: var(--color-text-primary);
	}
	.proper-col-la {
		font-style: italic;
		color: var(--color-text-primary);
	}
	.proper-col-local {
		color: var(--color-text-primary);
	}
	@media (max-width: 640px) {
		.proper-cols {
			grid-template-columns: 1fr;
		}
	}

	/* --- Responsive --- */
	@media (max-width: 560px) {
		.cal-wrap {
			padding: 0.5rem 0.5rem 3rem;
		}
		.cal-head h1 {
			font-size: 1.8rem;
		}
		.today-hero {
			padding: 1.1rem 1.1rem;
		}
		.month-title {
			font-size: 1.2rem;
		}
		.nav-btn {
			width: 38px;
			height: 38px;
		}
		.day-cell {
			min-height: 4.2rem;
			padding: 0.3rem 0.3rem;
		}
		.day-num {
			font-size: 0.85rem;
		}
		.day-name {
			font-size: 0.6rem;
			-webkit-line-clamp: 2;
		}
		.day-color-dot {
			width: 6px;
			height: 6px;
			top: 0.35rem;
			right: 0.35rem;
		}
		.wd-cell {
			font-size: 0.7rem;
			padding: 0.35rem 0.2rem;
		}
	}

	@media (max-width: 410px) {
		.day-name {
			display: none;
		}
		.day-cell {
			min-height: 3.2rem;
			align-items: center;
			justify-content: center;
		}
		.day-num {
			font-size: 0.9rem;
		}
	}
</style>
