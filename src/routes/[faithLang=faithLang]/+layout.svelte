<script>
import '$lib/css/christ.css';
import { page } from '$app/stores';
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
import LanguageSelector from '$lib/components/LanguageSelector.svelte';
import { isEastertide } from '$lib/js/easter.svelte';
let { data, children } = $props();

const isEnglish = $derived(data.lang === 'en');
const isLatin = $derived(data.lang === 'la');
const eastertide = isEastertide();
const prayersHref = $derived(isLatin ? '/fides/orationes' : `/${data.faithLang}/${isEnglish ? 'prayers' : 'gebete'}`);
const rosaryHref = $derived(`/${data.faithLang}/${isLatin ? 'rosarium' : isEnglish ? 'rosary' : 'rosenkranz'}`);
const calendarHref = $derived(`/${data.faithLang}/${isLatin ? 'calendarium' : isEnglish ? 'calendar' : 'kalender'}`);
const angelusHref = $derived(eastertide
	? `${prayersHref}/regina-caeli`
	: `${prayersHref}/angelus`);
const angelusLabel = $derived(eastertide ? 'Regína Cæli' : 'Angelus');

const labels = $derived({
	prayers: isLatin ? 'Orationes' : isEnglish ? 'Prayers' : 'Gebete',
	rosary: isLatin ? 'Rosarium' : isEnglish ? 'Rosary' : 'Rosenkranz',
	catechesis: isEnglish ? 'Catechesis' : 'Katechese',
	calendar: isLatin ? 'Calendarium' : isEnglish ? 'Calendar' : 'Kalender'
});

const typedLang = $derived(/** @type {'de' | 'en'} */ (data.lang));

/** @param {string} path */
function isActive(path) {
	const currentPath = $page.url.pathname;
	return currentPath.startsWith(path);
}

const prayersActive = $derived(isActive(prayersHref) && !isActive(angelusHref));
</script>
<svelte:head>
	<link rel="preload" href="/fonts/crosses.woff2" as="font" type="font/woff2" crossorigin="anonymous">
