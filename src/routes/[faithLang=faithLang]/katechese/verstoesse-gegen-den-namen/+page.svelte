<script>
	import ReferencePeeks from '$lib/components/faith/bible/ReferencePeeks.svelte';
	import ScriptureRef from '$lib/components/faith/bible/ScriptureRef.svelte';
	import { bibleSlug } from '$lib/js/faithI18n';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import Flame from '@lucide/svelte/icons/flame';
	import Zap from '@lucide/svelte/icons/zap';
	import Ban from '@lucide/svelte/icons/ban';
	import Church from '@lucide/svelte/icons/church';
	import Users from '@lucide/svelte/icons/users';
	import Cross from '@lucide/svelte/icons/cross';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { page } from '$app/state';
	import ApologetikToc from '$lib/components/faith/ApologetikToc.svelte';
	import KatecheseSeries, { ZWEITES_GEBOT } from '$lib/components/faith/KatecheseSeries.svelte';
	import { m, langFromFaithSlug } from '$lib/js/faithI18n';

	const lang = $derived(langFromFaithSlug(page.url.pathname.split('/')[1]));
	const t = $derived(m[lang]);
	const isGerman = $derived(lang === 'de');
	const faithLang = $derived(page.params.faithLang ?? 'glaube');

	const tocItems = [
		{ id: 'leiter', short: 'Die Leiter der Verstösse', href: '#leiter' },
		{ id: 'unbedacht', short: 'Unbedachtes Aussprechen', href: '#unbedacht' },
		{ id: 'fluchen', short: 'Fluchen & Verfluchen', href: '#fluchen' },
		{ id: 'blasphemie', short: 'Blasphemie', href: '#blasphemie' },
		{ id: 'sakrileg', short: 'Sakrileg', href: '#sakrileg' }
	];

	let activeId = $state('');

	onMount(() => {
		const els = tocItems
			.map((it) => document.getElementById(it.id))
			.filter((el) => el !== null);
		if (!els.length) return;
		const io = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (visible[0]) {
					activeId = visible[0].target.id;
				}
			},
			{ rootMargin: '-64px 0px -60% 0px', threshold: 0 }
		);
		els.forEach((el) => io.observe(el));
		return () => io.disconnect();
	});

	/** @param {MouseEvent} e @param {string} id */
	function jumpTo(e, id) {
		const el = document.getElementById(id);
		if (!el) return;
		e.preventDefault();
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		history.replaceState(null, '', `#${id}`);
	}

	// Verstösse gegen den Namen Gottes — aufsteigend nach Schwere.
	const verstoesse = [
		{
			id: 'unbedacht',
			name: 'Unbedachtes Aussprechen',
			kurz: 'oberflächlich, banal, gedankenlos',
			Icon: Megaphone,
			stufe: 1
		},
		{
			id: 'fluchen',
			name: 'Fluchen',
			kurz: 'heilige Namen im Ausbruch des Zorns',
			Icon: Flame,
			stufe: 2
		},
		{
			id: 'fluchen',
			name: 'Verfluchen',
			kurz: 'den Fluch Gottes auf jemanden herabwünschen',
			Icon: Zap,
			stufe: 3
		},
		{
			id: 'blasphemie',
			name: 'Blasphemie',
			kurz: 'Schmähung und Verhöhnung Gottes',
			Icon: Ban,
			stufe: 4
		},
		{
			id: 'sakrileg',
			name: 'Sakrileg',
			kurz: 'vorsätzliche Entweihung des Heiligen',
			Icon: Church,
			stufe: 5
		}
	];

	// Wogegen sich ein Sakrileg richten kann.
	const sakrilegZiele = [
		{ ziel: 'gegen Gott', beispiel: 'unwürdiger Sakramentsempfang, Hostienraub …', Icon: Cross },
		{ ziel: 'gegen gottgeweihte Personen', beispiel: 'Priester, Ordensleute, Bischöfe, Papst', Icon: Users },
		{ ziel: 'gegen heilige Orte oder Sachen', beispiel: 'Kirchen, Kapellen, Friedhöfe', Icon: Church }
	];
</script>

