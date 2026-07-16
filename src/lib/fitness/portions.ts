/**
 * Portion handling — the shared vocabulary for "1 Packung (250g)" style amounts.
 *
 * Grams are always the canonical stored amount: every nutrition figure is derived
 * from `per100g × grams / 100`, on every surface. A portion is a *display* lens on
 * top of that — it never participates in the nutrition math, so a portion whose
 * grams later change (a reformulated package) can't retroactively alter a logged
 * entry's calories.
 *
 * Isomorphic: imported by server endpoints and Svelte components alike.
 */

export type Portion = { description: string; grams: number };

/**
 * How many of `portion` the gram amount represents, rounded to 0.1 — the inverse
 * of the qty × grams the user typed. Null when the portion is unusable as a basis
 * (missing, or non-positive grams), which is the caller's cue to show plain grams.
 */
export function portionMultiplier(amountGrams: number, portion: Portion | null | undefined): number | null {
	if (!portion || !(portion.grams > 0)) return null;
	return Math.round((amountGrams / portion.grams) * 10) / 10;
}

/**
 * Label a logged amount: "2 × 1 Packung (250g)" when a portion basis is known,
 * plain "500 g" otherwise. The gram figure stays visible either way — the portion
 * count is the friendly framing, not a replacement for the real amount.
 */
export function formatAmountLabel(
	amountGrams: number,
	portion: Portion | null | undefined,
	opts: { withGrams?: boolean } = {}
): string {
	const mult = portionMultiplier(amountGrams, portion);
	const grams = `${Math.round(amountGrams)} g`;
	if (mult == null || !portion) return grams;
	const count = Number.isInteger(mult) ? String(mult) : mult.toFixed(1);
	const label = `${count} × ${portion.description}`;
	return opts.withGrams === false ? label : `${label} · ${grams}`;
}

/**
 * Narrow untrusted JSON to a Portion, or null. Endpoints accept portions straight
 * from the client, so a bad `grams` here would corrupt the display multiplier of a
 * stored entry; anything non-positive or unlabelled is dropped rather than saved.
 */
export function coercePortion(v: unknown): Portion | null {
	if (!v || typeof v !== 'object') return null;
	const { description, grams } = v as Record<string, unknown>;
	if (typeof description !== 'string' || !description.trim()) return null;
	if (typeof grams !== 'number' || !isFinite(grams) || grams <= 0) return null;
	return { description: description.trim().slice(0, 120), grams };
}

/** Narrow an untrusted array to Portions, dropping invalid entries. */
export function coercePortions(v: unknown): Portion[] | undefined {
	if (!Array.isArray(v)) return undefined;
	const out = v.map(coercePortion).filter((p): p is Portion => p !== null).slice(0, 20);
	return out.length > 0 ? out : undefined;
}

/** Round a portion's gram figure for display — packages are rarely fractional. */
export function formatPortionGrams(grams: number): string {
	return Math.round(grams).toString();
}

/** A portion's dropdown label: "1 Packung (250g)". */
export function portionOptionLabel(portion: Portion): string {
	return `${portion.description} (${formatPortionGrams(portion.grams)}g)`;
}
