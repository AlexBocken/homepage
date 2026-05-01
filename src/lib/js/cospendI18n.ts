/** Cospend route i18n — slug mappings and UI translations */

/** Detect language from a cospend path by checking the root segment */
export function detectCospendLang(pathname: string): CospendLang {
	const first = pathname.split('/').filter(Boolean)[0];
	return first === 'expenses' ? 'en' : 'de';
}

/** Convert a cospend path to the target language */
export function convertCospendPath(pathname: string, targetLang: CospendLang): string {
	const targetRoot = targetLang === 'en' ? 'expenses' : 'cospend';
	return pathname.replace(/^\/(cospend|expenses)/, `/${targetRoot}`);
}

/** Get the root slug for a given language */
export function cospendRoot(lang: CospendLang): string {
	return lang === 'en' ? 'expenses' : 'cospend';
}

/** Get translated nav labels */
export function cospendLabels(lang: CospendLang) {
	return {
		dash: lang === 'en' ? 'Dashboard' : 'Dashboard',
		list: lang === 'en' ? 'List' : 'Liste',
		payments: lang === 'en' ? 'All Payments' : 'Alle Zahlungen',
		recurring: lang === 'en' ? 'Recurring' : 'Wiederkehrend'
	};
}


import { de } from '$lib/i18n/cospend/de';
import { en } from '$lib/i18n/cospend/en';

/** All cospend translations, keyed by locale. */
export const m = { de, en } as const;

export type CospendLang = keyof typeof m;
export type CospendKey = keyof typeof de;


/** Category name translation map (German key → display name per language) */
const categoryDisplayNames: Record<string, Record<string, string>> = {
	'Obst & Gemüse':          { en: 'Fruits & Vegetables', de: 'Obst & Gemüse' },
	'Fleisch & Fisch':        { en: 'Meat & Fish', de: 'Fleisch & Fisch' },
	'Milchprodukte':          { en: 'Dairy', de: 'Milchprodukte' },
	'Brot & Backwaren':       { en: 'Bread & Bakery', de: 'Brot & Backwaren' },
	'Pasta, Reis & Getreide': { en: 'Pasta, Rice & Grains', de: 'Pasta, Reis & Getreide' },
	'Gewürze & Saucen':       { en: 'Spices & Sauces', de: 'Gewürze & Saucen' },
	'Getränke':               { en: 'Beverages', de: 'Getränke' },
	'Süßes & Snacks':         { en: 'Sweets & Snacks', de: 'Süßes & Snacks' },
	'Tiefkühl':               { en: 'Frozen', de: 'Tiefkühl' },
	'Haushalt':               { en: 'Household', de: 'Haushalt' },
	'Hygiene & Körperpflege': { en: 'Hygiene & Body Care', de: 'Hygiene & Körperpflege' },
	'Sonstiges':              { en: 'Other', de: 'Sonstiges' },
};

/** Get translated category display name (shopping categories) */
export function categoryName(category: string, lang: CospendLang): string {
	return categoryDisplayNames[category]?.[lang] ?? category;
}

/** Payment category translation map */
const paymentCategoryNames: Record<string, Record<string, string>> = {
	groceries:  { en: 'Groceries', de: 'Lebensmittel' },
	shopping:   { en: 'Shopping', de: 'Einkauf' },
	travel:     { en: 'Travel', de: 'Reise' },
	restaurant: { en: 'Restaurant', de: 'Restaurant' },
	utilities:  { en: 'Utilities', de: 'Nebenkosten' },
	fun:        { en: 'Fun', de: 'Freizeit' },
	settlement: { en: 'Settlement', de: 'Ausgleich' },
};

/** Get translated payment category name */
export function paymentCategoryName(category: string, lang: CospendLang): string {
	return paymentCategoryNames[category]?.[lang] ?? category;
}