<svelte:head>
	<title>Verstösse gegen den heiligen Namen - Bocken</title>
	<meta name="description" content="Unbedachtes Aussprechen, Fluchen, Verfluchen, Blasphemie und Sakrileg — die Verstösse gegen das zweite Gebot. Katechese nach P. Martin Ramm FSSP" />
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: 'Verstösse gegen den heiligen Namen',
		description: 'Katechese zu den Verstössen gegen das zweite Gebot — unbedachtes Aussprechen, Fluchen und Verfluchen, Blasphemie und Sakrileg. Aufbereitung des Glaubenskurses (3. Hauptteil) von P. Martin Ramm FSSP.',
		inLanguage: 'de',
		url: 'https://bocken.org/glaube/katechese/verstoesse-gegen-den-namen',
		mainEntityOfPage: 'https://bocken.org/glaube/katechese/verstoesse-gegen-den-namen',
		isAccessibleForFree: true,
		articleSection: 'Katechese',
		about: { '@type': 'Thing', name: 'Gotteslästerung' },
		author: { '@type': 'Person', name: 'Alexander Bocken', url: 'https://bocken.org/' },
		publisher: { '@type': 'Person', name: 'Alexander Bocken', url: 'https://bocken.org/' },
		citation: [
			{ '@type': 'CreativeWork', name: 'Glaubenskurs, 3. Hauptteil', author: { '@type': 'Person', name: 'P. Martin Ramm FSSP' } }
		]
	})}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Bocken', item: 'https://bocken.org/' },
			{ '@type': 'ListItem', position: 2, name: 'Glaube', item: 'https://bocken.org/glaube' },
			{ '@type': 'ListItem', position: 3, name: 'Die Zehn Gebote', item: 'https://bocken.org/glaube/katechese' },
			{ '@type': 'ListItem', position: 4, name: 'Verstösse gegen den heiligen Namen', item: 'https://bocken.org/glaube/katechese/verstoesse-gegen-den-namen' }
		]
	})}</script>`}
</svelte:head>

<div class="page-wrapper katechese">
<ApologetikToc title="Inhalt" items={tocItems} {activeId} onItemClick={jumpTo} />
<div class="page">
	<header class="hero">
		<p class="eyebrow">Die Zehn Gebote &middot; Zweites Gebot</p>
		<h1>Verstösse gegen den heiligen Namen</h1>
		<p class="subtitle">Glaubenskurs, 3. Hauptteil &mdash; P. Martin Ramm FSSP</p>
	</header>

	{#if !isGerman}
		<p class="lang-notice">{t.only_german_pre}<a href={resolve('/glaube/katechese/verstoesse-gegen-den-namen')}>{t.only_german_link}</a>{t.only_german_post}</p>
	{/if}

	<p class="lead">Wer <a href={`/${faithLang}/katechese/zweites-gebot`}>den Namen Gottes</a> ehrt, kann ihn auch verunehren. Die Verstösse reichen von der blossen Gedankenlosigkeit bis zur bewussten Entweihung des Heiligen.</p>

	<section class="topic c-red" id="leiter">
		<div class="topic-head">
			<span class="topic-badge"><TriangleAlert size={24} strokeWidth={1.9} /></span>
			<h2>Die Leiter der Verstösse</h2>
		</div>
		<p>Die Ehrfurcht vor der Majestät Gottes gestattet nicht, dass wir seinen Namen leichtsinnig aussprechen. Von der Gedankenlosigkeit bis zur bewussten Entweihung führt eine Leiter, die immer schwerer wiegt:</p>

		<ol class="ladder">
			{#each verstoesse as v (v.name)}
				{@const Icon = v.Icon}
				<li class="ladder-item" style="--stufe: {v.stufe}">
					<a class="ladder-link" href={'#' + v.id} onclick={(e) => jumpTo(e, v.id)}>
						<span class="ladder-badge"><Icon size={18} strokeWidth={2} /></span>
						<span class="ladder-body">
							<span class="ladder-name">{v.name}</span>
							<span class="ladder-kurz">{v.kurz}</span>
						</span>
						<span class="ladder-bar" aria-hidden="true"></span>
					</a>
				</li>
			{/each}
		</ol>
		<p class="ladder-note">Die Balken zeigen das wachsende Gewicht der Verfehlung, nicht ein kirchliches Mass.</p>
	</section>

	<section class="topic c-red" id="unbedacht">
		<div class="topic-head">
			<span class="topic-badge"><Megaphone size={22} strokeWidth={2} /></span>
			<h2>Unbedachtes Aussprechen</h2>
		</div>
		<blockquote class="quote-saint">
			<p>Diese Bitte ist freilich immer auch eine grosse Gewissenserforschung für uns: Wie gehe ich mit dem heiligen Namen Gottes um?</p>
			<cite>Benedikt XVI., Jesus von Nazareth, S. 179</cite>
		</blockquote>
		<p>Der Name Gottes darf nicht oberflächlich, banal oder gedankenlos gebraucht werden.</p>
		<blockquote class="quote-church">
			<p>Die Heiligkeit des Namens Gottes verlangt, dass man ihn nicht um belangloser Dinge willen benutzt.</p>
			<cite>KKK 2155</cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Du sollst den Namen des Herrn, deines Gottes, nicht unnütz aussprechen; denn der Herr lässt denjenigen nicht ungestraft, der seinen Namen unnütz ausspricht!</p>
			<cite><ScriptureRef reference="Ex 20, 7" /></cite>
		</blockquote>
		<p class="aside-note">Zur Gewissenserforschung gehört auch der Gebrauch sprachlich verblasster Christus-Anrufungen, die zum alltäglichen Ausdruck von Bedauern oder Überraschung geworden sind: „O Je", „Herr Je", „Jemine" (von <em>Jesu Domine</em>), „mein Gott", „Sapperlot" …</p>
		<blockquote class="quote-church">
			<p>Der Name des Herrn ist heilig. Darum darf der Mensch ihn nicht missbrauchen. Er soll ihn in schweigender, liebender Anbetung im Gedächtnis behalten. Er darf ihn nur gebrauchen, um Gott zu preisen, zu loben und zu verherrlichen.</p>
			<cite>KKK 2143</cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Darum hat Gott ihn erhöht und ihm den Namen gegeben, der über alle Namen ist, auf dass im Namen Jesu jedes Knie sich beuge im Himmel, auf der Erde und unter der Erde, und jede Zunge bekenne: Jesus Christus ist der Herr, zur Verherrlichung Gottes, des Vaters.</p>
			<cite><ScriptureRef reference="Phil 2, 9-11" /></cite>
		</blockquote>
	</section>

	<section class="topic c-red" id="fluchen">
		<div class="topic-head">
			<span class="topic-badge"><Flame size={22} strokeWidth={2} /></span>
			<h2>Fluchen &amp; Verfluchen</h2>
		</div>
		<div class="def-grid">
			<div class="def-card">
				<span class="def-icon"><Flame size={22} strokeWidth={1.8} /></span>
				<span class="def-term">Fluchen</span>
				<p>Mehr als nur „schlimme Wörter" sagen: Man versteht darunter das Aussprechen heiliger Namen bei Ausbrüchen von Zorn.</p>
			</div>
			<div class="def-card">
				<span class="def-icon"><Zap size={22} strokeWidth={1.8} /></span>
				<span class="def-term">Verfluchen</span>
				<p>Das Herabwünschen des Fluches Gottes auf eine Person oder Sache &mdash; verbunden mit dem Wunsch, dass jemandem etwas Schlechtes zustösst.</p>
			</div>
		</div>
		<p class="aside-note">Vgl. das Beispiel des heiligen Pfarrers von Ars.</p>
	</section>

	<section class="topic c-red" id="blasphemie">
		<div class="topic-head">
			<span class="topic-badge"><Ban size={22} strokeWidth={2} /></span>
			<h2>Blasphemie</h2>
		</div>
		<div class="etymologie">
			<span class="latin">blasphēmía</span>
			<span class="equals">=</span>
			<span class="meaning">Schmährede, Verunglimpfung</span>
		</div>
		<p>Im christlichen Sprachgebrauch ist die Blasphemie eine Schmähung oder Verhöhnung Gottes durch Worte oder Gebärden. Die bewusste Gotteslästerung ist eine der schwersten Sünden; im Alten Bund wurde sie mit dem Tod bestraft (<ScriptureRef reference="Lev 24, 16" />).</p>
		<blockquote class="quote-church">
			<p>Gotteslästerung widerspricht der Ehrfurcht, die man Gott und seinem heiligen Namen schuldet. Sie ist in sich eine schwere Sünde.</p>
			<cite>KKK 2148 (vgl. CIC can. 1369)</cite>
		</blockquote>
	</section>

	<section class="topic c-red" id="sakrileg">
		<div class="topic-head">
			<span class="topic-badge"><Church size={22} strokeWidth={2} /></span>
			<h2>Sakrileg</h2>
		</div>
		<p>Das Sakrileg (Gottesraub) bezeichnet ursprünglich den Raub heiliger Dinge. Daraus hat sich die Bedeutung entwickelt, vorsätzlich etwas Heiliges zu entweihen. Es kann sich gegen dreierlei richten:</p>
		<div class="trio">
			{#each sakrilegZiele as z (z.ziel)}
				{@const Icon = z.Icon}
				<div class="trio-card">
					<span class="trio-icon"><Icon size={24} strokeWidth={1.8} /></span>
					<span class="trio-name">{z.ziel}</span>
					<span class="trio-note">{z.beispiel}</span>
				</div>
			{/each}
		</div>
		<p>Aus der Ehrfurcht vor Gott und seinem heiligen Namen kommt wie von selbst die Ehrfurcht vor allem, was von Gott kommt oder zu seinem Dienst bestimmt ist.</p>
		<blockquote class="quote-scripture">
			<p>Ehre Gott und achte seine Priester.</p>
			<cite><ScriptureRef reference="Sir 7, 31" /></cite>
		</blockquote>
		<blockquote class="quote-scripture">
			<p>Wer euch hört, der hört mich; und wer euch verachtet, der verachtet mich; wer aber mich verachtet, der verachtet den, der mich gesandt hat.</p>
			<cite><ScriptureRef reference="Lk 10, 16" /></cite>
		</blockquote>
		<p class="aside-note">Sünden gegen die Keuschheit von Personen oder mit Personen, die durch die heiligen Weihen oder die Ordensprofess Gott geweiht sind, haben zusätzlich den Charakter eines Sakrilegs.</p>
	</section>

	<KatecheseSeries gebot="Das zweite Gebot" parts={ZWEITES_GEBOT} current={2} />

	<p class="disclaimer">Diese Seite stellt eine freie Aufbereitung der erhaltenen Unterlagen dar und ist kein offizielles Angebot von P. Martin Ramm oder der FSSP. Etwaige Fehler oder Missverständnisse sind dem Verfasser dieser Seite anzulasten.</p>
</div>
</div>

<!-- Bible citations: the reader's peeks, with a link into the Bible. -->
<ReferencePeeks {lang} faithLang={page.url.pathname.split('/')[1]} bibleLang={bibleSlug(lang)} source={lang === 'en' ? 'Douay-Rheims' : 'Allioli'} />

<style>
	/* Leiter der Verstösse */
	.ladder {
		list-style: none;
		margin: 1.25em 0 0.5em;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4em;
	}
	.ladder-item {
		--tint: color-mix(in oklab, var(--nord11) calc((var(--stufe) - 1) * 25%), var(--nord12));
	}
	.ladder-link {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-areas: 'badge body' 'bar bar';
		column-gap: 0.7em;
		row-gap: 0.5em;
		align-items: center;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.75em 0.9em;
		text-decoration: none;
		color: inherit;
		transition: var(--transition-normal);
	}
	.ladder-link:hover {
		border-color: var(--tint);
		scale: 1.01;
		box-shadow: var(--shadow-sm);
	}
	.ladder-badge {
		grid-area: badge;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--tint);
		color: #fff;
	}
	.ladder-body {
		grid-area: body;
		display: flex;
		flex-direction: column;
	}
	.ladder-name {
		font-weight: 700;
		font-size: 0.95rem;
	}
	.ladder-kurz {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		line-height: 1.35;
	}
	.ladder-bar {
		grid-area: bar;
		height: 4px;
		border-radius: var(--radius-pill);
		background: var(--tint);
		width: calc(var(--stufe) / 5 * 100%);
	}
	.ladder-note {
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
		font-style: italic;
	}
</style>
