/**
 * The `?latin=` switch of the prayer pages, read on the server so the page
 * renders right without JavaScript: absent or anything but `0` means bilingual.
 */
export function parseLatinParam(url: URL): { initialLatin: boolean; hasUrlLatin: boolean } {
	const latinParam = url.searchParams.get('latin');
	const hasUrlLatin = latinParam !== null;
	const initialLatin = hasUrlLatin ? latinParam !== '0' : true;
	return { initialLatin, hasUrlLatin };
}
