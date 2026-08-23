import { resolveCanton } from '$lib/data/cantons';
import { resolveCountry } from '$lib/data/countries';
import { resolveSubdivision } from '$lib/data/subdivisions';

/**
 * Geographic grouping for a hike, abstracted over the border: a Swiss hike is
 * grouped by its canton, a hike abroad by its sub-national region where we
 * have the arms for it (Austria's Bundesländer), and by its country otherwise.
 * Each step is a fallback from the one before, so a hike keeps working with
 * whatever the build managed to resolve — canton, then state, then country.
 */
export type HikeArea = {
	/** Namespaced so codes from different levels can't collide in a filter set. */
	value: string;
	label: string;
	iconUrl: string;
	kind: 'canton' | 'state' | 'country';
};

export function resolveHikeArea(
	canton: string | null | undefined,
	country: string | null | undefined,
	state?: string | null
): HikeArea | null {
	const c = resolveCanton(canton);
	if (c) return { value: `canton:${c.code}`, label: c.name, iconUrl: c.emblemUrl, kind: 'canton' };
	const s = resolveSubdivision(country, state);
	if (s) {
		return {
			// Country-qualified: region names repeat across borders (Tirol).
			value: `state:${s.country}-${s.code}`,
			label: s.name,
			iconUrl: s.emblemUrl,
			kind: 'state'
		};
	}
	const k = resolveCountry(country);
	if (k) return { value: `country:${k.code}`, label: k.name, iconUrl: k.flagUrl, kind: 'country' };
	return null;
}

/** Whether a hike sits in a swisstopo-covered region (Switzerland or
 * Liechtenstein). Drives the schematic max-zoom (swisstopo reaches deeper than
 * the global fallback) and whether the CH/LI-only Dufour layer is offered. */
export function isSwissRegion(
	canton: string | null | undefined,
	country: string | null | undefined
): boolean {
	if (resolveCanton(canton)) return true;
	const c = resolveCountry(country);
	return c?.code === 'CH' || c?.code === 'LI';
}
