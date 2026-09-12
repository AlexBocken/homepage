<script>
	import { resolve } from '$app/paths';
	import LinksGrid from '$lib/components/LinksGrid.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { isEastertide } from '$lib/js/easter.svelte';
	import { m, prayersSlug as prayersSlugFor, rosarySlug, calendarSlug, apologetikSlug, bibleSlug, katecheseSlug, faithSlugFromLang } from '$lib/js/faithI18n';
	/** @typedef {import('$lib/js/faithI18n').FaithLang} FaithLang */
	let { data } = $props();

	const lang = $derived(/** @type {FaithLang} */ (data.lang));
	const t = $derived(m[lang]);
	const prayersPath = $derived(prayersSlugFor(lang));
	const rosaryPath = $derived(rosarySlug(lang));
	const calendarPath = $derived(calendarSlug(lang));
	const biblePath = $derived(bibleSlug(lang));
	const katechesePath = $derived(katecheseSlug(lang));
	// Apologetik has no Latin variant — Latin readers fall back to English.
	const apologetikHref = $derived(
		lang === 'la'
			? resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]', { faithLang: faithSlugFromLang('en'), apologetikSlug: apologetikSlug('en') })
			: resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]', { faithLang: data.faithLang, apologetikSlug: apologetikSlug(lang) })
	);
	const eastertide = isEastertide();
</script>

<Seo
	title={`${t.title} — Bocken`}
	description={t.description}
	lang={lang}
/>
<style>
	h1{
		text-align: center;
		font-size: 3em;
	}
	p{
		max-width: 600px;
		margin: 0 auto;
		font-size: 1.1em;
	}
	.katechese-link {
		position: relative;
	}
	.lang-badge {
		position: absolute;
		top: 0.75em;
		right: 0.75em;
		background: var(--nord10);
		color: white;
		font-size: 0.8rem;
		font-weight: 700;
		padding: 0.2em 0.5em;
		border-radius: 4px;
		line-height: 1;
		letter-spacing: 0.05em;
		z-index: 1;
	}
	.regina-link {
		position: relative;
	}
	.easter-badge {
		position: absolute;
		top: 0.75em;
		right: 0.75em;
		background: white;
		color: black;
		font-size: 0.8rem;
		font-weight: 700;
		padding: 0.2em 0.5em;
		border-radius: 4px;
		line-height: 1;
		z-index: 1;
	}

</style>

<h1>{t.title}</h1>
<p>
	{t.description}
</p>

