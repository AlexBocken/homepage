<script>
import '$lib/css/christ.css';
import { page } from '$app/stores';
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
import LanguageSelector from '$lib/components/LanguageSelector.svelte';
let { data, children } = $props();

const isEnglish = $derived(data.lang === 'en');
const prayersPath = $derived(isEnglish ? 'prayers' : 'gebete');
const rosaryPath = $derived(isEnglish ? 'rosary' : 'rosenkranz');

const labels = $derived({
	prayers: isEnglish ? 'Prayers' : 'Gebete',
	rosary: isEnglish ? 'Rosary' : 'Rosenkranz'
});

function isActive(path) {
	const currentPath = $page.url.pathname;
	// Check if current path starts with the link path
	return currentPath.startsWith(path);
}
</script>
<svelte:head>
	<link rel="preload" href="/fonts/crosses.woff2" as="font" type="font/woff2" crossorigin>
</svelte:head>
<Header>
	{#snippet links()}
		<ul class=site_header>
		<li><a href="/{data.faithLang}/{prayersPath}" class:active={isActive(`/${data.faithLang}/${prayersPath}`)} title={labels.prayers}><svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 640 512" fill="currentColor"><path d="M351.2 4.8c3.2-2 6.6-3.3 10-4.1c4.7-1 9.6-.9 14.1 .1c7.7 1.8 14.8 6.5 19.4 13.6L514.6 194.2c8.8 13.1 13.4 28.6 13.4 44.4v73.5c0 6.9 4.4 13 10.9 15.2l79.2 26.4C631.2 358 640 370.2 640 384v96c0 9.9-4.6 19.3-12.5 25.4s-18.1 8.1-27.7 5.5L431 465.9c-56-14.9-95-65.7-95-123.7V224c0-17.7 14.3-32 32-32s32 14.3 32 32v80c0 8.8 7.2 16 16 16s16-7.2 16-16V219.1c0-7-1.8-13.8-5.3-19.8L340.3 48.1c-1.7-3-2.9-6.1-3.6-9.3c-1-4.7-1-9.6 .1-14.1c1.9-8 6.8-15.2 14.3-19.9zm-62.4 0c7.5 4.6 12.4 11.9 14.3 19.9c1.1 4.6 1.2 9.4 .1 14.1c-.7 3.2-1.9 6.3-3.6 9.3L213.3 199.3c-3.5 6-5.3 12.9-5.3 19.8V304c0 8.8 7.2 16 16 16s16-7.2 16-16V224c0-17.7 14.3-32 32-32s32 14.3 32 32V342.3c0 58-39 108.7-95 123.7l-168.7 45c-9.6 2.6-19.9 .5-27.7-5.5S0 490 0 480V384c0-13.8 8.8-26 21.9-30.4l79.2-26.4c6.5-2.2 10.9-8.3 10.9-15.2V238.5c0-15.8 4.7-31.2 13.4-44.4L245.2 14.5c4.6-7.1 11.7-11.8 19.4-13.6c4.6-1.1 9.4-1.2 14.1-.1c3.5 .8 6.9 2.1 10 4.1z"/></svg><span class="nav-label">{labels.prayers}</span></a></li>
		<li><a href="/{data.faithLang}/{rosaryPath}" class:active={isActive(`/${data.faithLang}/${rosaryPath}`)} title={labels.rosary}><svg class="nav-icon" width="16" height="16" viewBox="0 0 512 512" fill="currentColor"><path d="M241.251,145.056c-39.203-17.423-91.472,17.423-104.54,60.982c-13.068,43.558,8.712,117.608,65.337,143.742 c56.626,26.135,108.896-8.712,87.117-39.202c-74.049-8.712-121.963-87.117-100.184-126.319S280.453,162.479,241.251,145.056z"/><path d="M337.079,271.375c47.914-39.202,21.779-126.319-17.423-135.031c-39.202-8.712-56.626,13.068-26.135,39.202 c39.203,30.491-8.712,91.472-39.202,87.117C254.318,262.663,289.165,310.577,337.079,271.375z"/><path d="M254.318,119.788c43.558-17.423,74.049-9.579,100.184,16.556c13.068-39.202-30.491-104.54-108.896-113.252 S93.153,118.921,127.999,171.191C136.711,153.767,188.981,106.721,254.318,119.788z"/><path d="M110.576,245.24C36.527,262.663,28.87,335.248,45.239,380.27c17.423,47.914,4.356,82.761,26.135,91.472 c20.622,8.253,91.472,13.068,152.454,17.423c60.982,4.356,108.896-47.914,91.472-108.896 C141.067,410.761,110.576,284.442,110.576,245.24z"/><path d="M93.883,235.796c0,0,2.178-28.313,10.89-43.558c-4.356-4.356-8.712-21.779-8.712-21.779 s-4.356-19.601-4.356-34.846c-32.669-6.534-89.295,34.846-91.472,41.38c-2.178,6.534,10.889,80.583,39.202,82.761 C69.927,235.796,93.883,235.796,93.883,235.796z"/><path d="M489.533,175.546c-39.202-82.761-113.252-65.337-113.252-65.337s4.356,21.779-4.356,34.846 c43.558,47.914,13.067,146.643-24.681,158.265c130.675,56.626,159.712-58.081,164.068-75.504 C515.668,210.393,498.245,197.326,489.533,175.546z"/><path d="M454.108,332.076c-22.359,15.841-85.663,11.613-121.964-7.265c1.446,14.514-13.067,37.756-20.325,39.202 c27.59,11.621,53.725,62.436,7.265,116.161c18.878,18.87,95.828,4.356,140.842-24.689c7.325-4.722,18.869-52.27,21.779-79.851 C485.56,339.103,488.963,307.387,454.108,332.076z"/><path d="M257.227,213.294c-18.928,5.164-30.439-6.27-23.234-18.869c5.811-10.167,5.266-20.69-8.712-13.068 c-29.044,17.423-11.612,66.784,24.689,62.428c49.36-17.423,27.581-62.428,14.514-60.982 C251.417,184.249,273.196,208.938,257.227,213.294z"/></svg><span class="nav-label">{labels.rosary}</span></a></li>
		</ul>
	{/snippet}

	{#snippet language_selector_mobile()}
		<LanguageSelector lang={data.lang} />
	{/snippet}

	{#snippet language_selector_desktop()}
		<LanguageSelector lang={data.lang} />
	{/snippet}

	{#snippet right_side()}
		<UserHeader user={data.session?.user}></UserHeader>
	{/snippet}

	{@render children()}
</Header>
