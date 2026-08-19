/**
 * Hot drinks the liquids card can log with one tap.
 *
 * A heavy tea drinker logs the same cup a dozen times a day, and going through
 * the food search each time is the slowest path to the most repetitive entry in
 * the diary. The list is the drinkable coffee/tea section of the BLS — brewed
 * infusions and the milk blends built on them, no powders, no iced tea, no
 * alcohol — so whatever someone actually drinks is one setting away.
 *
 * Codes are BLS 4.0; the nutrition comes from the base table at log time, so
 * only the code and its names live here. `de`/`en` are the BLS names verbatim,
 * because the logged name has to be the one `/api/nutrition/search` would have
 * produced — see `hotDrinkLogName`.
 */

export type HotDrinkGroup = 'tea' | 'coffee' | 'milk';

export type HotDrink = {
	/** BLS 4.0 code, e.g. `N630000` for black tea. */
	code: string;
	/** BLS German name, verbatim. */
	de: string;
	/** BLS English name, verbatim. */
	en: string;
	group: HotDrinkGroup;
};

/** Black tea — the cup this feature was built for. */
export const DEFAULT_HOT_DRINK_CODE = 'N630000';

/** One tap logs this much. Same cup size the water tracker counts in. */
export const HOT_DRINK_ML = 250;

