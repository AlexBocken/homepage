/**
 * Keeping an English translation's ingredient and instruction lists in step
 * with the German ones where base-recipe references are concerned. Used by
 * TranslationApproval for both lists, which are merged the same way.
 */

/** A base recipe reference is either populated (an object) or just the short_name. */
export function baseRecipeShortName(baseRecipeRef: any): string {
	return typeof baseRecipeRef === 'object' ? baseRecipeRef.short_name : baseRecipeRef;
}

/**
 * The German list, position by position, with the English kept wherever it
 * already matches:
 * - a German base-recipe reference keeps the English entry at the same
 *   position if that is a reference to the same base recipe; otherwise it is
 *   the German reference, named after the base recipe's English name when
 *   one is known;
 * - a German section keeps the English entry at the same position if that is
 *   a section too; otherwise it is the German section, to be translated later.
 */
export function mergeRefs(
	german: any[],
	english: any[],
	englishNames: Map<string, { enName: string }>
): any[] {
	return german.map((germanItem: any, index: number) => {
		const englishItem = english[index];
		if (germanItem.type === 'reference' && germanItem.baseRecipeRef) {
			if (englishItem?.type === 'reference' && englishItem.baseRecipeRef === germanItem.baseRecipeRef) {
				return englishItem;
			}
			const translation = englishNames.get(baseRecipeShortName(germanItem.baseRecipeRef));
			return translation ? { ...germanItem, name: translation.enName } : germanItem;
		}
		if (englishItem && englishItem.type !== 'reference') {
			return englishItem;
		}
		return germanItem;
	});
}
