<script>
	import { onMount } from 'svelte';
	import { createLanguageContext } from "$lib/contexts/languageContext.js";
	import LanguageToggle from "$lib/components/faith/LanguageToggle.svelte";
	import Kreuzzeichen from "$lib/components/faith/prayers/Kreuzzeichen.svelte";
	import GloriaPatri from "$lib/components/faith/prayers/GloriaPatri.svelte";
	import Paternoster from "$lib/components/faith/prayers/Paternoster.svelte";
	import Credo from "$lib/components/faith/prayers/Credo.svelte";
	import AveMaria from "$lib/components/faith/prayers/AveMaria.svelte";
	import SalveRegina from "$lib/components/faith/prayers/SalveRegina.svelte";
	import FatimaGebet from "$lib/components/faith/prayers/FatimaGebet.svelte";
	import Gloria from "$lib/components/faith/prayers/Gloria.svelte";
	import MichaelGebet from "$lib/components/faith/prayers/MichaelGebet.svelte";
	import BruderKlausGebet from "$lib/components/faith/prayers/BruderKlausGebet.svelte";
	import JosephGebet from "$lib/components/faith/prayers/JosephGebet.svelte";
	import Confiteor from "$lib/components/faith/prayers/Confiteor.svelte";
	import Postcommunio from "$lib/components/faith/prayers/Postcommunio.svelte";
	import AnimaChristi from "$lib/components/faith/prayers/AnimaChristi.svelte";
	import PrayerBeforeACrucifix from "$lib/components/faith/prayers/PrayerBeforeACrucifix.svelte";
	import GuardianAngel from "$lib/components/faith/prayers/GuardianAngel.svelte";
	import ApostlesCreed from "$lib/components/faith/prayers/ApostlesCreed.svelte";
	import TantumErgo from "$lib/components/faith/prayers/TantumErgo.svelte";
	import AngelusComponent from "$lib/components/faith/prayers/Angelus.svelte";
	import ReginaCaeli from "$lib/components/faith/prayers/ReginaCaeli.svelte";
	import JungfrauMutterGottes from "$lib/components/faith/prayers/JungfrauMutterGottes.svelte";
	import ODominaMea from "$lib/components/faith/prayers/ODominaMea.svelte";
	import Memorare from "$lib/components/faith/prayers/Memorare.svelte";
	import HilfMaria from "$lib/components/faith/prayers/HilfMaria.svelte";
	import TischgebetVor from "$lib/components/faith/prayers/TischgebetVor.svelte";
	import TischgebetNach from "$lib/components/faith/prayers/TischgebetNach.svelte";
	import StickyImage from "$lib/components/faith/StickyImage.svelte";
	import AngelusStreakCounter from "$lib/components/faith/AngelusStreakCounter.svelte";
	import ReferencePeeks from "$lib/components/faith/bible/ReferencePeeks.svelte";
	import PrayerScriptureNote from "$lib/components/faith/prayers/PrayerScriptureNote.svelte";
	import { m, bibleSlug, faithSlugFromLang, prayersSlug } from '$lib/js/faithI18n';
	import { generateBreadcrumbJsonLd } from '$lib/js/breadcrumbJsonLd';
	import '$lib/css/action_button.css';
	/** @typedef {import('$lib/js/faithI18n').FaithLang} FaithLang */

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const langContext = createLanguageContext({ urlLang: /** @type {'de' | 'en'} */(data.lang), initialLatin: data.lang === 'la' ? true : data.initialLatin });

	$effect(() => {
		langContext.lang.set(data.lang);
		if (data.lang === 'la') {
			langContext.showLatin.set(true);
		}
	});

	const lang = $derived(/** @type {FaithLang} */ (data.lang));
	const t = $derived(m[lang]);
	const isEnglish = $derived(lang === 'en');
	const isLatin = $derived(lang === 'la');

	// Prayer definitions with slugs. Names come from the dictionary; slugs and
	// bilingue flags stay inline since they're prayer-route metadata.
	const prayerDefs = $derived({
		'das-heilige-kreuzzeichen': { id: 'signOfCross', name: t.sign_of_cross, bilingue: true },
		'the-sign-of-the-cross': { id: 'signOfCross', name: t.sign_of_cross, bilingue: true },
		'gloria-patri': { id: 'gloriaPatri', name: 'Glória Patri', bilingue: true },
		'paternoster': { id: 'paternoster', name: t.pater_noster, bilingue: true },
		'our-father': { id: 'paternoster', name: t.pater_noster, bilingue: true },
		'credo': { id: 'credo', name: t.nicene_creed, bilingue: true },
		'nicene-creed': { id: 'credo', name: t.nicene_creed, bilingue: true },
		'ave-maria': { id: 'aveMaria', name: t.hail_mary, bilingue: true },
		'hail-mary': { id: 'aveMaria', name: t.hail_mary, bilingue: true },
		'salve-regina': { id: 'salveRegina', name: 'Salve Regina', bilingue: true },
		'das-fatimagebet': { id: 'fatima', name: t.fatima_prayer, bilingue: true },
		'fatima-prayer': { id: 'fatima', name: t.fatima_prayer, bilingue: true },
		'gloria': { id: 'gloria', name: 'Glória', bilingue: true },
		'gebet-zum-hl-erzengel-michael': { id: 'michael', name: t.st_michael_prayer, bilingue: true },
		'prayer-to-st-michael-the-archangel': { id: 'michael', name: t.st_michael_prayer, bilingue: true },
		'bruder-klaus-gebet': { id: 'bruderKlaus', name: t.bruder_klaus_prayer, bilingue: false },
		'prayer-of-st-nicholas-of-flue': { id: 'bruderKlaus', name: t.bruder_klaus_prayer, bilingue: false },
		'josephgebet-des-hl-papst-pius-x': { id: 'joseph', name: t.st_joseph_prayer, bilingue: false },
		'prayer-to-st-joseph-by-pope-st-pius-x': { id: 'joseph', name: t.st_joseph_prayer, bilingue: false },
		'das-confiteor': { id: 'confiteor', name: t.the_confiteor, bilingue: true },
		'the-confiteor': { id: 'confiteor', name: t.the_confiteor, bilingue: true },
		'postcommunio': { id: 'postcommunio', name: t.postcommunio_prayers, bilingue: true },
		'anima-christi': { id: 'animachristi', name: 'Ánima Christi', bilingue: true },
		'prayer-before-a-crucifix': { id: 'prayerbeforeacrucifix', name: t.prayer_before_crucifix, bilingue: true },
		'gebet-vor-einem-kruzifix': { id: 'prayerbeforeacrucifix', name: t.prayer_before_crucifix, bilingue: true },
		'schutzengel-gebet': { id: 'guardianAngel', name: t.guardian_angel_prayer, bilingue: true },
		'guardian-angel-prayer': { id: 'guardianAngel', name: t.guardian_angel_prayer, bilingue: true },
		'apostolisches-glaubensbekenntnis': { id: 'apostlesCreed', name: t.apostles_creed, bilingue: true },
		'apostles-creed': { id: 'apostlesCreed', name: t.apostles_creed, bilingue: true },
		'tantum-ergo': { id: 'tantumErgo', name: 'Tantum Ergo', bilingue: true },
		'angelus': { id: 'angelus', name: 'Angelus', bilingue: true },
		'regina-caeli': { id: 'reginaCaeli', name: 'Regína Cæli', bilingue: true },
		'jungfrau-mutter-gottes-mein': { id: 'jungfrauMutter', name: t.jungfrau_mutter_prayer, bilingue: false },
		'virgin-mother-of-god': { id: 'jungfrauMutter', name: t.jungfrau_mutter_prayer, bilingue: false },
		'o-meine-gebieterin': { id: 'oMyQueen', name: t.o_my_queen_prayer, bilingue: true },
		'o-my-queen': { id: 'oMyQueen', name: t.o_my_queen_prayer, bilingue: true },
		'gedenke-o-guetigste-jungfrau-maria': { id: 'memorare', name: t.memorare_prayer, bilingue: true },
		'memorare': { id: 'memorare', name: t.memorare_prayer, bilingue: true },
		'hilf-maria-es-ist-zeit': { id: 'hilfMaria', name: t.hilf_maria_prayer, bilingue: false },
		'help-mary': { id: 'hilfMaria', name: t.hilf_maria_prayer, bilingue: false },
		'tischgebet-vor-dem-essen': { id: 'tischgebetVor', name: t.grace_before_meals, bilingue: true },
		'grace-before-meals': { id: 'tischgebetVor', name: t.grace_before_meals, bilingue: true },
		'tischgebet-nach-dem-essen': { id: 'tischgebetNach', name: t.grace_after_meals, bilingue: true },
		'grace-after-meals': { id: 'tischgebetNach', name: t.grace_after_meals, bilingue: true }
	});

	const prayer = $derived(/** @type {Record<string, {id: string, name: string, bilingue: boolean}>} */(prayerDefs)[data.prayer]);
	const prayerName = $derived(prayer?.name || data.prayer);
	const isBilingue = $derived(prayer?.bilingue ?? true);
	const prayerId = $derived(prayer?.id);
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
		if (window.location.search) {
			history.replaceState({}, '', window.location.pathname);
		}
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
	background-color: var(--accent-dark);
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.scroll-top-button {
	margin: 2rem auto 0;
	width: fit-content;
	text-decoration: none;
}
.intro {
	margin-bottom: 1em;
	font-style: italic;
	text-align: center;
}
@media (prefers-color-scheme: light) {
    :global(:root:not([data-theme="dark"])) .gebet-wrapper {
		background-color: var(--nord5);
	}
  }
