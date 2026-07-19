/**
 * German (reichsdeutsch) → Swiss High German for the food tables.
 *
 * The BLS table is German-first and the USDA table is translated by DeepL, which
 * always returns reichsdeutsch. Both are normalised through here, at *generation*
 * time (scripts/import-bls-nutrition.ts, scripts/translate-usda-nutrition.ts) so a
 * re-run cannot quietly reintroduce the German forms.
 *
 * The same table runs backwards for search: `germanSynonyms()` turns a Swiss name
 * back into its German wording, which the search index stores as an invisible
 * shadow string. Someone who types "Zucchini", "Sahne" or "Möhre" still finds the
 * food that is now displayed as Zucchetti, Rahm or Rüebli.
 *
 * Adding a rule: it is applied to *substrings*, because nearly every term shows up
 * inside compounds too (Hähnchenbrust, Sahnepulver, Rindfleischbrühe). That is what
 * makes the guards below load-bearing — see GUARDS and the skip conditions on the
 * individual rules. When in doubt, write the narrow rule: a term that stays German
 * is a cosmetic miss, a term replaced in the wrong sense is a wrong food name.
 */

type Rule = {
	/** Matches the German form. Must be global. */
	re: RegExp;
	/** Swiss replacement (a function receives the match, for case preservation). */
	to: string | ((m: string) => string);
};

/**
 * A plain word swap, case-insensitive but case-preserving: the replacement is
 * capitalised iff the match was. Most terms occur both as their own word and inside
 * compounds on either side of the seam — Sahne, Sahnepulver, Schokoladensahneeis —
 * and spelling each casing out separately is how "Rahmdickmilch" and
 * "Vollkorneierkuchen" slipped through an earlier version of this table.
 */
function w(de: string, ch: string): Rule {
	return {
		re: new RegExp(de, 'gi'),
		to: (m: string) => (m[0] === m[0].toUpperCase() ? ch : ch[0].toLowerCase() + ch.slice(1)),
	};
}

/**
 * Names where a rule would change the sense rather than the dialect. Checked before
 * anything else runs, so the whole name keeps its wording (the eszett normalisation
 * still applies — that one is never sense-changing).
 *
 *  - Berliner/Krapfen: "Pfannkuchen" there is the doughnut, not the crêpe.
 *  - Knienudeln: "Ausgezogene Nudeln" is a fried yeast pastry, not a Teigware.
 *  - Zitrusfrüchte: BLS's "Marmelade" entry is the EU legal definition (citrus only),
 *    which is exactly the one word Konfitüre may not replace.
 *  - Bayerischer/Stuttgarter Leberkäse: German regional products, named as such.
 */
const GUARDS: RegExp[] = [
	/Berliner|Krapfen/,
	/Knienudeln/,
	/Marmelade \(hergestellt aus Zitrusfrüchten\)/,
	/(Bayerischer|Stuttgarter) Leberkäse/,
];

