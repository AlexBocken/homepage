/**
 * Prompt construction and response handling for the hike alt-text generator.
 *
 * Split out of `scripts/generate-hike-alt-text.ts` so the parts that don't need
 * a model — the prompt, the DE/EN split, the cleanup — are unit-testable
 * without an Ollama server. The script owns everything with I/O.
 */

/**
 * Hard ceiling on a stored description. JAWS truncates around here, so anything
 * longer is text nobody hears. Enforced in `cleanAltText`.
 */
export const MAX_ALT_CHARS = 125;

/**
 * What the prompt asks for. Held below the hard cap because German compounds
 * run 15–20% longer than the English line the model drafts against, and a
 * description cut mid-clause reads worse than a shorter one.
 */
export const TARGET_ALT_CHARS = 110;

/** Everything the model is told about the hike as a whole. */
export type HikeContext = {
	title: string;
	summary: string;
	/** German month name, from the hike date. */
	month: string;
	/** SAC grade, T1–T6. */
	difficulty: string;
	tags: string[];
	/** Municipality / canton / country, as reverse-geocoded by build-hikes. */
	place: string;
};

/** Per-image situational detail: where on the route the photo was taken. */
export type ShotContext = {
	altitudeM?: number;
	elapsedMin?: number;
	distanceKm?: number;
	totalKm?: number;
};

export type AltTextPair = { de: string; en: string };

/**
 * One call, both languages, in a format that splits on a regex — the vision
 * tower dominates the cost of a request and it is identical for DE and EN, so
 * asking twice would pay it twice.
 *
 * The hike context is deliberately framed as *grounding, not content*. A vision
 * model handed a place name will cheerfully assert it saw that place, and alt
 * text naming the wrong mountain is worse than alt text naming none.
 */
export function buildPrompt(hike: HikeContext, shot: ShotContext): string {
	const contextLines: string[] = [];
	if (hike.title) contextLines.push(`Hike: ${hike.title}`);
	if (hike.place) {
		contextLines.push(
			`Region (background only — do not name it unless the photo is a wide panorama over it): ${hike.place}`
		);
	}
	if (hike.summary) contextLines.push(`About: ${hike.summary}`);
	const when = [hike.month && `month ${hike.month}`, hike.difficulty && `SAC grade ${hike.difficulty}`]
		.filter(Boolean)
		.join(' · ');
	if (when) contextLines.push(`When: ${when}`);
	if (hike.tags.length > 0) contextLines.push(`Keywords: ${hike.tags.slice(0, 5).join(', ')}`);

	const shotParts: string[] = [];
	if (typeof shot.altitudeM === 'number') shotParts.push(`${Math.round(shot.altitudeM)} m above sea level`);
	if (typeof shot.elapsedMin === 'number') shotParts.push(`${formatElapsed(shot.elapsedMin)} into the hike`);
	if (typeof shot.distanceKm === 'number' && typeof shot.totalKm === 'number') {
		shotParts.push(`km ${shot.distanceKm.toFixed(1)} of ${shot.totalKm.toFixed(1)}`);
	}
	if (shotParts.length > 0) contextLines.push(`Taken: ${shotParts.join(' · ')}`);

	return `Describe this hiking photo for a screen reader, in German and in English.

${contextLines.join('\n')}

Describe ONLY what is VISIBLE: the landscape and terrain, the trail, rock, snow, water, vegetation, farm animals, buildings or signposts, the sky and weather, and the light. Lead with the main subject.

Rules:
- The hike details above are background, not content. NEVER name a peak, hut, lake, village or building, and never state an altitude, a distance or a direction — you cannot see those. The only exception: a name legible on a signpost in the photo, and the broad region named above when the photo is plainly a wide view over it.
- Describe only what IS there. Never mention what is absent, missing or "not visible".
- If people are visible, refer to them generically ("zwei Wanderer" / "two hikers"). Never describe or identify individuals.
- Do not start with "Foto von", "Bild von", "photo of", "image of" or similar — describe the scene directly.
- One flowing sentence per language, not a list of observations, and at most 14 words. Keep the German under ${TARGET_ALT_CHARS} characters — German compounds run long.
- The German line must be natural, idiomatic German — never invent compound words — and must use Swiss High German spelling: always "ss", never the sharp-s character.

Answer with exactly two lines and nothing else:
DE: <German description>
EN: <English description>`;
}

/**
 * Follow-up asked once when a first answer overran the cap. Truncation is a
 * graceful fallback, but a description cut mid-clause is poor alt text, and the
 * image is already encoded in the model's context — a second pass over the same
 * conversation is far cheaper than the first.
 */