export const HOT_DRINKS: HotDrink[] = [
	{ code: 'N710000', de: 'Früchtetee (Getränk)', en: 'Fruit tea (infusion)', group: 'tea' },
	{ code: 'N710600', de: 'Früchtetee (Getränk) mit Zucker', en: 'Fruit tea (infusion) with sugar', group: 'tea' },
	{ code: 'N610100', de: 'Grüntee (Getränk)', en: 'Green tea (infusion)', group: 'tea' },
	{ code: 'N720100', de: 'Kräutertee (Getränk)', en: 'Herbal tea (infusion)', group: 'tea' },
	{ code: 'N720200', de: 'Kräutertee (Getränk) mit Milch 3,5 % Fett', en: 'Herbal tea (infusion) with milk 3.5 % fat', group: 'tea' },
	{ code: 'N720300', de: 'Kräutertee (Getränk) mit Milch 3,5 % Fett und Zucker', en: 'Herbal tea (infusion) with milk 3.5 % fat and sugar', group: 'tea' },
	{ code: 'N720400', de: 'Kräutertee (Getränk) mit Rahm 30 % Fett', en: 'Herbal tea (infusion) with cream 30 % fat', group: 'tea' },
	{ code: 'N720500', de: 'Kräutertee (Getränk) mit Rahm 30 % Fett und Zucker', en: 'Herbal tea (infusion) with cream 30 % fat and sugar', group: 'tea' },
	{ code: 'N720600', de: 'Kräutertee (Getränk) mit Zucker', en: 'Herbal tea (infusion) with sugar', group: 'tea' },
	{ code: 'N611000', de: 'Mate-Tee (Getränk)', en: 'Mate tea (infusion)', group: 'tea' },
	{ code: 'N721000', de: 'Pfefferminztee (Getränk)', en: 'Peppermint tea (infusion)', group: 'tea' },
	{ code: 'N601000', de: 'Roibusch-/Rooibos-/Rotbusch-Tee (Getränk)', en: 'Rooibos tea (infusion)', group: 'tea' },
	{ code: 'N630000', de: 'Schwarztee (Getränk)', en: 'Black tea (infusion)', group: 'tea' },
	{ code: 'N670100', de: 'Schwarztee (Getränk) entkoffeiniert', en: 'Black tea (infusion) decaffeinated', group: 'tea' },
	{ code: 'N630200', de: 'Schwarztee (Getränk) mit Milch 3,5 % Fett', en: 'Black tea (infusion) with milk 3.5 % fat', group: 'tea' },
	{ code: 'N630300', de: 'Schwarztee (Getränk) mit Milch 3,5 % Fett und Zucker', en: 'Black tea (infusion) with milk 3.5 % fat and sugar', group: 'tea' },
	{ code: 'N630400', de: 'Schwarztee (Getränk) mit Rahm 30 % Fett', en: 'Black tea (infusion) with cream 30 % fat', group: 'tea' },
	{ code: 'N630500', de: 'Schwarztee (Getränk) mit Rahm 30 % Fett und Zucker', en: 'Black tea (infusion) with cream 30 % fat and sugar', group: 'tea' },
	{ code: 'N630700', de: 'Schwarztee (Getränk) mit Zitronensaft und Zucker', en: 'Black tea (infusion) with lemon juice and sugar', group: 'tea' },
	{ code: 'N630600', de: 'Schwarztee (Getränk) mit Zucker', en: 'Black tea (infusion) with sugar', group: 'tea' },
	{ code: 'N412900', de: 'Cappuccino (Getränk) aus gesüsstem Instantpulver', en: 'Cappuccino (infusion) made from sweetened instant powder', group: 'coffee' },
	{ code: 'N414000', de: 'Cappuccino (Getränk) mit Milch 3,5 % Fett', en: 'Cappuccino (infusion) with milk 3.5 % fat', group: 'coffee' },
	{ code: 'N4A3300', de: 'Cappuccino (Getränk) mit Milch 3,5 % Fett und Zucker', en: 'Cappuccino (infusion) with milk 3.5 % fat and sugar', group: 'coffee' },
	{ code: 'N411100', de: 'Espresso (Getränk)', en: 'Espresso (infusion)', group: 'coffee' },
	{ code: 'N411200', de: 'Espresso (Getränk) mit Zucker', en: 'Espresso (infusion) with sugar', group: 'coffee' },
	{ code: 'N410100', de: 'Kaffee (Getränk)', en: 'Coffee (infusion)', group: 'coffee' },
	{ code: 'N420100', de: 'Kaffee (Getränk) aus Instantpulver', en: 'Coffee (infusion) made from instant powder', group: 'coffee' },
	{ code: 'N415000', de: 'Kaffee (Getränk) entkoffeiniert', en: 'Coffee (infusion) decaffeinated', group: 'coffee' },
	{ code: 'N440100', de: 'Kaffee (Getränk) entkoffeiniert, aus Instantpulver', en: 'Coffee (infusion) made from decaffeinated instant powder', group: 'coffee' },
	{ code: 'N414200', de: 'Kaffee (Getränk) entkoffeiniert, mit Kondensmilch 7,5 % Fett', en: 'Coffee (infusion) decaffeinated, with evaporated milk 7.5 % fat', group: 'coffee' },
	{ code: 'N414100', de: 'Kaffee (Getränk) entkoffeiniert, mit Milch 3,5 % Fett', en: 'Coffee (infusion) decaffeinated, with milk 3.5 % fat', group: 'coffee' },
	{ code: 'N491000', de: 'Kaffee (Getränk) halb und halb, mit Milch 3,5 % Fett', en: 'Coffee (infusion) half and half, with milk 3.5 % fat', group: 'coffee' },
	{ code: 'N416000', de: 'Kaffee (Getränk) koffeinreduziert', en: 'Coffee (infusion) caffeine-reduced', group: 'coffee' },
	{ code: 'N4A0000', de: 'Kaffee (Getränk) mit Haferdrink, ungesüsst', en: 'Coffee (infusion) with oat drink, unsweetened', group: 'coffee' },
	{ code: 'N410400', de: 'Kaffee (Getränk) mit Kondensmilch 7,5 % Fett', en: 'Coffee (infusion) with evaporated milk 7.5 % fat', group: 'coffee' },
	{ code: 'N410500', de: 'Kaffee (Getränk) mit Kondensmilch 7,5 % Fett und Zucker', en: 'Coffee (infusion) with evaporated milk 7.5 % fat and sugar', group: 'coffee' },
	{ code: 'N4A1000', de: 'Kaffee (Getränk) mit Mandeldrink, ungesüsst', en: 'Coffee (infusion) with almond drink, unsweetened', group: 'coffee' },
	{ code: 'N410200', de: 'Kaffee (Getränk) mit Milch 3,5 % Fett', en: 'Coffee (infusion) with milk 3.5 % fat', group: 'coffee' },
	{ code: 'N410300', de: 'Kaffee (Getränk) mit Milch 3,5 % Fett und Zucker', en: 'Coffee (infusion) with milk 3.5 % fat and sugar', group: 'coffee' },
	{ code: 'N4A2000', de: 'Kaffee (Getränk) mit Sojadrink, ungesüsst', en: 'Coffee (infusion) with soya drink, unsweetened', group: 'coffee' },
	{ code: 'N410600', de: 'Kaffee (Getränk) mit Zucker', en: 'Coffee (infusion) with sugar', group: 'coffee' },
	{ code: 'N500100', de: 'Kaffeeersatz (Getränk)', en: 'Coffee substitute (infusion)', group: 'coffee' },
	{ code: 'N5A0000', de: 'Kaffeeersatz (Getränk) mit Haferdrink, ungesüsst', en: 'Coffee substitute (infusion) with oat drink, unsweetened', group: 'coffee' },
	{ code: 'N500400', de: 'Kaffeeersatz (Getränk) mit Kondensmilch 7,5 % Fett', en: 'Coffee substitute (infusion) with evaporated milk 7.5 % fat', group: 'coffee' },
	{ code: 'N500500', de: 'Kaffeeersatz (Getränk) mit Kondensmilch 7,5 % Fett und Zucker', en: 'Coffee substitute (infusion) with evaporated milk 7.5 % fat and sugar', group: 'coffee' },
	{ code: 'N5A1000', de: 'Kaffeeersatz (Getränk) mit Mandeldrink, ungesüsst', en: 'Coffee substitute (infusion) with almond drink, unsweetened', group: 'coffee' },
	{ code: 'N500200', de: 'Kaffeeersatz (Getränk) mit Milch 3,5 % Fett', en: 'Coffee substitute (infusion) with milk 3.5 % fat', group: 'coffee' },
	{ code: 'N500300', de: 'Kaffeeersatz (Getränk) mit Milch 3,5 % Fett und Zucker', en: 'Coffee substitute (infusion) with milk 3.5 % fat and sugar', group: 'coffee' },
	{ code: 'N5A2000', de: 'Kaffeeersatz (Getränk) mit Sojadrink, ungesüsst', en: 'Coffee substitute (infusion) with soya drink, unsweetened', group: 'coffee' },
	{ code: 'N500600', de: 'Kaffeeersatz (Getränk) mit Zucker', en: 'Coffee substitute (infusion) with sugar', group: 'coffee' },
	{ code: 'N418000', de: 'Latte macchiato (Getränk) mit Milch 3,5 % Fett', en: 'Latte Macchiato (infusion) with milk 3.5 % fat', group: 'coffee' },
	{ code: 'N540100', de: 'Zichorienkaffee (Getränk)', en: 'Chicory coffee (infusion)', group: 'coffee' },
	{ code: 'M2A6100', de: 'Milchmischgetränk < 1 % Fett, mit Kakao/Schoko, Zucker und Süssungsmitteln', en: 'Milk drink < 1 % fat, with cocoa/chocolate, sugar and artificial sweeteners', group: 'milk' },
	{ code: 'M206100', de: 'Milchmischgetränk < 1 % Fett, mit Kakao/Schokolade, gesüsst', en: 'Milk drink < 1 % fat, with cocoa/chocolate, sweetened', group: 'milk' },
	{ code: 'M2I3200', de: 'Milchmischgetränk 1,5 % Fett, mit Kaffee und Süssungsmitteln', en: 'Milk drink 1.5 % fat, with coffee and artificial sweeteners', group: 'milk' },
	{ code: 'M2A7200', de: 'Milchmischgetränk 1,5 % Fett, mit Kaffee, gesüsst', en: 'Milk drink 1.5 % fat, with coffee, sweetened', group: 'milk' },
	{ code: 'M2I5200', de: 'Milchmischgetränk 1,5 % Fett, mit Kaffee, ungesüsst', en: 'Milk drink 1.5 % fat, with coffee, unsweetened', group: 'milk' },
	{ code: 'M206200', de: 'Milchmischgetränk 1,5 % Fett, mit Kakao/Schokolade, gesüsst', en: 'Milk drink 1.5 % fat, with cocoa/chocolate, sweetened', group: 'milk' },
	{ code: 'M2Q4220', de: 'Milchmischgetränk 1,5 % Fett, mit Kakao/Schokolade, gesüsst, angereichert mit Vitaminen', en: 'Milk drink 1.5 % fat, with cocoa/chocolate, sweetened, fortified with vitamins', group: 'milk' },
	{ code: 'M208000', de: 'Milchmischgetränk 3,5 % Fett, mit Kaffee, gesüsst', en: 'Milk drink 3.5 % fat, with coffee, sweetened', group: 'milk' },
	{ code: 'M206300', de: 'Milchmischgetränk 3,5 % Fett, mit Kakao/Schokolade, gesüsst', en: 'Milk drink 3.5 % fat, with cocoa/chocolate, sweetened', group: 'milk' },
	{ code: 'M2Q8320', de: 'Milchmischgetränk 3,5 % Fett, mit Kakao/Schokolade, gesüsst, angereichert mit Vitaminen', en: 'Milk drink 3.5 % fat, with cocoa/chocolate, sweetened, fortified with vitamins', group: 'milk' },
];

