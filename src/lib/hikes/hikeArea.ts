import { resolveCanton } from '$lib/data/cantons';
import { resolveCountry } from '$lib/data/countries';

/**
 * Geographic grouping for a hike, abstracted over the border: a Swiss hike is
 * grouped by its canton (with the coat-of-arms), a hike abroad by its country
 * (with the flag). Canton wins when present, so existing Swiss manifest
 * entries keep working even before the build adds a `country`.
 */
export type HikeArea = {
	/** Namespaced so canton and country codes can't collide in a filter set. */
	value: string;
	label: string;
	iconUrl: string;
	kind: 'canton' | 'country';
};

export function resolveHikeArea(
	canton: string | null | undefined,
	country: string | null | undefined
): HikeArea | null {
	const c = resolveCanton(canton);
	if (c) return { value: `canton:${c.code}`, label: c.name, iconUrl: c.emblemUrl, kind: 'canton' };
	const k = resolveCountry(country);
	if (k) return { value: `country:${k.code}`, label: k.name, iconUrl: k.flagUrl, kind: 'country' };
	return null;
}
