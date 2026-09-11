/**
 * The 1983 Code of Canon Law, in German, English and Latin, from vatican.va.
 *
 *   pnpm cic:import            # build from the disk cache (or fetch once)
 *   pnpm cic:import --refresh  # re-download
 *
 * The Catechism cites the Code 143 times, nearly always for a single canon —
 * "CIC, can. 1055 § 1" — so what a reader wants on hover is that canon and the
 * book it stands in, which is all this keeps.
 *
 * Writes `src/content/cic/<lang>.json`, and refuses a language that does not
 * come out at all 1752 canons.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { page } from './ccc/fetch';
import { LAST_CANON, bookOf, cicIndexUrl, cicPages, parseCanons, withoutEditorial } from './council/cic';
import type { Canon, CouncilLang } from '../src/lib/faith/councilTypes';

const LANGS: CouncilLang[] = ['de', 'en', 'la'];
const CONTENT = path.resolve('src', 'content', 'cic');

let fatal = false;
const built = new Map<CouncilLang, Canon[]>();

for (const lang of LANGS) {
	const index = await page(cicIndexUrl(lang), `cic/${lang}/index.html`);
	const urls = cicPages(lang, index);
	const canons = new Map<number, Canon>();
	const where: string[] = [];
	for (const [i, url] of urls.entries()) {
		const html = await page(url, `cic/${lang}/${String(i).padStart(3, '0')}-${url.split('/').pop()}`);
		parseCanons(html, canons, where);
	}

	for (const canon of canons.values()) {
		canon.html = withoutEditorial(canon.html);
		// The book is settled by the canon's number; the page only says what
		// stands below it.
		canon.where = [bookOf(canon.n, lang), ...canon.where.slice(1)];
	}

	const missing: number[] = [];
	for (let n = 1; n <= LAST_CANON; n++) if (!canons.has(n)) missing.push(n);
	const stray = [...canons.keys()].filter((n) => n < 1 || n > LAST_CANON);
	if (missing.length || stray.length) {
		console.error(`[cic] ${lang}: ${urls.length} pages, ${canons.size} canons — missing ${missing.length ? summarise(missing) : 'none'}${stray.length ? `, stray ${stray.join(', ')}` : ''}`);
		fatal = true;
	} else {
		console.log(`[cic] ${lang}: ${urls.length} pages, ${canons.size} canons`);
	}
	built.set(
		lang,
		[...canons.values()].sort((a, b) => a.n - b.n)
	);
}

if (fatal) {
	console.error('[cic] refusing to write a Code with holes in it');
	process.exit(1);
}

await mkdir(CONTENT, { recursive: true });
for (const lang of LANGS) await writeFile(path.join(CONTENT, `${lang}.json`), JSON.stringify(built.get(lang)));

console.log('[cic] written');

/** "1, 2, 3, 7" as "1-3, 7", so a gap report stays readable. */
function summarise(numbers: number[]): string {
	const runs: string[] = [];
	for (let i = 0; i < numbers.length; ) {
		let j = i;
		while (j + 1 < numbers.length && numbers[j + 1] === numbers[j] + 1) j++;
		runs.push(i === j ? `${numbers[i]}` : `${numbers[i]}-${numbers[j]}`);
		i = j + 1;
	}
	return `${numbers.length} (${runs.slice(0, 12).join(', ')}${runs.length > 12 ? ', …' : ''})`;
}
