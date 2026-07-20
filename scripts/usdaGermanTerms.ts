/**
 * Canonical German renderings for the formulaic vocabulary of USDA food descriptions.
 *
 * USDA names are comma-separated qualifier lists drawn from a small closed vocabulary:
 * 120 distinct segments cover ~48% of the corpus ("cooked" appears 1710 times,
 * "separable lean and fat" 770). Translating those through DeepL per-name produced
 * inconsistent output across batches — "cooked" came back as both gegart and gekocht,
 * "all grades" as both Qualitätsklassen and Qualitätsstufen — which is bad for search:
 * a user typing "gegart" would miss half the entries.
 *
 * So the stock vocabulary is pinned here and never sent to DeepL. Only the distinctive
 * part of each name (the actual food, cut, or variety) is translated, with the full
 * English name passed as context.
 *
 * DELIBERATELY ABSENT: segments whose German depends on what they modify. These must
 * stay context-translated by DeepL, not pinned:
 *   ground   — Hackfleisch (meat) vs gemahlen (spices)
 *   round    — Keule (beef cut) vs rund (shape)
 *   light    — hell (colour) vs leicht (reduced-fat) vs Light (beer)
 *   dark     — dunkel vs dark meat = Schenkelfleisch
 *   fluid    — flüssig vs Flüssigunze
 * Adding an ambiguous term here trades a rare inconsistency for a systematic mistranslation.
 */
