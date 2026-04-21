<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import {
		formatLongDate,
		getMonthName,
		hexFor,
		humanizePsalterWeek,
		humanizeSundayCycle,
		properLabel,
		t,
		t1962,
		type CalendarLang
	} from '../../../../../calendarI18n';

	function kindLabel(kind: 'tempora' | 'sancti', l: CalendarLang): string {
		if (kind === 'tempora')
			return l === 'de' ? 'Temporale' : l === 'la' ? 'Temporale' : 'Temporal';
		return l === 'de' ? 'Sanktorale' : l === 'la' ? 'Sanctorale' : 'Sanctoral';
	}
	import { litBg, litInk } from '../../../../../calendarColors';

	let { data }: { data: PageData } = $props();

	const lang = $derived(data.lang as CalendarLang);
	const rite = $derived(data.rite);
	const day = $derived(data.day1);
	const year = $derived(data.year);
	const month = $derived(data.month);
	const iso = $derived(data.iso);
	const todayIso = $derived(data.todayIso);

	const dayHex = $derived(hexFor(day.colorKeys));

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

	const isToday = $derived(iso === todayIso);
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

	<header
		class="detail-hero"
		style="background: {litBg(day.colorKeys[0])}; color: {litInk(day.colorKeys[0])}; --accent: {dayHex}"
	>
		<div class="hero-date">
			{formatLongDate(iso, lang)}
			{#if isToday}
				<span class="today-pip">{t('today', lang)}</span>
			{/if}
		</div>
		<h1 class="hero-name">{day.name}</h1>
		<div class="hero-tags">
			{#if day.rankName}
				<span class="tag tag-rank">{day.rankName}</span>
			{/if}
			{#if day.seasonNames.length}
				<span class="tag tag-season">{day.seasonNames[0]}</span>
			{/if}
			{#if day.colorNames.length}
				<span class="tag tag-color">
					<span class="color-swatch" style="background: {dayHex}"></span>
					{day.colorNames[0]}
				</span>
			{/if}
			{#if day.psalterWeek}
				<span class="tag">{t('psalterWeek', lang)}: {humanizePsalterWeek(day.psalterWeek, lang)}</span>
			{/if}
			{#if day.sundayCycle}
				<span class="tag">{t('cycle', lang)}: {humanizeSundayCycle(day.sundayCycle)}</span>
			{/if}
		</div>
	</header>

	{#if day.rite1962}
		{@const d = day.rite1962}
		<section class="detail" style="--accent: {dayHex}">
			<dl class="detail-extras">
				<div>
					<dt>{t1962('source', lang)}</dt>
					<dd>{kindLabel(d.kind, lang)}</dd>
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
			{#if d.commemorations.length}
				<div class="commems">
					<h4>{t1962('commemorations', lang)}</h4>
					<ul>
						{#each d.commemorations as c (c.id)}
							<li>
								<span class="commem-name">{c.name}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			{#if d.stationChurches?.length}
				<div class="stations">
					<h4>{t1962('stationChurch', lang)}</h4>
					<ul>
						{#each d.stationChurches as s (s.key + (s.mass ?? ''))}
							<li>
								<span class="station-name">{s.name}</span>
								{#if s.mass}
									<span class="station-mass">{s.mass.replace(/_/g, ' ')}</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			{#if d.propers.length}
				<section class="propers">
					<h4>{t1962('propers', lang)}</h4>
					{#each d.propers as section (section.key)}
						{@const rows = Math.max(section.la.length, section.local.length)}
						<div class="proper-block">
							<div class="proper-label-row">
								<span class="proper-label">{properLabel(section.key, lang)}</span>
							</div>
							{#each Array(rows) as _, i (i)}
								{@const la = section.la[i] ?? ''}
								{@const local = section.local[i] ?? ''}
								{#if la || local}
									<div class="proper-segment">
										<div class="proper-cols" class:single={lang === 'la' || !local}>
											{#if la}
												<div class="proper-col proper-col-la" lang="la">{la}</div>
											{/if}
											{#if lang !== 'la' && local}
												<div class="proper-col proper-col-local" lang={lang}>{local}</div>
											{/if}
										</div>
									</div>
								{/if}
							{/each}
						</div>
					{/each}
				</section>
			{/if}
		</section>
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

	.detail-hero {
		border-radius: var(--radius-card);
		padding: 1.5rem 1.75rem;
		box-shadow: var(--shadow-md);
	}
	.hero-date {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-sm);
		opacity: 0.85;
		margin-bottom: 0.25rem;
	}
	.today-pip {
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 700;
		padding: 3px 8px;
		border-radius: 100px;
		background: rgba(0, 0, 0, 0.12);
	}
	.hero-name {
		margin: 0 0 0.75rem;
		font-size: 2rem;
		line-height: 1.2;
	}
	.hero-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.7rem;
		background: rgba(0, 0, 0, 0.14);
		color: inherit;
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.tag-rank {
		background: rgba(0, 0, 0, 0.22);
		font-weight: 600;
	}
	.color-swatch {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.4);
		display: inline-block;
	}

	.detail {
		background: var(--color-surface);
		border-radius: var(--radius-card);
		padding: 1.25rem 1.5rem;
		margin-top: 1.25rem;
		box-shadow: var(--shadow-sm);
		border-left: 4px solid var(--accent);
	}

	.detail-extras {
		margin: 0 0 0.5rem;
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
	.commems h4,
	.stations h4,
	.propers h4 {
		margin: 0.5rem 0 0.4rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
		font-weight: 600;
	}
	.commems,
	.stations {
		margin-top: 0.75rem;
	}
	.commems ul,
	.stations ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.commems li,
	.stations li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-sm, 6px);
		font-size: 0.85rem;
	}
	.commem-name,
	.station-name {
		flex: 1 1 auto;
		color: var(--color-text-primary);
	}
	.station-name {
		font-style: italic;
	}
	.station-mass {
		color: var(--color-text-tertiary);
		font-size: 0.78rem;
		text-transform: capitalize;
	}

	.propers {
		margin-top: 1rem;
		border-top: 1px solid var(--color-border);
		padding-top: 0.75rem;
	}
	.proper-block {
		margin-bottom: 0.75rem;
	}
	.proper-label-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.25rem;
	}
	.proper-label {
		font-weight: 600;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
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
		column-gap: 0.75rem;
		row-gap: 0;
		align-items: start;
	}
	.proper-col-la {
		grid-column: 1;
		font-style: italic;
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
		font-size: 0.92rem;
		line-height: 1.5;
		color: var(--color-text-primary);
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
	@media (max-width: 560px) {
		.detail-hero {
			padding: 1.15rem 1.2rem;
		}
		.hero-name {
			font-size: 1.5rem;
		}
	}
</style>
