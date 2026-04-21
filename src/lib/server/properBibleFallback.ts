import { translateRefToTarget } from './bibleRefLatin';
import { lookupReference } from './bible';
import { resolveStaticAsset } from './staticAsset';

export type FallbackLang = 'en' | 'de';

const TSV_NAME: Record<FallbackLang, string> = {
	en: 'drb.tsv',
	de: 'allioli.tsv'
};

// Latin propers often cite successive verses in compact form like
// "Ps 80:2; 80:3; 80:4; 80:5" (book implicit after the first segment) or
// "Ps 32:12 ; 32:6". Expand each segment into a standalone "Book Chap:Verse"
// reference so downstream parsing can handle them one at a time.
export function splitCompoundRef(ref: string): string[] {
	const parts = ref
		.split(/\s*;\s*/)
		.map((s) => s.trim())
		.filter(Boolean);
	if (parts.length <= 1) return parts;
	const bookMatch = parts[0].match(/^(\d?\s?[A-Za-z.]+)/);
	if (!bookMatch) return parts;
	const book = bookMatch[0].trim();
	return parts.map((p, i) => (i === 0 || !/^\d/.test(p) ? p : `${book} ${p}`));
}

// Allioli (and DRB) include the Psalm superscription ("Zum Ende, ein Psalm
// Davids.", "Unto the end, a psalm of David.") as the opening of verse 1.
// The Latin propers always skip the title phrase, so strip it when our
// fallback lookup pulls a Psalm verse 1 in.
const PS_TITLE_DE = /^(Zum Ende|Ein (Psalm|Gebet|Lied|Lobpsalm|Gesang|Hymnus)|Eine Unterweisung|Aufschrift|Am (ersten|Sabbat)|Loblied|Psalm Davids|Dem Sangmeister)/;
const PS_TITLE_EN = /^(Unto the end|A psalm|A canticle|A song|To the end|For the end|An instruction|Of David)/i;
function stripPsalmSuperscription(text: string, lang: FallbackLang): string {
	const re = lang === 'de' ? PS_TITLE_DE : PS_TITLE_EN;
	if (!re.test(text)) return text;
	// Drop the first sentence (ends at first period/exclamation/question).
	return text.replace(/^[^.!?]*[.!?]\s*/, '').trim();
}

export function fetchLocalFromBible(refs: string[], lang: FallbackLang): string | null {
	if (!refs || refs.length === 0) return null;
	const tsvPath = resolveStaticAsset(TSV_NAME[lang]);
	const collected: string[] = [];
	for (const rawRef of refs) {
		for (const seg of splitCompoundRef(rawRef)) {
			const translated = translateRefToTarget(seg, lang);
			if (!translated) continue;
			const lookup = lookupReference(translated, tsvPath);
			if (!lookup) continue;
			const isPsalm = /^Ps\s/i.test(translated);
			const parts = lookup.verses.map((v) => {
				if (isPsalm && v.verse === 1) return stripPsalmSuperscription(v.text, lang);
				return v.text;
			});
			const text = parts.join(' ').trim();
			if (text) collected.push(text);
		}
	}
	if (collected.length === 0) return null;
	return collected.join(' ');
}
