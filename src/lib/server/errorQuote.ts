import { error } from '@sveltejs/kit';

type Fetch = typeof globalThis.fetch;

function detectLang(pathname: string): 'en' | 'de' {
	return pathname.startsWith('/faith/') || pathname.startsWith('/recipes/') ? 'en' : 'de';
}

export async function getRandomVerse(
	fetch: Fetch,
	pathname: string
): Promise<{ text: string; reference: string } | null> {
	const endpoint =
		detectLang(pathname) === 'en'
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
	error(status, { message, bibleQuote, lang: detectLang(pathname) });
}
