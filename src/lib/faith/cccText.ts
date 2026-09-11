/**
 * The stored Catechism markup carries only what is the same in every language:
 * a footnote's number, and a citation's passage as `data-b="joh/3/34"`. Turning
 * those into addresses needs to know which Bible the reader is reading, so it
 * happens here, wherever the text is about to be shown — the reader, the API a
 * peek calls, the glossary.
 */
import { bibleVersePath } from './bibleCanon';
import type { CccLang } from './cccTypes';

const CITATION = /<a class="ref" (?:data-ref="([^"]*)" )?data-b="([^"]+)"/g;
const MARKER = /<sup class="fn" data-fn="(\d+)">(\d+)<\/sup>/g;

type Options = {
	/**
	 * What to do with a footnote marker: `link` points it at the note of that
	 * number in `section`, `drop` removes it — a peek shows no notes.
	 */
	notes?: { kind: 'link'; section: string } | { kind: 'drop' };
};

export function addressed(lang: CccLang, html: string, options: Options = {}): string {
	const notes = options.notes ?? { kind: 'drop' as const };
	return html
		.replace(MARKER, (_, k: string, shown: string) =>
			notes.kind === 'drop' ? '' : `<sup class="cfn"><a id="${notes.section}-ref-${k}" href="#${notes.section}-note-${k}" data-fn="${k}">${shown}</a></sup>`
		)
		.replace(CITATION, (_, ref: string | undefined, passage: string) => {
			// A psalm carries no verse — the two numberings do not agree on one
			// — so it links to the psalm and stays out of the peeks.
			const [slug, chapter, verses] = passage.split('/');
			const verse = verses ? Number(verses.split('-')[0]) : undefined;
			const href = bibleVersePath(lang, slug, Number(chapter), verse);
			return `<a class="ref"${ref ? ` data-ref="${ref}"` : ''} href="${href}"`;
		});
}

/** Reader address of a paragraph: /glaube/katechismus/2095, per language. */
export function cccPath(lang: CccLang, ref: string | number): string {
	const section = lang === 'en' ? 'faith/catechism' : lang === 'la' ? 'fides/catechismus' : 'glaube/katechismus';
	return `/${section}/${ref}`;
}
