/**
 * The shared pieces of the recipe add/edit form actions. The failures they
 * build are what the form shows, so status, message and refill values are
 * pinned here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect, isRedirect } from '@sveltejs/kit';

const processAndSaveRecipeImage = vi.fn();
vi.mock('$utils/imageProcessing', () => ({
	processAndSaveRecipeImage: (...args: unknown[]) => processAndSaveRecipeImage(...args)
}));

import {
	errorMessage,
	isDuplicateKeyError,
	formFailure,
	requireRecipeEditor,
	validationFailure,
	saveUploadedImage,
	dbFailure,
	unexpectedFailure
} from '$lib/server/recipeFormAction';
import type { RecipeFormData } from '$utils/recipeFormHelpers';

function form(values: Record<string, string> = { name: 'Brot', short_name: 'brot' }) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.append(k, v);
	return fd;
}

function locals(user: Record<string, unknown> | null): App.Locals {
	const session = user ? ({ user } as unknown as App.Locals['session']) : null;
	return { session, auth: async () => session } as unknown as App.Locals;
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
	processAndSaveRecipeImage.mockReset();
});

describe('errorMessage / isDuplicateKeyError', () => {
	it('reads the message of an Error and stringifies anything else', () => {
		expect(errorMessage(new Error('boom'))).toBe('boom');
		expect(errorMessage('plain')).toBe('plain');
		expect(errorMessage(42)).toBe('42');
	});

	it('recognises only the 11000 duplicate-key code', () => {
		expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
		expect(isDuplicateKeyError({ code: 11001 })).toBe(false);
		expect(isDuplicateKeyError(new Error('x'))).toBe(false);
		expect(isDuplicateKeyError(null)).toBe(false);
		expect(isDuplicateKeyError('11000')).toBe(false);
	});
});

describe('formFailure', () => {
	it('sends the submitted values back', () => {
		const f = formFailure(404, 'nope', ['Recipe not found'], form({ a: '1' }));
		expect(f.status).toBe(404);
		expect(f.data).toEqual({ error: 'nope', errors: ['Recipe not found'], values: { a: '1' } });
	});
});

describe('requireRecipeEditor', () => {
	it('401 for a logged-out user, worded for the page', async () => {
		const f = await requireRecipeEditor(locals(null), 'add');
		expect(f?.status).toBe(401);
		expect(f?.data).toEqual({ error: 'You must be logged in to add recipes', requiresAuth: true });
	});

	it('403 without the rezepte_users group', async () => {
		const f = await requireRecipeEditor(locals({ nickname: 'x', groups: ['cospend'] }), 'edit');
		expect(f?.status).toBe(403);
		expect(f?.data).toEqual({ error: 'You do not have permission to edit recipes', requiresAuth: true });
	});

	it('lets a recipe editor through', async () => {
		expect(await requireRecipeEditor(locals({ nickname: 'x', groups: ['rezepte_users'] }), 'add')).toBeNull();
	});

	it('falls back to locals.auth() when no session is cached', async () => {
		const l = { auth: async () => ({ user: { nickname: 'x', groups: ['rezepte_users'] } }) } as unknown as App.Locals;
		expect(await requireRecipeEditor(l, 'add')).toBeNull();
	});
});

describe('validationFailure', () => {
	it('is null for a valid recipe', () => {
		const data = {
			name: 'Brot',
			short_name: 'brot',
			description: 'd',
			category: 'Brot',
			ingredients: [{}],
			instructions: [{}]
		} as unknown as RecipeFormData;
		expect(validationFailure(data, form())).toBeNull();
	});

	it('400 joining every problem', () => {
		const f = validationFailure({} as RecipeFormData, form());
		expect(f?.status).toBe(400);
		const data = f?.data as { error: string; errors: string[] };
		expect(data.errors.length).toBeGreaterThan(0);
		expect(data.error).toBe(data.errors.join(', '));
	});
});

describe('saveUploadedImage', () => {
	const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });

	it('returns the saved filename and blur', async () => {
		processAndSaveRecipeImage.mockResolvedValue({ filename: 'brot.1234abcd.webp', unhashedFilename: 'brot.webp', blur: 'b64' });
		expect(await saveUploadedImage(file, 'brot', form())).toEqual({ filename: 'brot.1234abcd.webp', blur: 'b64' });
		expect(processAndSaveRecipeImage.mock.calls[0][1]).toBe('brot');
	});

	it('turns a processing error into a 400', async () => {
		processAndSaveRecipeImage.mockRejectedValue(new Error('bad jpeg'));
		const saved = await saveUploadedImage(file, 'brot', form({ a: '1' }));
		expect('failure' in saved && saved.failure.status).toBe(400);
		expect('failure' in saved && saved.failure.data).toEqual({
			error: 'Failed to process image: bad jpeg',
			errors: ['Image processing failed'],
			values: { a: '1' }
		});
	});
});

describe('dbFailure', () => {
	it('passes a redirect on', () => {
		let r: unknown;
		try {
			redirect(303, '/rezepte/brot');
		} catch (e) {
			r = e;
		}
		expect(() => dbFailure(r, 'create', 'brot', form())).toThrow();
		try {
			dbFailure(r, 'create', 'brot', form());
		} catch (e) {
			expect(isRedirect(e)).toBe(true);
		}
	});

	it('400 for a duplicate short name', () => {
		const f = dbFailure({ code: 11000 }, 'update', 'brot', form({ a: '1' }));
		expect(f.status).toBe(400);
		expect(f.data).toEqual({
			error: 'A recipe with the short name "brot" already exists. Please choose a different short name.',
			errors: ['Duplicate short_name'],
			values: { a: '1' }
		});
	});

	it('500 for anything else, naming the operation', () => {
		expect(dbFailure(new Error('down'), 'create', 'brot', form()).data).toMatchObject({
			error: 'Failed to create recipe: down',
			errors: ['down']
		});
		expect(dbFailure(new Error(''), 'update', 'brot', form()).data).toMatchObject({
			error: 'Failed to update recipe: Unknown database error',
			errors: ['']
		});
		expect(dbFailure(new Error('x'), 'update', 'brot', form()).status).toBe(500);
	});
});

describe('unexpectedFailure', () => {
	it('passes a redirect on', () => {
		let r: unknown;
		try {
			redirect(303, '/rezepte/brot');
		} catch (e) {
			r = e;
		}
		expect(() => unexpectedFailure(r, 'recipe')).toThrow();
	});

	it('500 without refill values', () => {
		const f = unexpectedFailure(new Error('oops'), 'recipe update');
		expect(f.status).toBe(500);
		expect(f.data).toEqual({ error: 'Failed to process recipe update: oops', errors: ['oops'] });
		expect(unexpectedFailure(new Error(''), 'recipe').data).toEqual({
			error: 'Failed to process recipe: Unknown error',
			errors: ['']
		});
	});
});
