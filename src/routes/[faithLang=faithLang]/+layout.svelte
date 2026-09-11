<script>
import { asset, resolve } from '$app/paths';
import '$lib/css/christ.css';
import { page } from '$app/state';
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
import LanguageSelector from '$lib/components/LanguageSelector.svelte';
import { isEastertide } from '$lib/js/easter.svelte';
import { m, prayersSlug as prayersSlugFor, rosarySlug, calendarSlug, apologetikSlug, bibleSlug, katecheseSlug, faithSlugFromLang, convertFaithPath, isKatecheseSlug } from '$lib/js/faithI18n';
/** @typedef {import('$lib/js/faithI18n').FaithLang} FaithLang */
let { data, children } = $props();

const SITE = 'https://bocken.org';

/** Build the alternate URL for `targetLang`, swapping the lang segment + known
 *  container slugs. Returns null when the route has no equivalent (e.g. katechese
 *  doesn't exist outside DE; apologetik has no Latin variant). For paths deeper
 *  than two segments we skip — inner slugs (prayer names, arg ids) aren't
 *  translated by this generic mapper. Per-page Seo can opt in instead.
 *  @param {string} currentPath
 *  @param {FaithLang} targetLang
 *  @returns {string | null}
 */
function alternatePath(currentPath, targetLang) {
	const segs = currentPath.split('/').filter(Boolean);
	if (segs.length === 0) return null;
	const section = segs[1] ?? '';
	// The Bible keeps book and chapter identical across languages, so its
	// deeper paths translate by swapping the container slugs.
	if (['bibel', 'bible', 'biblia'].includes(section)) return convertFaithPath(currentPath, targetLang);
	// So does the Catechism: a paragraph is 2095 in every edition, a section id
	// and a glossary term are the same string in all three. The course on the
	// commandments, which is the rest of the catechesis, exists only in German.
	if (isKatecheseSlug(section)) {
		if (['kkk', 'ccc', 'cce'].includes(segs[2] ?? '')) return convertFaithPath(currentPath, targetLang);
		if (segs.length > 2) return null;
		return targetLang === 'de' ? convertFaithPath(currentPath, 'de') : null;
	}
	if (segs.length > 2) return null;
	// Apologetik has no Latin variant.
	if (['apologetik', 'apologetics'].includes(section) && targetLang === 'la') return null;
	return convertFaithPath(currentPath, targetLang);
}

const altDe = $derived(alternatePath(page.url.pathname, 'de'));
const altEn = $derived(alternatePath(page.url.pathname, 'en'));
const altLa = $derived(alternatePath(page.url.pathname, 'la'));
const canonicalPath = $derived(alternatePath(page.url.pathname, /** @type {FaithLang} */ (data.lang)) ?? page.url.pathname);

const lang = $derived(/** @type {FaithLang} */ (data.lang));
const t = $derived(m[lang]);
const eastertide = isEastertide();
const prayersSlug = $derived(prayersSlugFor(lang));
const prayersHref = $derived(resolve('/[faithLang=faithLang]/[prayers=prayersLang]', { faithLang: data.faithLang, prayers: prayersSlug }));
const rosaryHref = $derived(resolve('/[faithLang=faithLang]/[rosary=rosaryLang]', { faithLang: data.faithLang, rosary: rosarySlug(lang) }));
const calendarHref = $derived(resolve('/[faithLang=faithLang]/[calendar=calendarLang]', { faithLang: data.faithLang, calendar: calendarSlug(lang) }));
const bibleHref = $derived(resolve('/[faithLang=faithLang]/[bible=bibleLang]', { faithLang: data.faithLang, bible: bibleSlug(lang) }));
const katecheseHref = $derived(resolve('/[faithLang=faithLang]/[katechese=katecheseLang]', { faithLang: data.faithLang, katechese: katecheseSlug(lang) }));
// Apologetik has no Latin variant — Latin readers fall back to the English route.
const apologetikHref = $derived(
	lang === 'la'
		? resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]', { faithLang: faithSlugFromLang('en'), apologetikSlug: apologetikSlug('en') })
		: resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]', { faithLang: data.faithLang, apologetikSlug: apologetikSlug(lang) })
);
const angelusHref = $derived(resolve('/[faithLang=faithLang]/[prayers=prayersLang]/[prayer]', {
	faithLang: data.faithLang,
	prayers: prayersSlug,
	prayer: eastertide ? 'regina-caeli' : 'angelus'
}));
const angelusLabel = $derived(eastertide ? 'Regína Cæli' : 'Angelus');

const typedLang = $derived(/** @type {'de' | 'en'} */ (data.lang));