<LinksGrid columns={4}>
	<a href={resolve('/[faithLang=faithLang]/[prayers=prayersLang]', { faithLang: data.faithLang, prayers: prayersPath })}>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M351.2 4.8c3.2-2 6.6-3.3 10-4.1c4.7-1 9.6-.9 14.1 .1c7.7 1.8 14.8 6.5 19.4 13.6L514.6 194.2c8.8 13.1 13.4 28.6 13.4 44.4v73.5c0 6.9 4.4 13 10.9 15.2l79.2 26.4C631.2 358 640 370.2 640 384v96c0 9.9-4.6 19.3-12.5 25.4s-18.1 8.1-27.7 5.5L431 465.9c-56-14.9-95-65.7-95-123.7V224c0-17.7 14.3-32 32-32s32 14.3 32 32v80c0 8.8 7.2 16 16 16s16-7.2 16-16V219.1c0-7-1.8-13.8-5.3-19.8L340.3 48.1c-1.7-3-2.9-6.1-3.6-9.3c-1-4.7-1-9.6 .1-14.1c1.9-8 6.8-15.2 14.3-19.9zm-62.4 0c7.5 4.6 12.4 11.9 14.3 19.9c1.1 4.6 1.2 9.4 .1 14.1c-.7 3.2-1.9 6.3-3.6 9.3L213.3 199.3c-3.5 6-5.3 12.9-5.3 19.8V304c0 8.8 7.2 16 16 16s16-7.2 16-16V224c0-17.7 14.3-32 32-32s32 14.3 32 32V342.3c0 58-39 108.7-95 123.7l-168.7 45c-9.6 2.6-19.9 .5-27.7-5.5S0 490 0 480V384c0-13.8 8.8-26 21.9-30.4l79.2-26.4c6.5-2.2 10.9-8.3 10.9-15.2V238.5c0-15.8 4.7-31.2 13.4-44.4L245.2 14.5c4.6-7.1 11.7-11.8 19.4-13.6c4.6-1.1 9.4-1.2 14.1-.1c3.5 .8 6.9 2.1 10 4.1z"/></svg>
		<h3>{t.prayers}</h3>
	</a>
	<a href={resolve('/[faithLang=faithLang]/[rosary=rosaryLang]', { faithLang: data.faithLang, rosary: rosaryPath })}>
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="9.69" cy="14.25" r="1.92"/><circle cx="7.57" cy="9.14" r="1.92"/><circle cx="9.69" cy="4.04" r="1.92"/><circle cx="14.79" cy="1.92" r="1.92"/><circle cx="19.9" cy="4.04" r="1.92"/><circle cx="22.01" cy="9.14" r="1.92"/><circle cx="19.9" cy="14.25" r="1.92"/><circle cx="14.79" cy="16.36" r="1.92"/><g transform="translate(8.21 15.71) rotate(45)"><rect x="-1" y="0.4" width="2" height="10.8" rx="1"/><rect x="-4" y="3.4" width="8" height="2" rx="1"/></g></svg>
		<h3>{t.rosary}</h3>
	</a>
	{#if eastertide}
		<a href={resolve('/[faithLang=faithLang]/[prayers=prayersLang]/[prayer]', { faithLang: data.faithLang, prayers: prayersPath, prayer: 'regina-caeli' })} class="regina-link">
			<span class="easter-badge">{t.in_season}</span>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -274 532 548"><path d="M256-168c27 0 48-21 48-48s-21-48-48-48-48 21-48 48 21 48 48 48zM6-63l122 199-56 70c-5 7-8 14-8 23 0 19 16 35 36 35h312c20 0 36-16 36-35 0-9-3-16-8-23l-56-70L507-63c3-6 5-13 5-20 0-20-16-37-37-37-7 0-14 2-20 6l-17 12c-13 8-30 6-40-4l-35-35c-7-7-17-11-27-11s-20 4-27 11l-30 30c-13 13-33 13-46 0l-30-30c-7-7-17-11-27-11s-20 4-27 11l-34 34c-11 11-28 13-41 4l-17-11c-6-4-13-6-20-6-20 0-37 17-37 37 0 7 2 14 6 20z"/></svg>
			<h3>Regína Cæli</h3>
		</a>
	{:else}
		<a href={resolve('/[faithLang=faithLang]/[prayers=prayersLang]/[prayer]', { faithLang: data.faithLang, prayers: prayersPath, prayer: 'angelus' })}>
			<svg xmlns="http://www.w3.org/2000/svg"viewBox="6 -274 564 548"><path d="M392-162c-4-10-9-18-15-26 5-4 7-8 7-12 0-18-43-32-96-32s-96 14-96 32c0 4 3 8 7 12-6 8-11 16-15 26-15-11-24-24-24-38 0-35 57-64 128-64s128 29 128 64c0 14-9 27-24 38zm-104-22c35 0 64 29 64 64s-29 64-64 64-64-29-64-64 29-64 64-64zM82 159c3-22-3-48-20-64C34 68 16 30 16-12v-64c0-42 34-76 76-76 23 0 44 10 59 27l65 78c-21 16-37 40-43 67l-43 195c-4 17-2 34 5 49h-21c-26 0-46-24-42-50l10-55zm364 56L403 20c-6-27-21-51-42-67l64-77c15-18 36-28 59-28 42 0 76 34 76 76v64c0 42-18 80-46 107-17 16-23 42-20 64l10 56c4 26-16 49-42 49h-20c6-15 8-32 4-49zM220 31c7-32 35-55 68-55s61 23 68 55l43 194c5 20-11 39-31 39H208c-21 0-36-19-31-39l43-194z"/></svg>
			<h3>Angelus</h3>
		</a>
	{/if}
	<a href={resolve('/[faithLang=faithLang]/[bible=bibleLang]', { faithLang: data.faithLang, bible: biblePath })}>
		<!-- A closed book with a cross on the cover. -->
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill-rule="evenodd" d="M96 0C43 0 0 43 0 96v320c0 53 43 96 96 96h320c17.7 0 32-14.3 32-32s-14.3-32-32-32v-64c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H96zm0 384h256v64H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zM200 96h48v56h56v48h-56v120h-48V200h-56v-48h56V96z"/></svg>
		<h3>{t.bible}</h3>
	</a>
	<a href={resolve('/[faithLang=faithLang]/[katechese=katecheseLang]', { faithLang: data.faithLang, katechese: katechesePath })} class="katechese-link">
		{#if lang !== 'de'}<span class="lang-badge">DE</span>{/if}
		<!-- A mortarboard: teaching, without looking like the Bible's book. -->
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M303.4 34.5c10.6-4.5 22.6-4.5 33.2 0l264 112c14.5 6.2 23.4 20.3 23.4 36v144c0 13.3-10.7 24-24 24s-24-10.7-24-24V219.8L336.6 302c-10.6 4.5-22.6 4.5-33.2 0l-264-112C24.4 183.6 16 170.8 16 156.5s8.4-27.1 23.4-33.5l264-88.5zM128 262.6l150.2 63.7c26.5 11.2 56.6 11.2 83.1 0L512 262.6V368c0 53-86 96-192 96S128 421 128 368V262.6z"/></svg>
		<h3>Katechese</h3>
	</a>
	<a href={apologetikHref}>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M384 32H512c17.7 0 32 14.3 32 32s-14.3 32-32 32H398.4c-5.2 25.8-22.9 47.1-46.4 57.3V448H544c17.7 0 32 14.3 32 32s-14.3 32-32 32H320 96c-17.7 0-32-14.3-32-32s14.3-32 32-32H288V153.3c-23.5-10.3-41.2-31.6-46.4-57.3H128c-17.7 0-32-14.3-32-32s14.3-32 32-32H256c14.6-19.4 37.8-32 64-32s49.4 12.6 64 32zm55.6 288H584.4L512 195.8 439.6 320zM512 416c-62.9 0-115.2-34-126-78.9c-2.6-11 1-22.3 6.7-32.1l95.2-163.2c5-8.6 14.2-13.8 24.1-13.8s19.1 5.3 24.1 13.8l95.2 163.2c5.7 9.8 9.3 21.1 6.7 32.1C627.2 382 574.9 416 512 416zM126.8 195.8L54.4 320H199.3L126.8 195.8zM.9 337.1c-2.6-11 1-22.3 6.7-32.1l95.2-163.2c5-8.6 14.2-13.8 24.1-13.8s19.1 5.3 24.1 13.8l95.2 163.2c5.7 9.8 9.3 21.1 6.7 32.1C242 382 189.7 416 126.8 416S11.7 382 .9 337.1z"/></svg>
		<h3>{t.apologetics}</h3>
	</a>
	<a href={resolve('/[faithLang=faithLang]/[calendar=calendarLang]', { faithLang: data.faithLang, calendar: calendarPath })}>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M128 0c17.7 0 32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h48c26.5 0 48 21.5 48 48v48H0V112C0 85.5 21.5 64 48 64H96V32c0-17.7 14.3-32 32-32zM0 192H448V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V192zm64 80v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H80c-8.8 0-16 7.2-16 16zm128 0v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H208c-8.8 0-16 7.2-16 16zm144-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H336zM64 400v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V400c0-8.8-7.2-16-16-16H80c-8.8 0-16 7.2-16 16zm144-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V400c0-8.8-7.2-16-16-16H208zm112 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V400c0-8.8-7.2-16-16-16H336c-8.8 0-16 7.2-16 16z"/></svg>
		<h3>{t.calendar}</h3>
	</a>
</LinksGrid>