/** Get category options with translated labels */
export function getCategoryOptionsI18n(lang: CospendLang) {
	const emojis: Record<string, string> = {
		groceries: '🛒', shopping: '🛍️', travel: '🚆',
		restaurant: '🍽️', utilities: '⚡', fun: '🎉', settlement: '🤝'
	};
	return Object.keys(paymentCategoryNames).map(key => ({
		value: key,
		label: `${emojis[key] || ''} ${paymentCategoryName(key, lang)}`,
		emoji: emojis[key] || '',
		name: paymentCategoryName(key, lang)
	}));
}

/**
 * Get a translated string. Prefer `m[lang].key` directly in new code — this
 * helper is kept for the existing call sites and falls back to English then
 * the key itself if the lookup misses.
 */
export function t(key: CospendKey, lang: CospendLang): string {
	return m[lang][key] ?? m.en[key] ?? key;
}

/** Format TTL remaining time in the target language */
export function formatTTL(expiresAt: string, lang: CospendLang): string {
	const diff = new Date(expiresAt).getTime() - Date.now();
	if (diff <= 0) return t('expired', lang);
	const mins = Math.round(diff / 60000);
	if (mins < 60) return `${mins} min`;
	const hours = Math.round(diff / 3600000);
	if (hours < 24) return `${hours} ${lang === 'en' ? 'hrs' : 'Std.'}`;
	const days = Math.round(diff / 86400000);
	return `${days} ${lang === 'en' ? (days > 1 ? 'days' : 'day') : (days > 1 ? 'Tage' : 'Tag')}`;
}

/** Get TTL options for the given language */
export function ttlOptions(lang: CospendLang) {
	return [
		{ label: t('ttl_1h', lang), ms: 1 * 60 * 60 * 1000 },
		{ label: t('ttl_6h', lang), ms: 6 * 60 * 60 * 1000 },
		{ label: t('ttl_24h', lang), ms: 24 * 60 * 60 * 1000 },
		{ label: t('ttl_3d', lang), ms: 3 * 24 * 60 * 60 * 1000 },
		{ label: t('ttl_7d', lang), ms: 7 * 24 * 60 * 60 * 1000 },
	];
}

/** Get locale string for number/date formatting */
export function locale(lang: CospendLang): string {
	return lang === 'en' ? 'en-CH' : 'de-CH';
}

/** Build a split description string */
export function splitDescription(payment: { splits?: any[]; splitMethod?: string; paidBy?: string }, lang: CospendLang): string {
	if (!payment.splits || payment.splits.length === 0) return t('no_splits', lang);

	const count = payment.splits.length;
	if (payment.splitMethod === 'equal') {
		return `${t('split_equal', lang)} ${count} ${t('people', lang)}`;
	} else if (payment.splitMethod === 'full') {
		return `${t('paid_full_by', lang)} ${payment.paidBy}`;
	} else if (payment.splitMethod === 'personal_equal') {
		return `${t('personal_equal', lang)} ${count} ${t('people', lang)}`;
	} else {
		return `${t('custom_split', lang)} ${count} ${t('people', lang)}`;
	}
}

/** Get translated frequency description for a recurring payment */
export function frequencyDescription(payment: { frequency: string; cronExpression?: string }, lang: CospendLang): string {
	switch (payment.frequency) {
		case 'daily': return t('freq_every_day', lang);
		case 'weekly': return t('freq_every_week', lang);
		case 'monthly': return t('freq_every_month', lang);
		case 'custom': return `${t('freq_custom', lang)}: ${payment.cronExpression}`;
		default: return t('freq_unknown', lang);
	}
}

/** Format next execution date with i18n */
export function formatNextExecutionI18n(date: Date, lang: CospendLang): string {
	const loc = locale(lang);
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const timeStr = date.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });

	if (diffDays === 0) {
		return `${t('today_at', lang)} ${timeStr}`;
	} else if (diffDays === 1) {
		return `${t('tomorrow_at', lang)} ${timeStr}`;
	} else if (diffDays < 7) {
		return `${t('in_days_at', lang).replace('{days}', String(diffDays))} ${timeStr}`;
	} else {
		return date.toLocaleString(loc, {
			year: 'numeric', month: 'short', day: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}
}
