/**
 * "Recipes changed" — the one signal every in-memory recipe index rebuilds on.
 *
 * Write paths (add, edit, delete, the nutrition endpoints) call
 * `markRecipesChanged()` after they write; it is fire-and-forget and costs the
 * request nothing. Listeners — the similarity index, the pantry index — run
 * once the writes have settled: debounced, so regenerating every recipe's
 * nutrition is one rebuild, not one per recipe.
 *
 * Listeners register under a name, so a module re-evaluated by HMR replaces its
 * listener instead of adding a second one.
 */

const DEBOUNCE_MS = 3000;

const listeners = new Map<string, () => void>();
let debounce: ReturnType<typeof setTimeout> | null = null;

export function onRecipesChanged(name: string, listener: () => void): void {
	listeners.set(name, listener);
}

export function markRecipesChanged(): void {
	if (debounce) clearTimeout(debounce);
	debounce = setTimeout(() => {
		debounce = null;
		for (const [name, listener] of listeners) {
			try {
				listener();
			} catch (error) {
				console.error(`[recipeChanges] ${name} failed:`, error);
			}
		}
	}, DEBOUNCE_MS);
	debounce.unref?.();
}
