/**
 * The exercise catalogue as the browser sees it.
 *
 * The full catalogue (`$lib/data/exercisedb`, ~750 kB of JSON) stays on the
 * server; the list and the picker ask `/api/fitness/exercises/catalog` and get
 * back this slim summary per exercise — the handful of fields a row shows.
 * This module is universal: query shape, its URL encoding, and the fetchers.
 * The server-side search lives in `$lib/server/exerciseCatalog`.
 */
import type { ExerciseType } from '$lib/data/exercises';

export type ExerciseSummary = {
	id: string;
	name: string;
	localName: string;
	exerciseType?: ExerciseType;
	bodyPart: string;
	equipment: string;
	target: string;
	localBodyPart: string;
	localEquipment: string;
	localTarget: string;
};

export type CatalogType = 'all' | 'non-stretch' | 'cardio' | 'stretch';
export const CATALOG_TYPES: readonly CatalogType[] = ['all', 'non-stretch', 'cardio', 'stretch'];

export type CatalogQuery = {
	q?: string;
	type?: CatalogType;
	equipment?: string[];
	muscles?: string[];
	bodyParts?: string[];
	target?: string;
};

export type CatalogFilters = { bodyParts: string[]; equipment: string[]; targets: string[] };

/** The query as URL parameters, in a stable order so equal queries encode
 * equally (the page compares encodings to skip redundant fetches). */
export function catalogParams(query: CatalogQuery, lang: 'en' | 'de'): URLSearchParams {
	const p = new URLSearchParams();
	if (query.q?.trim()) p.set('q', query.q.trim());
	if (query.type && query.type !== 'all') p.set('type', query.type);
	for (const eq of [...(query.equipment ?? [])].sort()) p.append('eq', eq);
	for (const g of [...(query.muscles ?? [])].sort()) p.append('muscle', g);
	for (const bp of [...(query.bodyParts ?? [])].sort()) p.append('bodyPart', bp);
	if (query.target) p.set('target', query.target);
	p.set('lang', lang);
	return p;
}

/** The reverse of `catalogParams`; also what the exercises page reads off its own URL. */
export function catalogQueryFromParams(p: URLSearchParams): CatalogQuery {
	const type = p.get('type');
	return {
		q: p.get('q') ?? undefined,
		type: type && (CATALOG_TYPES as readonly string[]).includes(type) ? (type as CatalogType) : 'all',
		equipment: p.getAll('eq'),
		muscles: p.getAll('muscle'),
		bodyParts: p.getAll('bodyPart'),
		target: p.get('target') ?? undefined
	};
}

type Fetch = typeof globalThis.fetch;

export async function fetchCatalog(
	query: CatalogQuery,
	lang: 'en' | 'de',
	fetchFn: Fetch = fetch,
	signal?: AbortSignal
): Promise<ExerciseSummary[]> {
	const res = await fetchFn(`/api/fitness/exercises/catalog?${catalogParams(query, lang)}`, { signal });
	if (!res.ok) throw new Error(`catalog ${res.status}`);
	const data = (await res.json()) as { exercises: ExerciseSummary[] };
	return data.exercises;
}

export async function fetchCatalogFilters(fetchFn: Fetch = fetch): Promise<CatalogFilters> {
	const res = await fetchFn('/api/fitness/exercises/catalog/filters');
	if (!res.ok) throw new Error(`catalog filters ${res.status}`);
	return (await res.json()) as CatalogFilters;
}
