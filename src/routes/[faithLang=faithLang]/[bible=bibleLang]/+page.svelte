<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import Seo from '$lib/components/Seo.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import PlanStreak from '$lib/components/faith/bible/PlanStreak.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import { CANON_BY_TESTAMENT, bookName } from '$lib/faith/bibleCanon';
	import { localDateStr } from '$lib/js/localDate';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);
	const available = $derived(new Set(data.books.map((b) => b.slug)));
	const chaptersOf = $derived(new Map(data.books.map((b) => [b.slug, b.chapters])));
	const planHref = $derived(resolve('/[faithLang=faithLang]/[bible=bibleLang]/plan', { faithLang: data.faithLang, bible: data.bibleLang }));
	const patresHref = $derived(resolve('/[faithLang=faithLang]/[bible=bibleLang]/patres', { faithLang: data.faithLang, bible: data.bibleLang }));
	const readTotal = $derived(data.progress ? Object.values(data.progress).reduce((a, b) => a + b, 0) : 0);

	async function resetBook(slug: string) {
		const n = data.progress?.[slug] ?? 0;
		if (!(await confirm(`${bookName(slug, lang)}: ${n} ${t.bible_plan_reset_confirm}`, { confirmText: t.bible_plan_delete, cancelText: t.bible_close, destructive: true }))) return;
		const res = await fetch(`/api/${data.faithLang}/bibel/gelesen`, {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ scope: 'book', slug, today: localDateStr() })
		});
		if (res.ok) await invalidateAll();
	}
	// A book's name leads to its own page (the introduction); the plan's "read now" to a chapter.
	const href = (slug: string, chapter?: number) =>
		resolve('/[faithLang=faithLang]/[bible=bibleLang]/[book]/[[chapter]]', {
			faithLang: data.faithLang,
			bible: data.bibleLang,
			book: slug,
			chapter: chapter === undefined ? undefined : String(chapter)
		});
</script>

<Seo title={`${t.bible_title} — Bocken`} description={t.bible_description} {lang} />

<section class="bible-index">
	<h1>{t.bible_title}</h1>
	<p class="lede">{t.bible_description}</p>

	{#if data.planView}
		<div class="plan-top">
			<PlanStreak streak={data.planView.streak} days={data.planView.days} today={data.planView.today} {lang} />
			{#if data.planView.next}
				<a class="read-now" href={href(data.planView.next.slug, data.planView.next.ch)}>{t.bible_plan_read_now}: {bookName(data.planView.next.slug, lang)} {data.planView.next.ch} ›</a>
			{:else}
				<span class="done-note">{t.bible_plan_day_done}</span>
			{/if}
			<p class="plan-link">
				<a href={planHref}>{t.bible_plan_open} ›</a>
				{#if readTotal > 0}<span>{readTotal} {t.bible_plan_chapters_read}</span>{/if}
			</p>
		</div>
	{:else if data.progress}
		<p class="plan-link">
			<a href={planHref}>{t.bible_plan_begin_link} ›</a>
			{#if readTotal > 0}<span>{readTotal} {t.bible_plan_chapters_read}</span>{/if}
		</p>
	{/if}

	{#each [['ot', t.bible_old_testament], ['nt', t.bible_new_testament]] as [test, label] (test)}
		<h2>{label}</h2>
		<ul class="books">
			{#each CANON_BY_TESTAMENT[test as 'ot' | 'nt'] as slug (slug)}
				{#if available.has(slug)}
					{@const read = data.progress?.[slug] ?? 0}
					{@const total = chaptersOf.get(slug) ?? 0}
					<li class:tracked={!!data.progress}>
						<a href={href(slug)}>
							{bookName(slug, lang)}
							{#if data.progress}
								<span class="count" class:full={read >= total && total > 0}>{read} / {total}</span>
								<span class="bar" aria-hidden="true"><span class="fill" style="width: {total ? (100 * read) / total : 0}%"></span></span>
							{/if}
						</a>
						{#if read > 0}
							<button class="reset" onclick={() => resetBook(slug)} title="{bookName(slug, lang)} {t.bible_plan_reset_book}" aria-label="{bookName(slug, lang)} {t.bible_plan_reset_book}">×</button>
						{/if}
					</li>
				{:else}
					<li class="soon"><span title={t.bible_not_available}>{bookName(slug, lang)}</span></li>
				{/if}
			{/each}
		</ul>
	{/each}

	<p class="patres-link"><a href={patresHref}>{t.bible_fathers_index} ›</a></p>
</section>

<style>
	.bible-index { max-width: 60rem; margin: 0 auto; padding: 1rem 1.25rem 3rem; }
	h1 { text-align: center; font-size: 2.6em; margin: 0.5em 0 0.2em; }
	.lede { max-width: 600px; margin: 0 auto 2rem; text-align: center; font-size: 1.05em; color: var(--color-text-secondary); }
	h2 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; color: var(--color-text-secondary); font-weight: 600; }
	.books { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: 0.25rem 1rem; }
	.books a { display: block; padding: 0.4rem 0.5rem; border-radius: var(--radius-sm); color: var(--color-text-primary); text-decoration: none; }
	.books a:hover { background: color-mix(in srgb, var(--red) 11%, transparent); color: var(--red); }
	.books .soon span { display: block; padding: 0.4rem 0.5rem; opacity: 0.4; }
	.plan-link { text-align: center; margin: -1rem 0 2rem; font-size: 0.95rem; display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap; }
	.plan-top { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin: -0.5rem 0 2.5rem; }
	.plan-top .plan-link { margin: 0; }
	.read-now { display: inline-block; padding: 0.65rem 1.3rem; border-radius: var(--radius-pill); background: var(--red); color: white; text-decoration: none; font-weight: 600; }
	.read-now:hover { filter: brightness(1.08); }
	.done-note { color: var(--green); font-size: 0.95rem; }
	.plan-link a { color: var(--red); text-decoration: none; font-weight: 600; }
	.plan-link span { color: var(--color-text-secondary); }
	.patres-link { text-align: center; margin: 2.5rem 0 0; font-size: 0.95rem; }
	.patres-link a { color: var(--red); text-decoration: none; font-weight: 600; }
	.books li.tracked { position: relative; }
	.books li.tracked a { padding-right: 1.6rem; display: grid; grid-template-columns: 1fr auto; align-items: baseline; column-gap: 0.5rem; }
	.books .count { font-size: 0.72rem; color: var(--color-text-tertiary); font-variant-numeric: tabular-nums; }
	.books .count.full { color: var(--green); }
	.books .bar { grid-column: 1 / -1; display: block; height: 3px; border-radius: 2px; background: var(--color-bg-tertiary); overflow: hidden; margin-top: 0.25rem; }
	.books .fill { display: block; height: 100%; background: var(--red); }
	.books .reset { position: absolute; top: 0.35rem; right: 0.2rem; width: 1.3rem; height: 1.3rem; border: 0; background: none; color: var(--color-text-tertiary); font-size: 0.95rem; line-height: 1; cursor: pointer; border-radius: 50%; opacity: 0; }
	.books li.tracked:hover .reset, .books .reset:focus-visible { opacity: 1; }
	.books .reset:hover { color: var(--red); background: color-mix(in srgb, var(--red) 11%, transparent); }
	@media (hover: none) { .books .reset { opacity: 0.6; } }
</style>
