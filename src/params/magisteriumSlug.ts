import type { ParamMatcher } from '@sveltejs/kit';
import { isMagisteriumSlug } from '$lib/faith/magisterium';

/** One of the documents in the index, by its incipit as an address. */
export const match: ParamMatcher = (param) => isMagisteriumSlug(param);