export function buildShorterPrompt(hike: HikeContext, shot: ShotContext): string {
	return `${buildPrompt(hike, shot)}

IMPORTANT: your previous answer was too long and got cut off. Answer again, much shorter — name only the single most important thing in the photo, at most 10 words per language.`;
}

/** True when `cleanAltText` had to cut a description to fit the hard cap. */
export function wasTruncated(pair: AltTextPair): boolean {
	return pair.de.endsWith('…') || pair.en.endsWith('…');
}

export function formatElapsed(min: number): string {
	if (min < 60) return `${min} min`;
	const h = Math.floor(min / 60);
	const m = min % 60;
	return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Pull the two descriptions out of a `DE: … / EN: …` response. Returns null if
 * either is missing, so the caller stores nothing rather than half an answer.
 */
export function parseBilingual(response: string): AltTextPair | null {
	// Reasoning models can still emit a <think> block despite think:false.
	const body = response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
	const de = body.match(/^\s*DE\s*:\s*(.+)$/im)?.[1];
	const en = body.match(/^\s*EN\s*:\s*(.+)$/im)?.[1];
	if (de && en) return pair(de, en);
	return parseUnlabelled(body);
}

/**
 * Fallback for the model's most common format slip: both descriptions, in the
 * requested order, with the `DE:` / `EN:` labels simply dropped. That accounted
 * for every parse failure in a 400-image run — throwing away two perfectly good
 * descriptions over a missing prefix would be wasteful.
 *
 * Guarded by a language check rather than trusting the order blindly: if the
 * first line doesn't look more German than the second, we'd rather store
 * nothing than store the pair swapped.
 */
function parseUnlabelled(body: string): AltTextPair | null {
	const lines = body
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	if (lines.length !== 2) return null;
	if (germanScore(lines[0]) <= germanScore(lines[1])) return null;
	return pair(lines[0], lines[1]);
}

function pair(de: string, en: string): AltTextPair | null {
	const cleanedDe = cleanAltText(de);
	const cleanedEn = cleanAltText(en);
	if (!cleanedDe || !cleanedEn) return null;
	return { de: cleanedDe, en: cleanedEn };
}

const GERMAN_MARKERS =
	/\b(?:der|die|das|den|dem|des|ein|eine|einem|einen|einer|und|mit|unter|über|vor|auf|im|in|zwischen|durch|blick|himmel|berge?|wiese|wald|pfad|weg)\b/gi;
const ENGLISH_MARKERS =
	/\b(?:the|a|an|and|with|under|over|before|on|in|between|through|view|sky|mountains?|meadow|forest|path|trail)\b/gi;

/** Rough "is this German rather than English" score. Umlauts are decisive. */
function germanScore(line: string): number {
	const umlauts = (line.match(/[äöüßÄÖÜ]/g) ?? []).length * 3; // ß-ok
	const german = (line.match(GERMAN_MARKERS) ?? []).length;
	const english = (line.match(ENGLISH_MARKERS) ?? []).length;
	return umlauts + german - english;
}

export function cleanAltText(text: string): string {
	let cleaned = text.trim().replace(/^["']|["']$/g, '');
	cleaned = cleaned.replace(/^(Alt[- ]?text|Alternativer Text|Beschreibung|Description)\s*:\s*/i, '');
	// Models slip back into "photo of …" despite the instruction; strip the
	// lead-in rather than spend another generation on it.
	cleaned = cleaned.replace(
		/^(?:ein[e]?\s+)?(?:foto|bild|aufnahme|photo|image|picture)\s+(?:von|of|showing|zeigt|mit|with)\s+/i,
		''
	);
	cleaned = cleaned.replace(/^(?:a|an|the)\s+(?:photo|image|picture)\s+of\s+/i, '');
	// Swiss High German throughout the site: sharp s → ss. The prompt asks too,
	// but a model trained mostly on German German ignores that often enough that
	// the deterministic pass is what actually holds the line.
	cleaned = cleaned.replace(/ß/g, 'ss').replace(/ẞ/g, 'SS'); // ß-ok
	cleaned = cleaned.trim().replace(/\s+/g, ' ');
	if (cleaned.length > 0) cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
	if (cleaned.length > MAX_ALT_CHARS) {
		// Cut on a word boundary rather than mid-word before the ellipsis.
		const cut = cleaned.slice(0, MAX_ALT_CHARS - 1);
		const lastSpace = cut.lastIndexOf(' ');
		cleaned = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '') + '…';
	}
	return cleaned;
}
