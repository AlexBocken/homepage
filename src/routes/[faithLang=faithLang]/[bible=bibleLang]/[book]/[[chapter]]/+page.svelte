<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import BibleReader from '$lib/components/faith/bible/BibleReader.svelte';
	import BookPage from '$lib/components/faith/bible/BookPage.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import { stripMarkers } from '$lib/faith/bibleText';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);
	const ch = $derived(data.kind === 'chapter' ? data.chapter : null);
	const bookMeta = $derived(data.kind === 'chapter' ? data.chapter.book : data.page.book);
	const name = $derived(bookMeta.canon?.[lang] ?? bookMeta.name);
	const description = $derived(
		ch
			? ch.verses
					.slice(0, 2)
					.map((v) => stripMarkers(lang === 'en' && v.english ? v.english : lang === 'la' && v.latin ? v.latin : v.german))
					.join(' ')
					.slice(0, 200)
			: `${name}: ${t.bible_book_intro}, ${t.bible_commentaries}`
	);
</script>

<Seo title={`${name}${ch ? ` ${ch.chapter}` : ''} — ${t.bible_title} — Bocken`} {description} {lang} ogType="article" />

{#if data.kind === 'chapter'}
	<!-- Keyed on the language too: the same chapter on another language route is a new reader, opening on that route's Bible. -->
	{#key `${lang}/${data.chapter.book.slug}/${data.chapter.chapter}`}
		<BibleReader {lang} faithLang={data.faithLang} bibleLang={data.bibleLang} chapter={data.chapter} availableBooks={data.availableBooks} prefs={data.prefs} reading={data.reading} today={data.today} commentary={data.commentary} />
	{/key}
{:else}
	<BookPage {lang} faithLang={data.faithLang} bibleLang={data.bibleLang} page={data.page} prefaces={data.prefaces} coverage={data.coverage} prefs={data.prefs} firstUnread={data.firstUnread} />
{/if}
