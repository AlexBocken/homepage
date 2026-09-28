<script>
	import { onMount } from 'svelte';
	import { usePrayerLanguage, stripQuery } from '$lib/js/prayerLanguage.svelte';
	import LanguageToggle from "$lib/components/faith/LanguageToggle.svelte";
	import { prayerBySlug } from '$lib/faith/prayers';
	import { PRAYER_COMPONENTS } from '$lib/faith/prayerComponents';
	import StickyImage from "$lib/components/faith/StickyImage.svelte";
	import AngelusStreakCounter from "$lib/components/faith/AngelusStreakCounter.svelte";
	import ScrollTopButton from "$lib/components/faith/ScrollTopButton.svelte";
	import ReferencePeeks from "$lib/components/faith/bible/ReferencePeeks.svelte";
	import PrayerScriptureNote from "$lib/components/faith/prayers/PrayerScriptureNote.svelte";
	import { m, bibleSlug, faithSlugFromLang, prayersSlug } from '$lib/js/faithI18n';
	import { generateBreadcrumbJsonLd } from '$lib/js/breadcrumbJsonLd';
	/** @typedef {import('$lib/js/faithI18n').FaithLang} FaithLang */

	let { data } = $props();

	// The language context the prayer components read.
	usePrayerLanguage(() => data);

	const lang = $derived(/** @type {FaithLang} */ (data.lang));
	const t = $derived(m[lang]);
	const isEnglish = $derived(lang === 'en');
	const isLatin = $derived(lang === 'la');

	const prayer = $derived(prayerBySlug(data.prayer));
	const prayerName = $derived(prayer?.name(t) || data.prayer);
	const isBilingue = $derived(prayer?.bilingue ?? true);
	const prayerId = $derived(prayer?.id);
	const prayerView = $derived(prayerId ? PRAYER_COMPONENTS[prayerId] : undefined);
	const isAngelusPage = $derived(prayerId === 'angelus' || prayerId === 'reginaCaeli');
	/** The Hail Mary and the Angelus are Luke nearly verbatim; a note under the
	 *  card says where. Not under /fides: the note has no Latin. */
	const hasScriptureNote = $derived(!isLatin && (prayerId === 'aveMaria' || prayerId === 'angelus'));

	/** The image beside the prayer: what it depicts, and which painting it is.
	 *  The alt used to be the prayer's name, which tells a screen reader
	 *  nothing it hasn't already read in the <h1> right above. Latin takes the
	 *  German text, as the rest of this page does. */
	const prayerImage = $derived(
		prayerId === 'reginaCaeli'
			? {
					src: '/glaube/glorious/5-diego-veazquez.coronation-mary.webp',
					artist: 'Diego Velázquez',
					title: t.painting_coronation_virgin,
					/** @type {string | number | null} */
					year: 1641,
					alt: "Christ and the Father together lower a crown of flowers onto Mary's head; the dove shines between them and cherubs hold up the clouds.",
					altDe: 'Christus und der Vater setzen Maria gemeinsam einen Blütenkranz auf; zwischen ihnen leuchtet die Taube, Putten tragen die Wolken.'
				}
			: prayerId === 'angelus'
				? {
						src: '/glaube/joyful/1-murilllo-annunciation.webp',
						artist: 'Bartolomé Esteban Murillo',
						title: t.painting_annunciation,
						/** @type {string | number | null} */
						year: 'ca. 1660',
						alt: 'The angel Gabriel kneels before Mary, who draws back from her reading with a hand at her breast; a dove in a burst of light descends between them, ringed by cherubs.',
						altDe: 'Der Engel Gabriel kniet vor Maria, die von ihrer Lesung aufschreckt und die Hand an die Brust legt; zwischen ihnen senkt sich eine Taube in hellem Licht herab, umringt von Putten.'
					}
				: {
						src: '/glaube/crucifix.webp',
						artist: 'Alonso Cano',
						title: t.painting_christ_crucified,
						/** @type {string | number | null} */
						year: null,
						alt: 'Christ hangs dead on the cross against a black ground, his head fallen forward beneath the INRI plaque.',
						altDe: 'Christus hängt tot am Kreuz vor schwarzem Grund, der Kopf unter der INRI-Tafel nach vorn gesunken.'
					}
	);

	const gloriaIntro = $derived(isEnglish
		? 'This ancient hymn begins with the words the angels used to celebrate the newborn Savior. It first praises God the Father, then God the Son; it concludes with homage to the Most Holy Trinity, during which one makes the sign of the cross.'
		: 'Der uralte Gesang beginnt mit den Worten, mit denen die Engelscharen den neugeborenen Welterlöser feierten. Er preist zunächst Gott Vater, dann Gott Sohn; er schliesst mit einer Huldigung an die Heiligste Dreifaltigkeit, wobei man sich mit dem grossen Kreuze bezeichnet.');

	// Toggle href for no-JS fallback (navigates to opposite latin state)
	const latinToggleHref = $derived(data.initialLatin ? '?latin=0' : '?');

	const breadcrumbJsonLd = $derived(generateBreadcrumbJsonLd([
		{ name: 'Bocken', path: '/' },
		{ name: t.title, path: `/${faithSlugFromLang(lang)}` },
		{ name: t.prayers, path: `/${faithSlugFromLang(lang)}/${prayersSlug(lang)}` },
		{ name: prayerName, path: `/${faithSlugFromLang(lang)}/${prayersSlug(lang)}/${data.prayer}` }
	]));

	onMount(() => {
		// Clean up URL params after hydration (state is now in component state)
		stripQuery();
	});