/** Applied in order. Longest/most specific first — Sahneeis before Sahne. */
const RULES: Rule[] = [
	// ── Orthography ────────────────────────────────────────────────────────────
	{ re: /ß/g, to: 'ss' }, // ß-ok (this is the normaliser)
	// Both spellings: the eszett rule above already turned "Sosse" out of the German
	// spelling, and a name written "Sosse" to begin with is just as German.
	{ re: /([Ss])o(?:ß|ss)e(n?)/g, to: '$1auce$2' }, // ß-ok
	{ re: /([Gg])egrillt/g, to: '$1rilliert' },

	// ── Dairy ──────────────────────────────────────────────────────────────────
	// Sahne is productive: Schlagsahne→Schlagrahm, Kaffeesahne→Kaffeerahm,
	// Sahnepulver→Rahmpulver all fall out of the generic rule. Only the ice cream
	// needs its own, since Rahmeis is Rahmglace here.
	w('Sahneeis|Rahmeis', 'Rahmglace'),
	w('Sahne', 'Rahm'),
	// Runs after the generic rule, so the input here is already "saure(r) Rahm". One
	// noun either way, so it is always capitalised — "mit saurer Sahne" → "mit Sauerrahm".
	{ re: /[Ss]aure[rn]? Rahm/g, to: 'Sauerrahm' },
	{ re: /[Ss]aure-Rahm-/g, to: 'Sauerrahm-' }, // "Saure-Sahne-Dressing"
	w('Dickmilch', 'Sauermilch'),
	w('Schmand', 'Sauerrahm'),
	w('H-Milch', 'UHT-Milch'),
	w('Speisequark', 'Quark'),

	// ── Meat, fish, sausage ────────────────────────────────────────────────────
	w('Hähnchen|Hühnchen', 'Poulet'),
	// "Huhn"/"Hühner" stays: in Switzerland that is still the bird (Suppenhuhn), and
	// Poulet is the meat — which is what Hähnchen always is.
	w('Puten', 'Truten'),
	{ re: /Pute\b/g, to: 'Trute' },
	w('Truthahn', 'Trute'),
	w('Leberkäse', 'Fleischkäse'), // guarded above for the regional products
	w('Kasseler', 'Rippli'),
	w('Wiener Würstchen', 'Wienerli'),
	w('Würstchen', 'Würstli'),
	w('Frikadellen|Frikadelle', 'Hacktätschli'),
	w('Sülze', 'Sulz'),
	// Eisbein is Wädli; "Haxe" on its own is a cut name (Lamm Hinterhaxe) and stays.
	w('Vordereisbein/Vorderhaxe', 'Vorderwädli'),
	w('Hintereisbein/Hinterhaxe', 'Hinterwädli'),
	w('Eisbein', 'Wädli'),
	w('Schweinshaxen|Schweinshaxe', 'Wädli'),
	w('Garnelen', 'Crevetten'),
	w('Garnele', 'Crevette'),
	w('Shrimps', 'Crevetten'),
	w('Shrimp', 'Crevette'),

	// ── Vegetables ─────────────────────────────────────────────────────────────
	w('Karotten|Möhren', 'Rüebli'),
	w('Karotte|Möhre', 'Rüebli'),
	w('Zucchini', 'Zucchetti'),
	// Only the vegetable. German "Peperoni" (the hot pod) is Peperoncini here, and in
	// the USDA half "Peperoni" is the sausage — neither may be touched, so nothing
	// ever maps *to* Peperoni except these two.
	w('Gemüsepaprika', 'Peperoni'),
	w('Paprikaschoten|Paprikaschote', 'Peperoni'),
	w('Grünkohl', 'Federkohl'),
	w('Wirsing', 'Wirz'),
	w('Weisskohl', 'Weisskabis'), // after the eszett rule
	w('Rotkohl', 'Rotkabis'),
	// Kohl otherwise stays: Kohlrabi, Rosenkohl, Blumenkohl, Chinakohl are all Swiss.
	{ re: /Rote[nr]? Rübe\/Rote[nr]? Bete/gi, to: 'Randen' },
	{ re: /Rote[nr]? Beete/gi, to: 'Randen' },
	{ re: /Rote[nr]? Bete/gi, to: 'Randen' },
	{ re: /Rote-Beete-|Rote-Bete-/gi, to: 'Randen-' }, // "Rote-Bete-Karottensalat"
	w('Kohlrüben/Steckrüben|Kohlrübe/Steckrübe', 'Bodenkohlrabi'),
	w('Steckrüben|Kohlrüben|Steckrübe|Kohlrübe', 'Bodenkohlrabi'),
	w('Feldsalat/Rapunzel', 'Nüsslisalat'),
	w('Feldsalat', 'Nüsslisalat'),
	w('Zuckererbsen', 'Kefen'),
	w('Zuckererbse', 'Kefe'),
	w('Pfifferlinge', 'Eierschwämme'),
	w('Pfifferling', 'Eierschwamm'),
	w('Porree/Lauch', 'Lauch'),
	w('Porree', 'Lauch'),
	w('Gewürzgurken', 'Cornichons'),
	w('Gewürzgurke', 'Cornichon'),

	// ── Staples, baking, sweets ────────────────────────────────────────────────
	w('Bouillon/Brühe', 'Bouillon'),
	// Brühe only with its -e: Brühwurst and Brühwürfel are not bouillon compounds.
	w('Brühe', 'Bouillon'),
	// Only the standalone noun. Schupfnudeln, Dampfnudeln, Glasnudeln, Ramen-Nudeln,
	// Nudelsuppe and the rest are dish names, not "Teigwaren" in any register.
	{ re: /(^|[\s(/])Nudeln/g, to: '$1Teigwaren' },
	{ re: /(^|[\s(/])Nudel\b/g, to: '$1Teigware' },
	w('Speiseeis', 'Glace'),
	w('Eiscreme', 'Glace'),
	w('Konfitüren und Marmeladen', 'Konfitüren'),
	{ re: /Konfitüren, Marmeladen?/gi, to: 'Konfitüren' },
	w('Marmeladen', 'Konfitüren'),
	w('Marmelade', 'Konfitüre'), // guarded above for the citrus definition
	w('Butterschmalz', 'Bratbutter'),
	w('Kekse', 'Biscuits'),
	w('Keks', 'Biscuit'),
	w('Plätzchen', 'Guetzli'),
	// Semmel is deliberately absent: every occurrence is Semmelknödel / Semmelbrösel,
	// i.e. dish names, not a roll.
	w('Brötchen', 'Brötli'),
	w('Hefezopf', 'Zopf'),
	w('Müsli', 'Müesli'),
	w('Kartoffelchips', 'Pommes Chips'),
	w('Auflauf', 'Gratin'),
	w('Pfannkuchen/Eierkuchen', 'Omeletten'), // guarded: not the Berliner
	w('Pfannkuchenteig/Eierkuchenteig', 'Omelettenteig'),
	w('Pfannkuchen', 'Omelette'),
	w('Eierkuchen', 'Omelette'),
	// German flour type numbers have Swiss names; only these three map cleanly, the
	// rest (Roggen 815/997/1150, Weizen 812/1600/1700) keep their type.
	{ re: /Mehl, Type 405/g, to: 'Weissmehl (Type 405)' },
	{ re: /Mehl, Type 550/g, to: 'Halbweissmehl (Type 550)' },
	{ re: /Mehl, Type 1050/g, to: 'Ruchmehl (Type 1050)' },
];

/**
 * BLS names a food by listing its synonyms, "Karotte/Möhre". Where both halves are
 * now the same Swiss word, collapseSlashVariants() drops the repeat by itself. These
 * are the rest: pairs where the German synonym survives as a *different* word and
 * carrying it would just be the reichsdeutsch name riding along.
 *
 * Hand-curated, because which half to keep is a judgement call every time — the
 * shorter one, the commercial one, or the one a Swiss shopper would actually read
 * on the shelf.
 */
const DOUBLET_DROPS: [from: RegExp, to: string][] = [
	[/Biscuits\/Guetzli/g, 'Biscuits'],
	[/Butterbiscuits\/Butterguetzli/g, 'Butterbiscuits'],
	[/Müeslibiscuits\/Müesliguetzli/g, 'Müeslibiscuits'],
	[/Schoko-Müeslibiscuits\/Schoko-Müesliguetzli/g, 'Schoko-Müeslibiscuits'],
	// Granat and Krabbe are the German regional names for the same shrimp.
	[/Crevette\/Granat\/Krabbe/g, 'Crevette'],
	// "Fleischkäse einfach, fein/Original Bayerischer Leberkäse fein" — the Bavarian
	// product name is the German half of exactly this doublet.
	[/Fleischkäse einfach, fein\/Original Bayerischer Leberkäse fein/g, 'Fleischkäse einfach, fein'],
	// Berliner and Krapfen are both current here; "Pfannkuchen" for a doughnut is the
	// Berlin usage and reads as the wrong food.
	[/Berliner\/Pfannkuchen\/Krapfen/g, 'Berliner/Krapfen'],
];

/**
 * Collapse BLS's synonym doublets once both halves say the same thing.
 * "Karotte/Möhre" becomes "Rüebli/Rüebli" becomes "Rüebli"; likewise
 * "Bouillon/Bouillon/Suppe" → "Bouillon/Suppe". Only exact (case-insensitive)
 * repeats are dropped, so "Kartoffelpuffer/Reibekuchen" is untouched.
 */
export function collapseSlashVariants(name: string): string {
	// Trailing punctuation is held back before comparing, or "Rüebli/Rüebli," reads as
	// two different alternatives and nothing collapses.
	return name.replace(/[^\s/]+(?:\/[^\s/]+)+/g, (run) => {
		const [, body, tail] = run.match(/^(.*?)([,.;:]*)$/s)!;
		const seen: string[] = [];
		for (const part of body.split('/')) {
			if (!seen.some((p) => p.toLowerCase() === part.toLowerCase())) seen.push(part);
		}
		return seen.join('/') + tail;
	});
}

/** Rewrite a German food name in Swiss High German. Idempotent. */
export function toSwissGerman(name: string): string {
	const guarded = GUARDS.some((g) => g.test(name));
	// A guarded name still gets its orthography fixed — that part is never
	// sense-changing — and can still be a doublet whose German half we drop.
	let out = guarded ? name.replace(/ß/g, 'ss') : name; // ß-ok
	if (!guarded) {
		for (const { re, to } of RULES) {
			out = typeof to === 'function' ? out.replace(re, to) : out.replace(re, to);
		}
	}
	for (const [from, to] of DOUBLET_DROPS) out = out.replace(from, to);
	return collapseSlashVariants(out);
}

/**
 * Swiss term → the German words it replaced, for the search index only. Written out
 * rather than derived by inverting RULES: the rules are lossy on purpose (Karotte and
 * Möhre both become Rüebli, Kohlrübe and Steckrübe both Bodenkohlrabi), so the reverse
 * direction has to list every German form that should still find the food.
 *
 * Lowercase, since the index folds case anyway. Substring keys are fine here — a
 * false extra keyword costs a search hit, not a wrong name.
 */
const GERMAN_SYNONYMS: [swiss: string, german: string[]][] = [
	['rahmglace', ['sahneeis']],
	['rahm', ['sahne']],
	['sauerrahm', ['saure sahne', 'schmand']],
	['sauermilch', ['dickmilch']],
	['uht-milch', ['h-milch']],
	['poulet', ['hähnchen', 'hühnchen']],
	['trute', ['pute', 'puten', 'truthahn']],
	['truten', ['puten']],
	['fleischkäse', ['leberkäse']],
	['rippli', ['kasseler']],
	['wienerli', ['wiener würstchen']],
	['würstli', ['würstchen']],
	['hacktätschli', ['frikadelle', 'frikadellen', 'bulette', 'buletten']],
	['sulz', ['sülze']],
	['wädli', ['eisbein', 'schweinshaxe']],
	['crevette', ['garnele', 'garnelen', 'shrimp']],
	['crevetten', ['garnelen', 'shrimps']],
	['rüebli', ['karotte', 'karotten', 'möhre', 'möhren']],
	['zucchetti', ['zucchini']],
	['peperoni', ['gemüsepaprika', 'paprikaschote']],
	['federkohl', ['grünkohl']],
	['wirz', ['wirsing']],
	['weisskabis', ['weisskohl']],
	['rotkabis', ['rotkohl']],
	['randen', ['rote bete', 'rote rübe']],
	['bodenkohlrabi', ['steckrübe', 'steckrüben', 'kohlrübe', 'kohlrüben']],
	['nüsslisalat', ['feldsalat', 'rapunzel']],
	['kefe', ['zuckererbse', 'zuckererbsen']],
	['kefen', ['zuckererbsen']],
	['eierschwamm', ['pfifferling', 'pfifferlinge']],
	['eierschwämme', ['pfifferlinge']],
	['lauch', ['porree']],
	['cornichon', ['gewürzgurke', 'gewürzgurken']],
	['bouillon', ['brühe']],
	['teigwaren', ['nudeln', 'nudel']],
	['glace', ['speiseeis', 'eiscreme']],
	['konfitüre', ['marmelade', 'marmeladen']],
	['konfitüren', ['marmeladen']],
	['bratbutter', ['butterschmalz']],
	['biscuit', ['keks']],
	['biscuits', ['kekse', 'keks']],
	['guetzli', ['plätzchen']],
	['brötli', ['brötchen']],
	['zopf', ['hefezopf']],
	['müesli', ['müsli']],
	['pommes chips', ['kartoffelchips']],
	['gratin', ['auflauf']],
	['omelette', ['pfannkuchen', 'eierkuchen']],
	['omeletten', ['pfannkuchen', 'eierkuchen']],
	['weissmehl', ['mehl type 405']],
	['halbweissmehl', ['mehl type 550']],
	['ruchmehl', ['mehl type 1050']],
	['sauce', ['sosse']],
	['grilliert', ['gegrillt']],
];

/**
 * German keywords for a Swiss name, for the search index only — never displayed.
 * Returns '' when the name contains no helvetism, so callers can skip the extra
 * index entry.
 */
export function germanSynonyms(name: string): string {
	const lower = name.toLowerCase();
	const variants = new Set<string>();
	for (const [swiss, germans] of GERMAN_SYNONYMS) {
		if (!lower.includes(swiss)) continue;
		// Substituted into the name rather than listed on their own, so compounds come
		// out as real words: "Pouletbrust" has to yield "hähnchenbrust", or someone
		// typing that finds nothing — the index matches whole words by prefix, and
		// "hähnchen" is not a prefix of it. Plurals are listed alongside singulars for
		// the German linking -n ("Rüeblisuppe" → Karottensuppe, not Karottesuppe); the
		// ungrammatical variants that also fall out are never displayed.
		for (const german of germans) variants.add(lower.split(swiss).join(german));
	}
	variants.delete(lower);
	return [...variants].join(' ');
}
