import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canonSlug } from '$lib/faith/bibleCanon';
import { chapterCount } from '$lib/faith/readingPlan';
import { fatherFor, verseEntries } from '$lib/server/commentary';

// GET /api/glaube/bibel/kommentar?book=joh&chapter=3&verse=1&author=augustine
// One Father's excerpts on one verse, in the language of the faith slug where
// a translation exists, English otherwise. Static text: cached for a day.
export const GET: RequestHandler = async ({ url, params, setHeaders }) => {
	const slug = canonSlug(url.searchParams.get('book') ?? '');
	const chapter = Number(url.searchParams.get('chapter'));
	const verse = Number(url.searchParams.get('verse'));
	const author = url.searchParams.get('author') ?? '';
	if (!slug || !Number.isInteger(chapter) || chapter < 1 || chapter > chapterCount(slug) + 6) throw error(400, 'book and chapter');
	if (!Number.isInteger(verse) || verse < 1) throw error(400, 'verse');
	if (!/^[a-z0-9-]{1,48}$/.test(author)) throw error(400, 'author');
	const lang = params.faithLang === 'faith' ? 'en' : params.faithLang === 'fides' ? 'la' : 'de';
	const [father, entries] = await Promise.all([fatherFor(author), verseEntries(slug, chapter, verse, author, lang)]);
	if (!father) throw error(404, 'unknown author');
	setHeaders({ 'Cache-Control': 'public, max-age=86400' });
	return json({ author: { id: father.id, name: father.name, saint: !!father.saint, died: father.died, group: father.group, portrait: father.portrait ? { artist: father.portrait.artist, title: father.portrait.title, year: father.portrait.year } : null }, entries });
};
