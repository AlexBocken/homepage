<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import Seo from '$lib/components/Seo.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import ActivityGrid from '$lib/components/fitness/ActivityGrid.svelte';
	import PlanSpine from '$lib/components/faith/bible/PlanSpine.svelte';
	import PlanStreak from '$lib/components/faith/bible/PlanStreak.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import { bookName } from '$lib/faith/bibleCanon';
	import { HISTORIA_PERIODS } from '$lib/faith/readingPlanPeriods';
	import { PACES, PLAN_IDS, addDays, daysLeft, planLanes, remainingLanes, wordsPerDay, type PlanId, type ReaderLang } from '$lib/faith/readingPlan';
	import { localDateStr } from '$lib/js/localDate';
	import Check from '@lucide/svelte/icons/check';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);
	const readerLang = $derived<ReaderLang>(lang === 'en' ? 'en' : 'de');
	const plan = $derived(data.state);
	const locale = $derived(lang === 'de' ? 'de-CH' : 'en-GB');

	const planTitle = (id: PlanId) => ({ historia: t.bible_plan_historia, canon: t.bible_plan_canon, 'nt-psalms': t.bible_plan_nt_psalms, nt: t.bible_plan_nt, ot: t.bible_plan_ot })[id];
	const planDesc = (id: PlanId) => ({ historia: t.bible_plan_historia_desc, canon: t.bible_plan_canon_desc, 'nt-psalms': t.bible_plan_nt_psalms_desc, nt: t.bible_plan_nt_desc, ot: t.bible_plan_ot_desc })[id];
	const fmtDate = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
	const abbr = (slug: string) => slug.replace(/[a-zäöü]/, (c) => c.toUpperCase());
	const chapterHref = (slug: string, ch: number) =>
		resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[[chapter]]', { faithLang: data.faithLang, bible: data.bibleLang, book: slug, chapter: String(ch) });
	const indexHref = $derived(resolve('/[faithLang=faithLang]/[bible=bibleLang]', { faithLang: data.faithLang, bible: data.bibleLang }));

	/* ---------- choosing a plan ---------- */
	let minutes = $state(15);
	let credit = $state<Record<string, boolean>>({});
	let busy = $state(false);
	let burst = $state(false);
	const planFacts = $derived(
		PLAN_IDS.map((id) => {
			const lanes = planLanes(id);
			const credited = credit[id] ? (data.alreadyRead?.[id] ?? 0) : 0;
			const total = lanes.flat().length;
			// Days at this pace, with the credited chapters taken off the top of the plan's words.
			const days = Math.max(1, Math.round(daysLeft(remainingLanes(lanes, new Set()), wordsPerDay(minutes, readerLang), readerLang) * (1 - credited / total)));
			return { id, total, days, end: addDays(data.today, days), already: data.alreadyRead?.[id] ?? 0 };
		})
	);

	async function api(path: 'plan' | 'gelesen', method: string, body: Record<string, unknown>) {
		busy = true;
		try {
			const res = await fetch(`/api/${data.faithLang}/bibel/${path}`, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
			if (res.ok) await invalidateAll();
			return res.ok;
		} finally {
			busy = false;
		}
	}
	const start = (id: PlanId) => api('plan', 'POST', { action: 'start', plan: id, minutesPerDay: minutes, today: localDateStr(), creditEarlier: !!credit[id] });
	const setPace = (min: number) => api('plan', 'POST', { action: 'pace', minutesPerDay: min, today: localDateStr() });
	async function finish() {
		if (await confirm(t.bible_plan_finish_confirm, { confirmText: t.bible_plan_finish, cancelText: t.bible_close, destructive: true })) await api('plan', 'POST', { action: 'finish' });
	}
	async function toggleChapter(key: string, read: boolean) {
		const ok = await api('gelesen', read ? 'DELETE' : 'POST', { key, day: localDateStr(), today: localDateStr() });
		if (ok && !read) {
			burst = true;
			setTimeout(() => (burst = false), 300);
		}
	}
	async function reset(scope: 'all' | 'ot' | 'nt') {
		const n = scope === 'all' ? data.record.total : data.record[scope];
		const msg = scope === 'all' ? t.bible_plan_reset_confirm_all : `${n} ${t.bible_plan_reset_confirm}`;
		if (!(await confirm(msg, { confirmText: t.bible_plan_delete, cancelText: t.bible_close, destructive: true }))) return;
		await api('gelesen', 'DELETE', scope === 'all' ? { scope: 'all', today: localDateStr() } : { scope: 'testament', testament: scope, today: localDateStr() });
	}

	const firstUnread = $derived(plan?.today.items.find((i) => !i.read) ?? null);
	const readSet = $derived(new Set(data.days));
	const periodName = (id: string | null) => HISTORIA_PERIODS.find((p) => p.id === id)?.name[lang] ?? '';
</script>

<Seo title={`${t.bible_plan} — ${t.bible_title} — Bocken`} description={t.bible_plan_lede} {lang} />

<section class="plan-page">
	{#if !plan}
		<header class="head">
			<h1>{t.bible_plan}</h1>
			<p class="lede">{t.bible_plan_lede}</p>
		</header>

		<div class="pace" role="group" aria-label={t.bible_plan_pace}>
			<span class="pace-label">{t.bible_plan_pace}</span>
			{#each PACES as p (p)}
				<button class="pill" aria-pressed={minutes === p} onclick={() => (minutes = p)}>{p} {t.bible_plan_min}</button>
			{/each}
			<span class="pace-hint">{t.bible_plan_minutes_day}</span>
		</div>

		<ol class="choices">
			{#each planFacts as f (f.id)}
				<li class="choice">
					<div class="choice-text">
						<h2>{planTitle(f.id)}</h2>
						<p>{planDesc(f.id)}</p>
						{#if f.id === 'historia'}
							<p class="periods">{HISTORIA_PERIODS.map((p) => p.name[lang]).join(' · ')}</p>
						{/if}
						<p class="facts"><span>{f.total} {t.bible_plan_chapters}</span> · <span>{f.days} {t.bible_plan_days}</span> · <span>{t.bible_plan_ends_about} {fmtDate(f.end)}</span></p>
						{#if f.already > 0}
							<div class="credit">
								<Toggle bind:checked={credit[f.id]} label={t.bible_plan_credit_earlier} accentColor="var(--red)" />
								<small>{f.already} {t.bible_plan_credit_hint}</small>
							</div>
						{/if}
					</div>
					<button class="start" disabled={busy} onclick={() => start(f.id)}>{t.bible_plan_start}</button>
				</li>
			{/each}
		</ol>
	{:else}
		<header class="head">
			<p class="kicker">{t.bible_plan} · {data.readerName}</p>
			<h1>{planTitle(plan.id)}</h1>
		</header>

		{#if plan.finished}
			<section class="today done-all">
				<h2>{t.bible_plan_finished}</h2>
				<p>{t.bible_plan_finished_lede}</p>
				<button class="start" disabled={busy} onclick={() => api('plan', 'POST', { action: 'finish' })}>{t.bible_plan_new}</button>
			</section>
		{:else}
			<section class="today" aria-label={t.bible_plan_today}>
				<div class="today-head">
					<h2>{t.bible_plan_today}</h2>
					<span class="target">{plan.minutesPerDay} {t.bible_plan_min}</span>
				</div>
				<ol class="portion">
					{#each plan.today.items as item (item.key)}
						<li class:read={item.read}>
							<button class="tick" aria-pressed={item.read} disabled={busy} onclick={() => toggleChapter(item.key, item.read)} aria-label={item.read ? t.bible_plan_unmark : t.bible_plan_mark}>
								{#if item.read}<Check size={14} strokeWidth={2.6} />{/if}
							</button>
							<a href={chapterHref(item.slug, item.ch)}>{bookName(item.slug, lang)} {item.ch}</a>
							<span class="mins">{item.read ? t.bible_plan_read : `~${item.minutes} ${t.bible_plan_min}`}</span>
						</li>
					{/each}
				</ol>
				{#if plan.today.done}
					<p class="done-note">{t.bible_plan_day_done}</p>
				{:else if firstUnread}
					<a class="read-now" href={chapterHref(firstUnread.slug, firstUnread.ch)}>{t.bible_plan_read_now} ›</a>
				{/if}
			</section>
		{/if}

		<section class="progress" aria-label={t.bible_plan_status}>
			<PlanSpine segments={plan.spine} {lang} />
			<p class="stats">
				<span>{t.bible_plan_day_n} {plan.projection.daysElapsed + 1}</span>
				· <span>{plan.progress.chapters} {t.bible_plan_of} {plan.progress.total} {t.bible_plan_chapters_read}</span>
				{#if !plan.finished}· <span>{t.bible_plan_ends_about} {fmtDate(plan.projection.endDate)}</span>{/if}
			</p>
			{#if plan.id === 'historia' && firstUnread}
				<p class="period-now">{periodName(plan.spine.find((s) => s.slug === firstUnread.slug)?.period ?? null)}</p>
			{/if}
		</section>

		<section class="streak-box">
			<PlanStreak streak={data.streak} days={data.days} today={data.today} {lang} {burst} />
		</section>

		<section class="settings">
			<div class="pace" role="group" aria-label={t.bible_plan_pace}>
				<span class="pace-label">{t.bible_plan_pace}</span>
				{#each PACES as p (p)}
					<button class="pill" aria-pressed={plan.minutesPerDay === p} disabled={busy} onclick={() => setPace(p)}>{p} {t.bible_plan_min}</button>
				{/each}
			</div>
			<button class="quiet" disabled={busy} onclick={finish}>{t.bible_plan_finish}</button>
		</section>

		<section class="calendar" aria-label={t.bible_plan_calendar}>
			<h2>{t.bible_plan_calendar}</h2>
			<ActivityGrid
				start={data.gridStart}
				end={data.today}
				byDate={Object.fromEntries(data.days.map((d) => [d, true]))}
				colorOf={(day, date) => (readSet.has(date) ? 'var(--red)' : date === data.today ? 'var(--color-bg-elevated)' : 'var(--color-bg-tertiary)')}
				labelOf={(day, date) => `${date}${readSet.has(date) ? ` · ${t.bible_plan_read}` : ''}`}
				lang={lang === 'de' ? 'de' : 'en'}
			/>
		</section>
	{/if}

	<section class="record" aria-label={t.bible_plan_status}>
		<h2>{t.bible_plan_status}</h2>
		<p class="stats"><span>{data.record.total} {t.bible_plan_chapters}</span> · <span>{abbr('at') === 'At' ? '' : ''}{t.bible_old_testament} {data.record.ot}</span> · <span>{t.bible_new_testament} {data.record.nt}</span> · <a href={indexHref}>{t.bible_title} ›</a></p>
		{#if data.record.total > 0}
			<div class="resets">
				{#if data.record.ot > 0}<button class="quiet" disabled={busy} onclick={() => reset('ot')}>{t.bible_plan_reset_ot}</button>{/if}
				{#if data.record.nt > 0}<button class="quiet" disabled={busy} onclick={() => reset('nt')}>{t.bible_plan_reset_nt}</button>{/if}
				<button class="quiet danger" disabled={busy} onclick={() => reset('all')}>{t.bible_plan_reset_all}</button>
			</div>
		{/if}
	</section>
</section>

<style>
	.plan-page { --serif: 'Linux Libertine', Georgia, 'Times New Roman', serif; max-width: 44rem; margin: 0 auto; padding: 1rem 1.25rem 4rem; display: flex; flex-direction: column; gap: 2.25rem; }
	.head h1 { font-family: var(--serif); font-weight: 400; font-size: 2.2rem; line-height: 1.15; margin: 0; text-wrap: balance; }
	.kicker { margin: 0 0 0.3rem; font-size: 0.85rem; color: var(--color-text-secondary); }
	.lede { margin: 0.5rem 0 0; max-width: 40rem; color: var(--color-text-secondary); font-size: 1.05rem; line-height: 1.5; }
	h2 { font-size: 1rem; font-weight: 600; margin: 0; }

	/* pace */
	.pace { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
	.pace-label { font-size: 0.85rem; color: var(--color-text-secondary); margin-right: 0.25rem; }
	.pace-hint { font-size: 0.8rem; color: var(--color-text-tertiary); margin-left: 0.25rem; }
	.pill { padding: 0.35rem 0.8rem; border-radius: var(--radius-pill); border: 1px solid var(--color-border); background: none; color: var(--color-text-secondary); font: inherit; font-size: 0.9rem; cursor: pointer; }
	.pill[aria-pressed="true"] { background: var(--color-text-primary); color: var(--color-bg-primary); border-color: var(--color-text-primary); }
	.pill:disabled { opacity: 0.6; cursor: default; }

	/* choosing */
	.choices { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
	.choice { display: flex; gap: 1.5rem; align-items: flex-start; padding: 1.4rem 0; border-top: 1px solid var(--color-border); }
	.choice:last-child { border-bottom: 1px solid var(--color-border); }
	.choice-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.4rem; }
	.choice h2 { font-family: var(--serif); font-weight: 400; font-size: 1.45rem; }
	.choice p { margin: 0; color: var(--color-text-secondary); line-height: 1.5; }
	.periods { font-size: 0.85rem; color: var(--color-text-tertiary); }
	.facts { font-size: 0.85rem; }
	.credit { display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.3rem; }
	.credit small { color: var(--color-text-tertiary); }
	.start { align-self: center; padding: 0.55rem 1.1rem; border-radius: var(--radius-pill); border: 0; background: var(--red); color: white; font: inherit; font-weight: 600; cursor: pointer; white-space: nowrap; }
	.start:hover { filter: brightness(1.08); }
	.start:disabled { opacity: 0.6; cursor: default; }

	/* today */
	.today { padding: 1.25rem 1.4rem; border-radius: var(--radius-lg); background: var(--color-surface); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 0.9rem; }
	.today-head { display: flex; justify-content: space-between; align-items: baseline; }
	.target { font-size: 0.85rem; color: var(--color-text-secondary); }
	.portion { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.55rem; }
	.portion li { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.7rem; }
	.portion a { font-family: var(--serif); font-size: 1.35rem; color: var(--color-text-primary); text-decoration: none; }
	.portion a:hover { color: var(--red); }
	.portion li.read a { color: var(--color-text-tertiary); }
	.mins { font-size: 0.85rem; color: var(--color-text-secondary); white-space: nowrap; }
	.tick { width: 1.5rem; height: 1.5rem; border-radius: 50%; border: 1.5px solid var(--color-border); background: none; color: white; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
	.tick[aria-pressed="true"] { background: var(--red); border-color: var(--red); }
	.read-now { align-self: flex-end; color: var(--red); text-decoration: none; font-weight: 600; }
	.done-note { margin: 0; align-self: flex-end; color: var(--green); font-size: 0.9rem; }
	.done-all p { margin: 0; color: var(--color-text-secondary); }

	/* progress */
	.progress { display: flex; flex-direction: column; gap: 0.7rem; }
	.stats { margin: 0; font-size: 0.9rem; color: var(--color-text-secondary); }
	.stats a { color: var(--red); text-decoration: none; }
	.period-now { margin: 0; font-family: var(--serif); font-size: 1.05rem; color: var(--color-text-secondary); }

	.settings { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; }
	.quiet { background: none; border: 0; padding: 0.3rem 0; color: var(--color-text-secondary); font: inherit; font-size: 0.9rem; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, currentColor 35%, transparent); }
	.quiet:hover { color: var(--color-text-primary); }
	.quiet.danger:hover { color: var(--red); }
	.quiet:disabled { opacity: 0.6; cursor: default; }
	.calendar { display: flex; flex-direction: column; gap: 0.75rem; }
	.record { display: flex; flex-direction: column; gap: 0.5rem; padding-top: 1.5rem; border-top: 1px solid var(--color-border); }
	.resets { display: flex; flex-wrap: wrap; gap: 1.25rem; }

	@media (max-width: 560px) {
		.choice { flex-direction: column; gap: 0.9rem; }
		.start { align-self: flex-start; }
		.portion a { font-size: 1.2rem; }
	}
</style>