export const CANONICAL_SEGMENTS: Record<string, string> = {
	// --- preparation state -------------------------------------------------
	// "cooked" is the generic head of a pair ("cooked, roasted"); rendering it as
	// gegart keeps the following method verb from repeating (not "gekocht, gekocht").
	cooked: 'gegart',
	raw: 'roh',
	boiled: 'gekocht',
	roasted: 'gebraten',
	braised: 'geschmort',
	// Kept distinct from braised: USDA uses both, and collapsing them onto geschmort
	// makes "cooked, simmered" and "cooked, braised" indistinguishable in German.
	simmered: 'geköchelt',
	stewed: 'gedünstet',
	baked: 'gebacken',
	fried: 'frittiert',
	'pan-fried': 'in der Pfanne gebraten',
	broiled: 'unter Oberhitze grilliert',
	grilled: 'grilliert',
	heated: 'erhitzt',
	unheated: 'unerhitzt',
	'dry heat': 'trockene Hitze',
	'moist heat': 'feuchte Hitze',
	drained: 'abgetropft',
	'drained solids': 'abgetropfte Feststoffe',
	'solids and liquids': 'Fest- und Flüssiganteile',
	unprepared: 'unzubereitet',
	'commercially prepared': 'industriell hergestellt',
	'prepared from recipe': 'nach Rezept zubereitet',
	'prepared with water': 'mit Wasser zubereitet',
	'prepared with whole milk': 'mit Vollmilch zubereitet',
	'prepared with equal volume water': 'mit gleicher Menge Wasser zubereitet',
	'ready-to-serve': 'verzehrfertig',
	'ready-to-eat': 'verzehrfertig',
	condensed: 'kondensiert',
	'dry mix': 'Trockenmischung',
	strained: 'passiert',
	junior: 'Junior',
	instant: 'instant',
	dried: 'getrocknet',
	frozen: 'tiefgekühlt',
	canned: 'aus der Dose',
	fresh: 'frisch',
	cured: 'gepökelt',
	smoked: 'geräuchert',
	'with salt': 'mit Salz',
	'without salt': 'ohne Salz',
	'no salt added': 'ohne Salzzusatz',
	'with added solution': 'mit Lakezusatz',
	unsweetened: 'ungesüsst',
	sweetened: 'gesüsst',
	enriched: 'angereichert',
	unenriched: 'nicht angereichert',
	'reduced fat': 'fettreduziert',
	nonfat: 'fettfrei',
	'low sodium': 'natriumarm',
	'with iron': 'mit Eisen',
	'with ARA and DHA': 'mit ARA und DHA',

	// --- meat: trim, grade, structure -------------------------------------
	'separable lean and fat': 'abtrennbares mageres Fleisch und Fett',
	'separable lean only': 'nur abtrennbares mageres Fleisch',
	'meat only': 'nur Fleisch',
	'meat and skin': 'Fleisch und Haut',
	'variety meats and by-products': 'Innereien und Nebenprodukte',
	'composite of trimmed retail cuts': 'Mischung zugeschnittener Einzelhandelsstücke',
	'trimmed to 0" fat': 'auf 0" Fett zugeschnitten',
	'trimmed to 1/8" fat': 'auf 1/8" Fett zugeschnitten',
	'trimmed to 1/4" fat': 'auf 1/4" Fett zugeschnitten',
	boneless: 'ohne Knochen',
	'bone-in': 'mit Knochen',
	'lip-on': 'mit Fettdeckel',
	// USDA quality grades are proper names of the USDA grading scale — kept as-is,
	// since "Choice"/"Select" are the terms used on German-language meat spec sheets.
	choice: 'Choice',
	select: 'Select',
	prime: 'Prime',
	'all grades': 'alle Qualitätsklassen',

	// --- species / top-level food classes ---------------------------------
	Beef: 'Rindfleisch',
	Pork: 'Schweinefleisch',
	Lamb: 'Lammfleisch',
	Veal: 'Kalbfleisch',
	Turkey: 'Pute',
	Chicken: 'Hähnchen',
	Fish: 'Fisch',
	// Tuna species. Pinned because DeepL renders the -fin names as salmon —
	// "Blauflossenlachs", "Gelbflossenlachs" — which is a different fish, and the
	// error is invisible to anyone reading only the German. Unambiguous terms, so
	// pinning them costs nothing. The head noun stays Thunfisch here; helvetisms.ts
	// decides where that becomes Thon, since only the tin does.
	bluefin: 'Blauflossenthun',
	yellowfin: 'Gelbflossenthun',
	'Game meat': 'Wildfleisch',
	Mollusks: 'Weichtiere',
	Sausage: 'Wurst',
	Cheese: 'Käse',
	Milk: 'Milch',
	Yogurt: 'Joghurt',
	Beans: 'Bohnen',
	Nuts: 'Nüsse',
	Seeds: 'Samen',
	Potatoes: 'Kartoffeln',
	Corn: 'Mais',
	Peppers: 'Paprika',
	Squash: 'Kürbis',
	Rice: 'Reis',
	Bread: 'Brot',
	Cake: 'Kuchen',
	Cookies: 'Kekse',
	Crackers: 'Cracker',
	Candies: 'Süsswaren',
	Puddings: 'Puddings',
	Snacks: 'Snacks',
	Soup: 'Suppe',
	// "Sauce" rather than the mechanical ss-form "Sosse" — it is the ordinary Swiss
	// German spelling and reads better on a food label.
	Sauce: 'Sauce',
	'Salad dressing': 'Salatdressing',
	Oil: 'Öl',
	Spices: 'Gewürze',
	Cereals: 'Getreideerzeugnisse',
	'Cereals ready-to-eat': 'Frühstückscerealien, verzehrfertig',
	Beverages: 'Getränke',
	'Alcoholic beverage': 'Alkoholisches Getränk',
	Babyfood: 'Babynahrung',
	'Infant formula': 'Säuglingsnahrung',
	// Gerber product tiers — brand names, not descriptions. Mixed case, so the all-caps
	// brand rule misses them and DeepL rendered them as "Beikost" and "3. Lebensmittel".
	'1st Foods': '1st Foods',
	'2nd Foods': '2nd Foods',
	'3rd Foods': '3rd Foods',
	Restaurant: 'Restaurant',

	// --- cuts and parts ----------------------------------------------------
	loin: 'Lende',
	'short loin': 'kurzes Lendenstück',
	tenderloin: 'Filet',
	shoulder: 'Schulter',
	chuck: 'Schulter',
	brisket: 'Bruststück',
	rib: 'Rippe',
	leg: 'Keule',
	breast: 'Brust',
	ham: 'Schinken',
	steak: 'Steak',
	'bottom round': 'Unterschale',
	'top round': 'Oberschale',
	sirloin: 'Hüfte',
	'dark meat': 'Schenkelfleisch',
	'white meat': 'Brustfleisch',
	'broilers or fryers': 'Brathähnchen',
	'mature seeds': 'reife Samen',
	'immature seeds': 'unreife Samen',
	'mixed species': 'gemischte Arten',

	// --- parenthetical notes ------------------------------------------------
	// 700 names carry a trailing "(...)" note. These are pinned for the same reason as
	// the rest of the stock vocabulary: DeepL returned the USDA boilerplate below in
	// seven different renderings across batches.
	"Includes foods for USDA's Food Distribution Program":
		'enthält Lebensmittel des USDA Food Distribution Program',
	chops: 'Koteletts',
	'chops or roasts': 'Koteletts oder Braten',
	roasts: 'Braten',
	steaks: 'Steaks',
	hydrogenated: 'gehärtet',
	'partially hydrogenated': 'teilweise gehärtet',
	industrial: 'industriell',
	'arm and blade': 'Schulter und Schulterblatt',
	'shank and sirloin': 'Hachse und Hüfte',

	// --- origin ------------------------------------------------------------
	imported: 'importiert',
	Australian: 'australisch',
	'New Zealand': 'Neuseeland',

	// --- plain descriptors -------------------------------------------------
	whole: 'ganz',
	plain: 'natur',
	powder: 'Pulver',
	chocolate: 'Schokolade',
	vanilla: 'Vanille',
	fruit: 'Frucht',
	tea: 'Tee',
	wine: 'Wein',
	green: 'grün',
	red: 'rot',
	yellow: 'gelb',
	white: 'weiss',
	sweet: 'süss',
	dinner: 'Menü',
};

/**
 * Segment lookup is case-insensitive on the first letter only: USDA capitalises the
 * head segment ("Beef, ...") but lowercases the same word later ("... , beef, ...").
 */
export function canonicalSegment(seg: string): string | undefined {
	if (!seg) return undefined;
	if (CANONICAL_SEGMENTS[seg]) return CANONICAL_SEGMENTS[seg];
	const flipped = seg[0] === seg[0]?.toUpperCase()
		? seg[0].toLowerCase() + seg.slice(1)
		: seg[0].toUpperCase() + seg.slice(1);
	return CANONICAL_SEGMENTS[flipped];
}
