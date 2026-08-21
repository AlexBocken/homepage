/**
 * Flipping one value in a query string.
 *
 * This is what a filter links to when there is no script to handle its click: the
 * filters as they stand, with this one turned on or off. Shared because the recipe
 * listing and the exercise search both express their filters as links now, and a
 * second copy of "toggle a repeated parameter" is a second place to get it wrong.
 */

/**
 * The same parameters with one value flipped.
 *
 * Repeated keys (`tag`, `muscle`) toggle the one value and keep the rest sorted, so
 * the same set of filters always produces the same string; single keys (`category`,
 * `sort`) are set, or removed when they already hold that value, so the control that
 * turned a filter on is also the one that turns it off.
 */
export function toggledParams(
	params: URLSearchParams,
	key: string,
	value: string,
	repeated = false,
): URLSearchParams {
	const next = new URLSearchParams(params);
	if (repeated) {
		const values = next.getAll(key);
		next.delete(key);
		const kept = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
		for (const v of kept.sort()) next.append(key, v);
		return next;
	}
	if (next.get(key) === value) next.delete(key);
	else next.set(key, value);
	return next;
}

/** A path plus parameters, with the `?` dropped when there are none. */
export function withParams(path: string, params: URLSearchParams): string {
	const query = params.toString();
	return query ? `${path}?${query}` : path;
}