/** @param {string} path */
function isActive(path) {
	const currentPath = page.url.pathname;
	return currentPath.startsWith(path);
}

const prayersActive = $derived(isActive(prayersHref) && !isActive(angelusHref));
</script>
<svelte:head>
	<link rel="preload" href={asset('/fonts/crosses.woff2')} as="font" type="font/woff2" crossorigin="anonymous">
	<link rel="canonical" href={`${SITE}${canonicalPath}`} />
	{#if altDe}<link rel="alternate" hreflang="de" href={`${SITE}${altDe}`} />{/if}
	{#if altEn}<link rel="alternate" hreflang="en" href={`${SITE}${altEn}`} />{/if}
	{#if altLa}<link rel="alternate" hreflang="la" href={`${SITE}${altLa}`} />{/if}
	{#if altEn}<link rel="alternate" hreflang="x-default" href={`${SITE}${altEn}`} />{/if}
</svelte:head>
<Header>
	{#snippet links()}
		<ul class=site_header>
		<li style="--active-fill: var(--nord12)"><a href={prayersHref} class:active={prayersActive} title={t.prayers}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 640 512" fill="currentColor"><path d="M351.2 4.8c3.2-2 6.6-3.3 10-4.1c4.7-1 9.6-.9 14.1 .1c7.7 1.8 14.8 6.5 19.4 13.6L514.6 194.2c8.8 13.1 13.4 28.6 13.4 44.4v73.5c0 6.9 4.4 13 10.9 15.2l79.2 26.4C631.2 358 640 370.2 640 384v96c0 9.9-4.6 19.3-12.5 25.4s-18.1 8.1-27.7 5.5L431 465.9c-56-14.9-95-65.7-95-123.7V224c0-17.7 14.3-32 32-32s32 14.3 32 32v80c0 8.8 7.2 16 16 16s16-7.2 16-16V219.1c0-7-1.8-13.8-5.3-19.8L340.3 48.1c-1.7-3-2.9-6.1-3.6-9.3c-1-4.7-1-9.6 .1-14.1c1.9-8 6.8-15.2 14.3-19.9zm-62.4 0c7.5 4.6 12.4 11.9 14.3 19.9c1.1 4.6 1.2 9.4 .1 14.1c-.7 3.2-1.9 6.3-3.6 9.3L213.3 199.3c-3.5 6-5.3 12.9-5.3 19.8V304c0 8.8 7.2 16 16 16s16-7.2 16-16V224c0-17.7 14.3-32 32-32s32 14.3 32 32V342.3c0 58-39 108.7-95 123.7l-168.7 45c-9.6 2.6-19.9 .5-27.7-5.5S0 490 0 480V384c0-13.8 8.8-26 21.9-30.4l79.2-26.4c6.5-2.2 10.9-8.3 10.9-15.2V238.5c0-15.8 4.7-31.2 13.4-44.4L245.2 14.5c4.6-7.1 11.7-11.8 19.4-13.6c4.6-1.1 9.4-1.2 14.1-.1c3.5 .8 6.9 2.1 10 4.1z"/></svg><span class="nav-label">{t.prayers}</span></a></li>
		<li style="--active-fill: var(--nord11)"><a href={rosaryHref} class:active={isActive(rosaryHref)} title={t.rosary}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9.69" cy="14.25" r="1.92"/><circle cx="7.57" cy="9.14" r="1.92"/><circle cx="9.69" cy="4.04" r="1.92"/><circle cx="14.79" cy="1.92" r="1.92"/><circle cx="19.9" cy="4.04" r="1.92"/><circle cx="22.01" cy="9.14" r="1.92"/><circle cx="19.9" cy="14.25" r="1.92"/><circle cx="14.79" cy="16.36" r="1.92"/><g transform="translate(8.21 15.71) rotate(45)"><rect x="-1" y="0.4" width="2" height="10.8" rx="1"/><rect x="-4" y="3.4" width="8" height="2" rx="1"/></g></svg><span class="nav-label">{t.rosary}</span></a></li>
		{#if eastertide}
			<li style="--active-fill: var(--nord14)"><a href={angelusHref} class:active={isActive(angelusHref)} title={angelusLabel} class="regina-nav"><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="-10 -274 532 548" fill="currentColor"><path d="M256-168c27 0 48-21 48-48s-21-48-48-48-48 21-48 48 21 48 48 48zM6-63l122 199-56 70c-5 7-8 14-8 23 0 19 16 35 36 35h312c20 0 36-16 36-35 0-9-3-16-8-23l-56-70L507-63c3-6 5-13 5-20 0-20-16-37-37-37-7 0-14 2-20 6l-17 12c-13 8-30 6-40-4l-35-35c-7-7-17-11-27-11s-20 4-27 11l-30 30c-13 13-33 13-46 0l-30-30c-7-7-17-11-27-11s-20 4-27 11l-34 34c-11 11-28 13-41 4l-17-11c-6-4-13-6-20-6-20 0-37 17-37 37 0 7 2 14 6 20z"/></svg><span class="nav-label">{angelusLabel}</span><span class="season-pip" aria-hidden="true"></span></a></li>
		{:else}
			<li style="--active-fill: var(--nord14)"><a href={angelusHref} class:active={isActive(angelusHref)} title={angelusLabel}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="6 -274 564 548" fill="currentColor"><path d="M392-162c-4-10-9-18-15-26 5-4 7-8 7-12 0-18-43-32-96-32s-96 14-96 32c0 4 3 8 7 12-6 8-11 16-15 26-15-11-24-24-24-38 0-35 57-64 128-64s128 29 128 64c0 14-9 27-24 38zm-104-22c35 0 64 29 64 64s-29 64-64 64-64-29-64-64 29-64 64-64zM82 159c3-22-3-48-20-64C34 68 16 30 16-12v-64c0-42 34-76 76-76 23 0 44 10 59 27l65 78c-21 16-37 40-43 67l-43 195c-4 17-2 34 5 49h-21c-26 0-46-24-42-50l10-55zm364 56L403 20c-6-27-21-51-42-67l64-77c15-18 36-28 59-28 42 0 76 34 76 76v64c0 42-18 80-46 107-17 16-23 42-20 64l10 56c4 26-16 49-42 49h-20c6-15 8-32 4-49zM220 31c7-32 35-55 68-55s61 23 68 55l43 194c5 20-11 39-31 39H208c-21 0-36-19-31-39l43-194z"/></svg><span class="nav-label">{angelusLabel}</span></a></li>
		{/if}
		<li style="--active-fill: var(--nord11)"><a href={bibleHref} class:active={isActive(bibleHref)} title={t.bible}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg><span class="nav-label">{t.bible}</span></a></li>
		<li style="--active-fill: var(--nord13)"><a href={katecheseHref} class:active={isActive(`/${data.faithLang}/katechese`) || isActive(katecheseHref)} title={t.catechesis}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg><span class="nav-label">{t.catechesis}</span></a></li>
		<li style="--active-fill: var(--nord10)"><a href={apologetikHref} class:active={isActive(apologetikHref)} title={t.apologetics}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg><span class="nav-label">{t.apologetics}</span></a></li>
		<li style="--active-fill: var(--nord15)"><a href={calendarHref} class:active={isActive(calendarHref)} title={t.calendar}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg><span class="nav-label">{t.calendar}</span></a></li>
		</ul>
	{/snippet}

	{#snippet language_selector_mobile()}
		<LanguageSelector lang={typedLang} />
	{/snippet}

	{#snippet language_selector_desktop()}
		<LanguageSelector lang={typedLang} />
	{/snippet}

	{#snippet right_side()}
		<UserHeader user={data.session?.user}></UserHeader>
	{/snippet}

	{@render children()}
</Header>

<style>
	/* Pulsating white pip on the Regina Cæli nav link during eastertide.
	   Mirrors the recipe header's sync indicator dot: 8px circle, double
	   box-shadow halo, slow breathe. White instead of green because Tempus
	   Paschale's liturgical color is white. */
	:global(.site_header li > a.regina-nav) {
		position: relative;
	}
	:global(.regina-nav .season-pip) {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ffffff;
		/* Dark mode default: bright white halo against the dark nav bar. */
		box-shadow:
			0 0 0 2px rgba(255, 255, 255, 0.45),
			0 0 6px rgba(255, 255, 255, 0.85);
		animation: regina-season-pulse 4s ease-in-out infinite;
		pointer-events: none;
	}
	/* Light mode: white pip blends into the light nav bar — swap to a dark
	   drop shadow so the dot still reads. */
	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme]) .regina-nav .season-pip) {
			box-shadow:
				0 0 0 1px rgba(0, 0, 0, 0.18),
				0 1px 4px rgba(0, 0, 0, 0.45);
		}
	}
	:global(:root[data-theme="light"] .regina-nav .season-pip) {
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.18),
			0 1px 4px rgba(0, 0, 0, 0.45);
	}
	@keyframes regina-season-pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.55; transform: scale(0.85); }
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.regina-nav .season-pip) { animation: none; }
	}
</style>
