/**
 * Which recipe an ingredient line points at.
 *
 * A recipe can build on another two ways: a `type: 'reference'` ingredient
 * section naming a base recipe, or an ordinary ingredient whose name is a link
 * — "<a href='pizzateig'>Pizzateig</a>". The second is just a string, and the
 * rule for reading it was written out twice, in the matcher and in the food-log
 * decomposer. Since it decides which recipes get counted into another's
 * nutrition, the two agreeing is not optional.
 */

/**
 * The recipe short_name an ingredient name links to, or null if it links
 * elsewhere or nowhere.
 *
 * Only site-relative links count: an external URL is a citation, not a
 * component, and a href with a dot in it is a file rather than a recipe slug.
 */
export function parseAnchorRecipeRef(ingredientName: string): string | null {
	const match = ingredientName.match(/<a\s+href=["']?([^"' >]+)["']?[^>]*>/i);
	if (!match) return null;
	let href = match[1].trim().split('?')[0];
	if (href.startsWith('http') || href.includes('://')) return null;
	href = href.replace(/^(\.?\/?rezepte\/|\.\/|\/)/, '');
	if (href.includes('.')) return null;
	return href || null;
}

/** True when this ingredient line is a link to another recipe rather than a food. */
export function isAnchorRef(ingredientName: string): boolean {
	return /<a\s/i.test(ingredientName || '');
}

const plain = (html: string) => html.replace(/<[^>]*>/g, '').toLowerCase().trim();

/**
 * Tells whether an ingredient line is another section of the same recipe,
 * listed again as a component — "Teig" inside "Belag" when there is a "Teig"
 * section above. Its content is already counted in that section, so the line
 * is neither weighed (nutrition) nor something to have at home (pantry).
 */
export function sectionRepeatCheck(sections: { name?: string }[] | undefined) {
	const names = new Set<string>();
	for (const section of sections ?? []) if (section?.name) names.add(plain(section.name));
	return (itemName: string, ownSectionName: string | undefined): boolean => {
		const item = plain(itemName ?? '');
		return !!item && names.has(item) && item !== plain(ownSectionName ?? '');
	};
}
