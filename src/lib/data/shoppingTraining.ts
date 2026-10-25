/**
 * Static training set for the shopping category classifier. Manual overrides
 * from the DB are added on top at runtime (see shoppingCategorizer.ts).
 *
 * Sources, in priority order — a text that appears in several keeps the label
 * of the first:
 * 1. Bring! catalog names with their hand-checked icon category
 * 2. Representative items (shoppingCategoryItems.ts)
 * 3. Icon aliases, labelled with their target icon's category
 * 4. Generated items (shoppingTrainingItems.json) — an LLM-written list of
 *    realistic Swiss shopping-list entries, the bulk of the data
 *
 * After changing any of these, re-run `pnpm exec vite-node
 * scripts/embed-shopping-training.ts` so the shipped embeddings cover them
 * (missing ones are embedded at startup, which only costs time).
 */
import catalog from './shoppingCatalog.json';
import iconCategories from './shoppingIconCategories.json';
import generated from './shoppingTrainingItems.json';
import { CATEGORY_ITEMS } from './shoppingCategoryItems';
import { ICON_ALIASES } from './shoppingIconAliases';

export interface LabeledItem {
	text: string;
	category: string;
}

/** `catalog: false` leaves out source 1, for labelling the catalog itself. */
export function baseTrainingItems({ catalog: withCatalog = true } = {}): LabeledItem[] {
	const items = new Map<string, string>();
	const add = (text: string, category: string | undefined) => {
		const key = text.toLowerCase().trim();
		if (key && category && !items.has(key)) items.set(key, category);
	};

	const cats = iconCategories as Record<string, string>;
	const catalogNames = new Map<string, string>();
	for (const name of Object.keys(catalog)) {
		if (withCatalog) add(name, cats[name]);
		catalogNames.set(name.toLowerCase(), name);
	}
	for (const item of CATEGORY_ITEMS) add(item.name, item.category);
	for (const [alias, target] of Object.entries(ICON_ALIASES)) {
		const name = catalogNames.get(target);
		if (name) add(alias, cats[name]);
	}
	for (const item of generated as LabeledItem[]) add(item.text, item.category);

	return [...items].map(([text, category]) => ({ text, category }));
}
