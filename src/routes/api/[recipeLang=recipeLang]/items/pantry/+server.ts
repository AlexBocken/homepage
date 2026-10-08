import { json, type RequestHandler } from '@sveltejs/kit';
import { getPantryIndex } from '$lib/server/pantryIndex';
import { BRIEF_LIST_CACHE } from '$lib/server/recipeBriefs';

/**
 * The pantry search index: every ingredient the recipes use, which covers which,
 * and what each recipe needs ($lib/server/pantryVocabulary). Language-neutral —
 * it carries both labels, and the page shows only the recipes its brief list
 * (approval-filtered for English) contains. Cached like the brief list it is
 * shown next to.
 */
export const GET: RequestHandler = async ({ setHeaders }) => {
  setHeaders({ 'Cache-Control': BRIEF_LIST_CACHE });
  return json(await getPantryIndex());
};
