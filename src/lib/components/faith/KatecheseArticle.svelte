<script lang="ts">
	// The frame every catechesis article shares: head and JSON-LD, the table of
	// contents with its scroll spy, the hero, the German-only notice, the series
	// navigation, the disclaimer and the Bible peeks. The page supplies only its
	// own sections, as children.
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import ReferencePeeks from '$lib/components/faith/bible/ReferencePeeks.svelte';
	import ApologetikToc from '$lib/components/faith/ApologetikToc.svelte';
	import KatecheseSeries from '$lib/components/faith/KatecheseSeries.svelte';
	import { createScrollSpy } from '$lib/js/scrollSpy.svelte';
	import { generateBreadcrumbJsonLd } from '$lib/js/breadcrumbJsonLd';
	import { m, langFromFaithSlug, bibleSlug } from '$lib/js/faithI18n';

	type TocItem = { id: string; short: string; href: string; group?: string };
	type Part = { n: number; label: string; slug: string };

	type Props = {
		/** The page's path segment under /glaube/katechese/. */
		slug: string;
		/** `<title>`, without the " - Bocken" suffix. */
		title: string;
		/** `<meta name="description">`. */
		metaDescription: string;
		/** The Article JSON-LD's headline, description and topic. */
		headline: string;
		description: string;
		about: string;
		/** The breadcrumb's third crumb (the section) and fourth (this page). */
		crumbSection?: string;
		crumbName: string;
		/** The hero: the eyebrow after "Die Zehn Gebote ·", and the heading. */
		eyebrow: string;
		heading: string;
		tocItems: TocItem[];
		/** The commandment's series, shown after the content… */
		series?: { gebot: string; parts: Part[]; current: number };
		/** …or a navigation of the page's own in its place. */
		seriesNav?: Snippet;
		children: Snippet;
	};

	let {
		slug,
		title,
		metaDescription,
		headline,
		description,
		about,
		crumbSection = 'Die Zehn Gebote',
		crumbName,
		eyebrow,
		heading,
		tocItems,
		series,
		seriesNav,
		children
	}: Props = $props();

	const lang = $derived(langFromFaithSlug(page.url.pathname.split('/')[1]));
	const t = $derived(m[lang]);
	const isGerman = $derived(lang === 'de');

	// The table of contents is fixed per page.
	// svelte-ignore state_referenced_locally
	const spy = createScrollSpy({ ids: tocItems.map((it) => it.id) });

	const url = $derived(`https://bocken.org/glaube/katechese/${slug}`);
	const articleJsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline,
		description,
		inLanguage: 'de',
		url,
		mainEntityOfPage: url,
		isAccessibleForFree: true,
		articleSection: 'Katechese',
		about: { '@type': 'Thing', name: about },
		author: { '@type': 'Person', name: 'Alexander Bocken', url: 'https://bocken.org/' },
		publisher: { '@type': 'Person', name: 'Alexander Bocken', url: 'https://bocken.org/' },
		citation: [
			{ '@type': 'CreativeWork', name: 'Glaubenskurs, 3. Hauptteil', author: { '@type': 'Person', name: 'P. Martin Ramm FSSP' } }
		]
	});
	const breadcrumbJsonLd = $derived(
		generateBreadcrumbJsonLd([
			{ name: 'Bocken', path: '/' },
			{ name: 'Glaube', path: '/glaube' },
			{ name: crumbSection, path: '/glaube/katechese' },
			{ name: crumbName, path: `/glaube/katechese/${slug}` }
		])
	);
</script>

<svelte:head>
	<title>{title} - Bocken</title>
	<meta name="description" content={metaDescription} />
	{@html `<script type="application/ld+json">${JSON.stringify(articleJsonLd)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>`}
</svelte:head>

<div class="page-wrapper katechese">
<ApologetikToc title="Inhalt" items={tocItems} activeId={spy.activeId} onItemClick={spy.jumpTo} />
<div class="page">
	<header class="hero">
		<p class="eyebrow">Die Zehn Gebote &middot; {eyebrow}</p>
		<h1>{heading}</h1>
		<p class="subtitle">Glaubenskurs, 3. Hauptteil &mdash; P. Martin Ramm FSSP</p>
	</header>

	{#if !isGerman}
		<p class="lang-notice">{t.only_german_pre}<a href={resolve(`/glaube/katechese/${slug}`)}>{t.only_german_link}</a>{t.only_german_post}</p>
	{/if}

	{@render children()}

	{#if series}
		<KatecheseSeries gebot={series.gebot} parts={series.parts} current={series.current} />
	{:else}
		{@render seriesNav?.()}
	{/if}

	<p class="disclaimer">Diese Seite stellt eine freie Aufbereitung der erhaltenen Unterlagen dar und ist kein offizielles Angebot von P. Martin Ramm oder der FSSP. Etwaige Fehler oder Missverständnisse sind dem Verfasser dieser Seite anzulasten.</p>
</div>
</div>

<!-- Bible citations: the reader's peeks, with a link into the Bible. -->
<ReferencePeeks {lang} faithLang={page.url.pathname.split('/')[1]} bibleLang={bibleSlug(lang)} source={lang === 'en' ? 'Douay-Rheims' : 'Allioli'} />
