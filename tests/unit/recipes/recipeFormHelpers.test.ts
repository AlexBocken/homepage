import { describe, it, expect } from 'vitest';
import {
	extractRecipeFromFormData,
	serializeRecipeForDatabase,
	splitClearedFields
} from '$utils/recipeFormHelpers';

/** The subset of the edit form's fields these cases care about. */
function formData(fields: Record<string, string>): FormData {
	const data = new FormData();
	data.set('name', 'Zwetschgenkuchen');
	data.set('short_name', 'zwetschgenkuchen');
	data.set('description', 'Blechkuchen');
	data.set('category', 'Dessert');
	data.set('icon', '🍰');
	for (const [key, value] of Object.entries(fields)) data.set(key, value);
	return data;
}

function serialize(fields: Record<string, string>) {
	return splitClearedFields(serializeRecipeForDatabase(extractRecipeFromFormData(formData(fields))));
}

describe('serializeRecipeForDatabase', () => {
	it('stores edited text fields', () => {
		const { set } = serialize({
			note: 'TODO: besseres Bild',
			preamble: 'Ein Klassiker im Spätsommer.',
			addendum: 'Hält sich zwei Tage.'
		});

		expect(set.note).toBe('TODO: besseres Bild');
		expect(set.preamble).toBe('Ein Klassiker im Spätsommer.');
		expect(set.addendum).toBe('Hält sich zwei Tage.');
	});

	// An omitted key in `$set` leaves the old text on the document, so a cleared
	// note used to come back on the next load while its English translation —
	// written as part of the whole `translations.en` object — stayed gone.
	it('writes text fields the editor cleared, rather than omitting them', () => {
		const { set } = serialize({ note: '', preamble: '', addendum: '' });

		expect(set).toHaveProperty('note', '');
		expect(set).toHaveProperty('preamble', '');
		expect(set).toHaveProperty('addendum', '');
	});

	it('keeps a chosen baking form in the update', () => {
		const { set, unset } = serialize({
			defaultForm_json: JSON.stringify({ shape: 'round', diameter: 26 })
		});

		expect(set.defaultForm).toEqual({ shape: 'round', diameter: 26 });
		expect(unset).not.toHaveProperty('defaultForm');
	});

	it('marks a removed baking form for deletion', () => {
		const { set, unset } = serialize({ defaultForm_json: '' });

		expect(set).not.toHaveProperty('defaultForm');
		expect(unset).toHaveProperty('defaultForm', '');
	});
});

describe('splitClearedFields', () => {
	it('separates nulls from values without touching empty strings', () => {
		const { set, unset } = splitClearedFields({ a: 'x', b: '', c: null, d: 0, e: false });

		expect(set).toEqual({ a: 'x', b: '', d: 0, e: false });
		expect(unset).toEqual({ c: '' });
	});
});