</script>

<svelte:head>
	<title>{prayerName} - Bocken</title>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>`}
</svelte:head>

<style>
.container {
	max-width: 700px;
	margin: auto;
	padding: 1em;
}
h1 {
	text-align: center;
	font-size: 2.5rem;
	margin-bottom: 0.5em;
}
.toggle-controls {
	display: flex;
	justify-content: center;
	margin-bottom: 2rem;
}
.gebet {
	text-align: center;
	font-size: 1.25em;
}
:global(.gebet v) {
	margin: 0;
	display: block;
}
:global(.gebet v:lang(la)) {
	color: var(--nord6);
}
:global(.bilingue v:lang(de)) {
	color: grey;
}
:global(.bilingue .monolingual v:lang(de)) {
	color: inherit;
}
:global(.bilingue .monolingual v:lang(de) i) {
	color: var(--nord11);
}
:global(.gebet i) {
	font-style: normal;
	color: var(--nord11);
	font-weight: 900;
}
.gebet-wrapper {
	padding: 1.5em;
	background-color: light-dark(var(--nord5), #1a1a1a);
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.intro {
	margin-bottom: 1em;
	font-style: italic;
	text-align: center;
}
</style>
	{#if prayerId === 'postcommunio' || prayerId === 'prayerbeforeacrucifix' || isAngelusPage}

<h1>{prayerName}</h1>

	{#if !isLatin && isBilingue}
	<div class="toggle-controls">
		<LanguageToggle
			initialLatin={data.initialLatin}
			hasUrlLatin={data.hasUrlLatin}
			href={latinToggleHref}
		/>
	</div>
	{/if}

	{#if isAngelusPage}
		<AngelusStreakCounter
			streakData={data.angelusStreak}
			{lang}
			isLoggedIn={!!data.session?.user}
		/>
	{/if}

	<StickyImage
		src={prayerImage.src}
		alt={isEnglish ? prayerImage.alt : prayerImage.altDe}
		caption={`${prayerImage.artist}, <em>${prayerImage.title}</em>${prayerImage.year ? `, ${prayerImage.year}` : ''}`}
	>
		<div class="gebet-wrapper">
			<div class="gebet" class:bilingue={isBilingue}>
				{#if prayerView}
					<prayerView.component {...prayerView.pageProps} />
				{/if}
			</div>
		</div>
		{#if prayerId === 'angelus'}
			<!-- The Angelus is long: three Aves and a collect. The way back up, as on the rosary page. -->
			<ScrollTopButton label={isEnglish ? 'Scroll to top' : 'Nach oben'} />
		{/if}
		{#if hasScriptureNote && prayerId === 'angelus'}
			<PrayerScriptureNote prayer="angelus" {lang} />
		{/if}
	</StickyImage>
	{:else}
<div class="container">
	<h1>{prayerName}</h1>

	{#if !isLatin && isBilingue}
	<div class="toggle-controls">
		<LanguageToggle
			initialLatin={data.initialLatin}
			hasUrlLatin={data.hasUrlLatin}
			href={latinToggleHref}
		/>
	</div>
	{/if}


	<div class="gebet-wrapper">
		{#if prayerId === 'gloria'}
			<p class="intro">{gloriaIntro}</p>
		{/if}
		<div class="gebet" class:bilingue={isBilingue}>
			{#if prayerView}
				<prayerView.component {...prayerView.pageProps} />
			{/if}
		</div>
	</div>
	{#if hasScriptureNote && prayerId === 'aveMaria'}
		<PrayerScriptureNote prayer="aveMaria" {lang} />
	{/if}
</div>
{/if}

<!-- The Angelus page carries the streak counter, and its explainer cites the
     Catechism and Matthew; the Hail Mary and the Angelus have a note citing
     Luke. The citations peek through this. -->
{#if isAngelusPage || hasScriptureNote}
	<ReferencePeeks {lang} faithLang={data.faithLang} bibleLang={bibleSlug(lang)} source={isEnglish ? 'Douay-Rheims' : 'Allioli'} />
{/if}
