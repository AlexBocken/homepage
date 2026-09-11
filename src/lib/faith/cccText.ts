/**
 * The stored Catechism markup carries only what is the same in every language:
 * a footnote's number, and a citation's passage as `data-b="joh/3/34"`. Turning
 * those into addresses needs to know which Bible the reader is reading, so it
 * happens here, wherever the text is about to be shown — the reader, the API a
 * peek calls, the glossary.
 */
import { bibleVersePath } from './bibleCanon';
import { canonPath, councilPath } from './councilTypes';
import type { CccLang } from './cccTypes';

const CITATION = /<a class="ref" (?:data-ref="([^"]*)" )?data-b="([^"]+)"/g;
const MARKER = /<sup class="fn" data-fn="(\d+)">(\d+)<\/sup>/g;
/** A citation of the council or the Code, as `linkifyDocs` leaves it. */
const COUNCIL = /<a class="dref" data-council="([a-z]{2})\/(\d+)(-\d+)?"/g;
const CANON = /<a class="dref" data-canon="(\d+)(-\d+)?"/g;

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
		})
		// The council and the Code are numbered the same in every language, so
		// the markup carries the number alone and the address is made here.
		.replace(COUNCIL, (_, abbr: string, article: string, to: string | undefined) => `<a class="dref" data-council="${abbr}/${article}${to ?? ''}" href="${councilPath(lang, abbr)}#a${article}"`)
		.replace(CANON, (_, canon: string, to: string | undefined) => `<a class="dref" data-canon="${canon}${to ?? ''}" href="${canonPath(lang, Number(canon))}#c${canon}"`);
}

/** Reader address of a paragraph: /glaube/katechese/kkk/2095, per language. */
export function cccPath(lang: CccLang, ref: string | number): string {
	const section = lang === 'en' ? 'faith/catechesis/ccc' : lang === 'la' ? 'fides/catechesis/cce' : 'glaube/katechese/kkk';
	return `/${section}/${ref}`;
}
