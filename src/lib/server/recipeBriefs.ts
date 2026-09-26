import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import type { BriefRecipeType } from '$types/types';
import { briefQueryConfig, toBrief } from '$lib/server/recipeHelpers';

/**
 * Cache budget for brief recipe lists (category / tag / icon / month).
 * `rand_array` is seeded per UTC day, so the shuffled order is the same for
 * every caller and the response can be shared by the edge.
 */
export const BRIEF_LIST_CACHE = 'public, max-age=28800, s-maxage=28800, stale-while-revalidate=86400';

/**
 * Cache budget for the distinct-values lists (categories, tags, icons). They
 * change only on recipe add/edit: 1 h browser + 1 d edge with SWR keeps the
 * chip bars snappy; worst case a new value shows up an hour late.
 */
export const DISTINCT_LIST_CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

/**
 * Candidates for the in-season lists: every recipe with season ranges, minus
 * the plate-icon ones. Range membership for movable anchors can't be expressed
 * in Mongo, so the callers filter these briefs in-app.
 */
export const SEASONAL_CANDIDATES = { icon: { $ne: '🍽️' }, seasonRanges: { $exists: true, $ne: [] } };

/**
 * Load the brief form of every recipe matching `filter` in the given language.
 *
 * `filter` is either a plain Mongo filter or a function of the translated-field
 * prefix (`''` for German, `'translations.en.'` for English), for filters on
 * translated fields such as category or tags. For English the approval filter
 * is merged in, so unapproved translations never appear.
 */
export async function findBriefs(
	recipeLang: string,
	filter: Record<string, unknown> | ((prefix: string) => Record<string, unknown>)
): Promise<BriefRecipeType[]> {
	const { approvalFilter, prefix, projection } = briefQueryConfig(recipeLang);
	await dbConnect();

	const query = typeof filter === 'function' ? filter(prefix) : filter;
	const dbRecipes: any[] = await Recipe.find({ ...query, ...approvalFilter }, projection).lean();
	return dbRecipes.map(r => toBrief(r, recipeLang));
}