:global(:root[data-theme="light"]) .gebet-wrapper {
	background-color: var(--nord5);
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
				{#if prayerId === 'postcommunio'}
					<Postcommunio onlyIntro={false} />
				{:else if prayerId === 'prayerbeforeacrucifix'}
					<PrayerBeforeACrucifix />
				{:else if prayerId === 'angelus'}
					<AngelusComponent verbose={true} />
				{:else if prayerId === 'reginaCaeli'}
					<ReginaCaeli />
				{/if}
			</div>
		</div>
		{#if prayerId === 'angelus'}
			<!-- The Angelus is long: three Aves and a collect. The way back up, as on the rosary page. -->
			<a class="scroll-top-button action_button" href="#top" onclick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label={isEnglish ? 'Scroll to top' : 'Nach oben'}>
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
			</a>
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
			{#if prayerId === 'signOfCross'}
				<Kreuzzeichen />
			{:else if prayerId === 'gloriaPatri'}
				<GloriaPatri />
			{:else if prayerId === 'paternoster'}
				<Paternoster />
			{:else if prayerId === 'credo'}
				<Credo />
			{:else if prayerId === 'aveMaria'}
				<AveMaria />
			{:else if prayerId === 'salveRegina'}
				<SalveRegina />
			{:else if prayerId === 'fatima'}
				<FatimaGebet />
			{:else if prayerId === 'gloria'}
				<Gloria />
			{:else if prayerId === 'michael'}
				<MichaelGebet />
			{:else if prayerId === 'bruderKlaus'}
				<BruderKlausGebet />
			{:else if prayerId === 'joseph'}
				<JosephGebet />
			{:else if prayerId === 'confiteor'}
				<Confiteor />
			{:else if prayerId === 'animachristi'}
				<AnimaChristi />
			{:else if prayerId === 'prayerbeforeacrucifix'}
				<PrayerBeforeACrucifix />
			{:else if prayerId === 'guardianAngel'}
				<GuardianAngel />
			{:else if prayerId === 'apostlesCreed'}
				<ApostlesCreed />
			{:else if prayerId === 'tantumErgo'}
				<TantumErgo />
			{:else if prayerId === 'angelus'}
				<AngelusComponent verbose={true} />
			{:else if prayerId === 'reginaCaeli'}
				<ReginaCaeli />
			{:else if prayerId === 'jungfrauMutter'}
				<JungfrauMutterGottes />
			{:else if prayerId === 'oMyQueen'}
				<ODominaMea />
			{:else if prayerId === 'memorare'}
				<Memorare />
			{:else if prayerId === 'hilfMaria'}
				<HilfMaria />
			{:else if prayerId === 'tischgebetVor'}
				<TischgebetVor />
			{:else if prayerId === 'tischgebetNach'}
				<TischgebetNach />
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
