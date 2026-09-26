import { error } from '@sveltejs/kit';
import { pathLang } from '$lib/js/slugs';

type Fetch = typeof globalThis.fetch;

/** The error page is written in German and English; Latin pages get German. */
export function errorLang(pathname: string): 'en' | 'de' {
	return pathLang(pathname) === 'en' ? 'en' : 'de';
}

export async function getRandomVerse(
	fetch: Fetch,
	pathname: string
): Promise<{ text: string; reference: string; href?: string | null } | null> {
	const endpoint =
		errorLang(pathname) === 'en'
			? '/api/faith/bibel/zufallszitat'
			: '/api/glaube/bibel/zufallszitat';
	try {
		const res = await fetch(endpoint);
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

export async function errorWithVerse(
	fetch: Fetch,
	pathname: string,
	status: number,
	message = ''
): Promise<never> {
	const bibleQuote = await getRandomVerse(fetch, pathname);
	error(status, { message, bibleQuote, lang: errorLang(pathname) });
}
