<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import BibleReader from '$lib/components/faith/bible/BibleReader.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import { stripMarkers } from '$lib/faith/bibleText';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);
	const ch = $derived(data.chapter);
	const name = $derived(ch.book.canon?.[lang] ?? ch.book.name);
	const description = $derived(
		ch.verses
			.slice(0, 2)
			.map((v) => stripMarkers(lang === 'en' && v.english ? v.english : lang === 'la' && v.latin ? v.latin : v.german))
			.join(' ')
			.slice(0, 200)
	);
</script>

<Seo title={`${name} ${ch.chapter} — ${t.bible_title} — Bocken`} {description} {lang} ogType="article" />

<svelte:head>
	<!-- The reader's serif; preloaded so the swap happens before first paint. -->
	<link rel="preload" href="/fonts/LinLibertine_Rah.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

{#key `${ch.book.slug}/${ch.chapter}`}
	<BibleReader {lang} faithLang={data.faithLang} bibleLang={data.bibleLang} chapter={ch} availableBooks={data.availableBooks} prefs={data.prefs} reading={data.reading} today={data.today} />
{/key}