</svelte:head>
<Header>
	{#snippet links()}
		<ul class=site_header>
		<li style="--active-fill: var(--nord12)"><a href={prayersHref} class:active={prayersActive} title={labels.prayers}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 640 512" fill="currentColor"><path d="M351.2 4.8c3.2-2 6.6-3.3 10-4.1c4.7-1 9.6-.9 14.1 .1c7.7 1.8 14.8 6.5 19.4 13.6L514.6 194.2c8.8 13.1 13.4 28.6 13.4 44.4v73.5c0 6.9 4.4 13 10.9 15.2l79.2 26.4C631.2 358 640 370.2 640 384v96c0 9.9-4.6 19.3-12.5 25.4s-18.1 8.1-27.7 5.5L431 465.9c-56-14.9-95-65.7-95-123.7V224c0-17.7 14.3-32 32-32s32 14.3 32 32v80c0 8.8 7.2 16 16 16s16-7.2 16-16V219.1c0-7-1.8-13.8-5.3-19.8L340.3 48.1c-1.7-3-2.9-6.1-3.6-9.3c-1-4.7-1-9.6 .1-14.1c1.9-8 6.8-15.2 14.3-19.9zm-62.4 0c7.5 4.6 12.4 11.9 14.3 19.9c1.1 4.6 1.2 9.4 .1 14.1c-.7 3.2-1.9 6.3-3.6 9.3L213.3 199.3c-3.5 6-5.3 12.9-5.3 19.8V304c0 8.8 7.2 16 16 16s16-7.2 16-16V224c0-17.7 14.3-32 32-32s32 14.3 32 32V342.3c0 58-39 108.7-95 123.7l-168.7 45c-9.6 2.6-19.9 .5-27.7-5.5S0 490 0 480V384c0-13.8 8.8-26 21.9-30.4l79.2-26.4c6.5-2.2 10.9-8.3 10.9-15.2V238.5c0-15.8 4.7-31.2 13.4-44.4L245.2 14.5c4.6-7.1 11.7-11.8 19.4-13.6c4.6-1.1 9.4-1.2 14.1-.1c3.5 .8 6.9 2.1 10 4.1z"/></svg><span class="nav-label">{labels.prayers}</span></a></li>
		<li style="--active-fill: var(--nord11)"><a href={rosaryHref} class:active={isActive(rosaryHref)} title={labels.rosary}><svg class="nav-icon" width="16" height="16" viewBox="0 0 512 512" fill="currentColor"><path d="M241.251,145.056c-39.203-17.423-91.472,17.423-104.54,60.982c-13.068,43.558,8.712,117.608,65.337,143.742 c56.626,26.135,108.896-8.712,87.117-39.202c-74.049-8.712-121.963-87.117-100.184-126.319S280.453,162.479,241.251,145.056z"/><path d="M337.079,271.375c47.914-39.202,21.779-126.319-17.423-135.031c-39.202-8.712-56.626,13.068-26.135,39.202 c39.203,30.491-8.712,91.472-39.202,87.117C254.318,262.663,289.165,310.577,337.079,271.375z"/><path d="M254.318,119.788c43.558-17.423,74.049-9.579,100.184,16.556c13.068-39.202-30.491-104.54-108.896-113.252 S93.153,118.921,127.999,171.191C136.711,153.767,188.981,106.721,254.318,119.788z"/><path d="M110.576,245.24C36.527,262.663,28.87,335.248,45.239,380.27c17.423,47.914,4.356,82.761,26.135,91.472 c20.622,8.253,91.472,13.068,152.454,17.423c60.982,4.356,108.896-47.914,91.472-108.896 C141.067,410.761,110.576,284.442,110.576,245.24z"/><path d="M93.883,235.796c0,0,2.178-28.313,10.89-43.558c-4.356-4.356-8.712-21.779-8.712-21.779 s-4.356-19.601-4.356-34.846c-32.669-6.534-89.295,34.846-91.472,41.38c-2.178,6.534,10.889,80.583,39.202,82.761 C69.927,235.796,93.883,235.796,93.883,235.796z"/><path d="M489.533,175.546c-39.202-82.761-113.252-65.337-113.252-65.337s4.356,21.779-4.356,34.846 c43.558,47.914,13.067,146.643-24.681,158.265c130.675,56.626,159.712-58.081,164.068-75.504 C515.668,210.393,498.245,197.326,489.533,175.546z"/><path d="M454.108,332.076c-22.359,15.841-85.663,11.613-121.964-7.265c1.446,14.514-13.067,37.756-20.325,39.202 c27.59,11.621,53.725,62.436,7.265,116.161c18.878,18.87,95.828,4.356,140.842-24.689c7.325-4.722,18.869-52.27,21.779-79.851 C485.56,339.103,488.963,307.387,454.108,332.076z"/><path d="M257.227,213.294c-18.928,5.164-30.439-6.27-23.234-18.869c5.811-10.167,5.266-20.69-8.712-13.068 c-29.044,17.423-11.612,66.784,24.689,62.428c49.36-17.423,27.581-62.428,14.514-60.982 C251.417,184.249,273.196,208.938,257.227,213.294z"/></svg><span class="nav-label">{labels.rosary}</span></a></li>
		{#if eastertide}
			<li style="--active-fill: var(--nord14)"><a href={angelusHref} class:active={isActive(angelusHref)} title={angelusLabel}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="-10 -274 532 548" fill="currentColor"><path d="M256-168c27 0 48-21 48-48s-21-48-48-48-48 21-48 48 21 48 48 48zM6-63l122 199-56 70c-5 7-8 14-8 23 0 19 16 35 36 35h312c20 0 36-16 36-35 0-9-3-16-8-23l-56-70L507-63c3-6 5-13 5-20 0-20-16-37-37-37-7 0-14 2-20 6l-17 12c-13 8-30 6-40-4l-35-35c-7-7-17-11-27-11s-20 4-27 11l-30 30c-13 13-33 13-46 0l-30-30c-7-7-17-11-27-11s-20 4-27 11l-34 34c-11 11-28 13-41 4l-17-11c-6-4-13-6-20-6-20 0-37 17-37 37 0 7 2 14 6 20z"/></svg><span class="nav-label">{angelusLabel}</span></a></li>
		{:else}
			<li style="--active-fill: var(--nord14)"><a href={angelusHref} class:active={isActive(angelusHref)} title={angelusLabel}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="6 -274 564 548" fill="currentColor"><path d="M392-162c-4-10-9-18-15-26 5-4 7-8 7-12 0-18-43-32-96-32s-96 14-96 32c0 4 3 8 7 12-6 8-11 16-15 26-15-11-24-24-24-38 0-35 57-64 128-64s128 29 128 64c0 14-9 27-24 38zm-104-22c35 0 64 29 64 64s-29 64-64 64-64-29-64-64 29-64 64-64zM82 159c3-22-3-48-20-64C34 68 16 30 16-12v-64c0-42 34-76 76-76 23 0 44 10 59 27l65 78c-21 16-37 40-43 67l-43 195c-4 17-2 34 5 49h-21c-26 0-46-24-42-50l10-55zm364 56L403 20c-6-27-21-51-42-67l64-77c15-18 36-28 59-28 42 0 76 34 76 76v64c0 42-18 80-46 107-17 16-23 42-20 64l10 56c4 26-16 49-42 49h-20c6-15 8-32 4-49zM220 31c7-32 35-55 68-55s61 23 68 55l43 194c5 20-11 39-31 39H208c-21 0-36-19-31-39l43-194z"/></svg><span class="nav-label">{angelusLabel}</span></a></li>
		{/if}
		<li style="--active-fill: var(--nord13)"><a href="/{data.faithLang}/katechese" class:active={isActive(`/${data.faithLang}/katechese`)} title={labels.catechesis}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M16 12h2"/><path d="M16 8h2"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/><path d="M6 12h2"/><path d="M6 8h2"/></svg><span class="nav-label">{labels.catechesis}</span></a></li>
		<li style="--active-fill: var(--nord15)"><a href={calendarHref} class:active={isActive(calendarHref)} title={labels.calendar}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg><span class="nav-label">{labels.calendar}</span></a></li>
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