const BY_CODE = new Map(HOT_DRINKS.map(d => [d.code, d]));

export function hotDrinkByCode(code: string | null | undefined): HotDrink | undefined {
	return code ? BY_CODE.get(code) : undefined;
}

/** The drink a code names, falling back to black tea for an unknown one. */
export function resolveHotDrink(code: string | null | undefined): HotDrink {
	return hotDrinkByCode(code) ?? (BY_CODE.get(DEFAULT_HOT_DRINK_CODE) as HotDrink);
}

/**
 * The name to store on a log entry. `/api/nutrition/search` labels every BLS
 * food `German (English)` in both languages, so a tap of the quick button and a
 * hand-picked search hit for the same code have to read identically in the
 * diary — otherwise the same tea shows up as two different foods.
 */
export function hotDrinkLogName(drink: HotDrink): string {
	return `${drink.de}${drink.en ? ` (${drink.en})` : ''}`;
}

/** Shorter label for the picker: the BLS "(Getränk)" / "(infusion)" tag adds nothing there. */
export function hotDrinkLabel(drink: HotDrink, isEn: boolean): string {
	return (isEn ? drink.en : drink.de).replace(/ \((?:Getränk|infusion)\)/, '');
}

/**
 * Whether a logged entry is one of these drinks — what the liquids card keys on
 * to draw a mug instead of a glass. Matched by code alone: a name match would
 * also catch cake and ice cream.
 */
