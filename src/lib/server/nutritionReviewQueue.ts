/**
 * Every recipe, read as nutrition-review work.
 *
 * The mapper in the editor answers "is *this* recipe done"; the queue answers
 * "which ones still need me, and how far along am I". Both read the same
 * `reviewSummary`, so a recipe the editor shows as all-green is exactly the one
 * the queue skips.
 *
 * One query, no per-recipe round trips: a recipe's own mappings are all the
 * summary needs, and base recipes are reviewed in their own right when the queue
 * reaches them.
 */
import { Recipe } from '$models/Recipe';
import { dbConnect } from '$utils/db';
import { reviewSummary, type ReviewSummary } from '$lib/js/nutritionTriage';

export type QueueEntry = {
	shortName: string;
	name: string;
	/** Whether the recipe has any mappings at all — a never-generated recipe is a
	 *  different kind of work from one with a couple of flagged lines. */
	generated: boolean;
} & ReviewSummary;

export type ReviewQueue = {
	/** Alphabetical, green and pending alike — the order the review walks in, so
	 *  a session can be resumed where it left off. */
	entries: QueueEntry[];
	/** Just the slugs that still need a person, in the same order. */
	pending: string[];
	total: number;
	green: number;
	/** Share of recipes needing nothing, 0–100, rounded to one decimal. */
	greenPercent: number;
};

const QUEUE_FIELDS = 'short_name name ingredients nutritionMappings';

export async function loadReviewQueue(): Promise<ReviewQueue> {
	await dbConnect();
	const recipes = await Recipe.find({}).select(QUEUE_FIELDS).lean();

	const entries: QueueEntry[] = (recipes as any[])
		.map((r) => ({
			shortName: r.short_name,
			name: r.name || r.short_name,
			generated: (r.nutritionMappings?.length ?? 0) > 0,
			...reviewSummary(r.ingredients || [], r.nutritionMappings || []),
		}))
		.sort((a, b) => a.name.localeCompare(b.name, 'de'));

	const green = entries.filter((e) => e.clean).length;
	return {
		entries,
		pending: entries.filter((e) => !e.clean).map((e) => e.shortName),
		total: entries.length,
		green,
		greenPercent: entries.length ? Math.round((green / entries.length) * 1000) / 10 : 0,
	};
}