export function isHotDrinkRef(source: string | undefined, sourceId: string | undefined): boolean {
	return source === 'bls' && !!sourceId && BY_CODE.has(sourceId);
}

/**
 * The preference lives in cookies rather than localStorage so the server can read
 * it during load: the mug is part of the first paint or it isn't there at all.
 * Kept in localStorage it rendered on, then blinked out a moment after hydration.
 */
export const HOT_DRINK_ENABLED_COOKIE = 'hot_drink_enabled';
export const HOT_DRINK_CODE_COOKIE = 'hot_drink_bls';

/** A year — long enough to outlive a browsing session, short enough to expire. */
export const HOT_DRINK_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type HotDrinkPrefs = { enabled: boolean; code: string };

/**
 * Reads the pair out of any cookie store, so the server load and the client agree
 * on what an absent or nonsense value means: on, and black tea.
 */
export function readHotDrinkPrefs(get: (name: string) => string | undefined): HotDrinkPrefs {
	return {
		enabled: get(HOT_DRINK_ENABLED_COOKIE) !== '0',
		code: hotDrinkByCode(get(HOT_DRINK_CODE_COOKIE))?.code ?? DEFAULT_HOT_DRINK_CODE,
	};
}

/** Group order the drink picker lists its optgroups in. */
export const HOT_DRINK_GROUPS: HotDrinkGroup[] = ['tea', 'coffee', 'milk'];

export const HOT_DRINK_GROUP_LABELS: Record<HotDrinkGroup, { de: string; en: string }> = {
	tea: { de: 'Tee', en: 'Tea' },
	coffee: { de: 'Kaffee', en: 'Coffee' },
	milk: { de: 'Milchmischgetränke', en: 'Milk drinks' },
};
