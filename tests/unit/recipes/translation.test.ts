/**
 * Characterization test for src/utils/translation.ts (DeepL translation service).
 *
 * This pins the CURRENT behaviour — outputs and the exact DeepL round-trips — so a
 * refactor can prove it changed nothing. The snapshots are the spec: if one moves,
 * the refactor changed behaviour. Do not "fix" a snapshot without meaning to.
 *
 * DeepL is emulated by a stubbed fetch that answers every `text` param with
 * `EN:<text>`, in order. Every call is recorded (URL, headers, params) and the
 * list of calls is snapshotted per scenario.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$env/static/private', () => ({
	DEEPL_API_KEY: 'test-deepl-key',
	DEEPL_API_URL: 'https://deepl.test/v2/translate'
}));

import { DeepLTranslationService } from '../../../src/utils/translation';

type Call = {
	url: string;
	method?: string;
	headers: Record<string, string>;
	target_lang: string | null;
	tag_handling: string | null;
	texts: string[];
};

let calls: Call[] = [];
let failWith: { status: number; body: string } | null = null;

function deeplFetch(url: string, init: RequestInit) {
	const params = new URLSearchParams(String(init.body));
	const texts = params.getAll('text');
	calls.push({
		url: String(url),
		method: init.method,
		headers: { ...(init.headers as Record<string, string>) },
		target_lang: params.get('target_lang'),
		tag_handling: params.get('tag_handling'),
		texts
	});
	if (failWith) {
		const { status, body } = failWith;
		return Promise.resolve({
			ok: false,
			status,
			text: () => Promise.resolve(body),
			json: () => Promise.reject(new Error('no json'))
		});
	}
	return Promise.resolve({
		ok: true,
		status: 200,
		text: () => Promise.resolve(''),
		json: () =>
			Promise.resolve({
				translations: texts.map((t) => ({ detected_source_language: 'DE', text: `EN:${t}` }))
			})
	});
}

let svc: DeepLTranslationService;

beforeEach(() => {
	calls = [];
	failWith = null;
	vi.stubGlobal('fetch', vi.fn(deeplFetch));
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	svc = new DeepLTranslationService();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

// --- Fixtures -------------------------------------------------------------

function richRecipe(): any {
	return {
		short_name: 'aepfel-kuchen',
		name: 'Äpfel-Kuchen mit Süssem Guss',
		description: 'Ein saftiger Kuchen mit Zucchini und Öl',
		preamble: 'Omas <b>bestes</b> Rezept',
		addendum: 'Hält sich 3 Tage',
		note: '',
		category: 'Kuchen',
		tags: ['Herbst', '', 'süss', 'Aubergine eggplant'],
		portions: '1 Blech',
		preparation: '20 min',
		cooking: '',
		total_time: '1 h',
		baking: { temperature: '180 °C', length: '45 min', mode: 'Umluft' },
		fermentation: { bulk: '', final: '30 min' },
		add_info: { stuff: 'not translated' },
		ingredients: [
			{
				type: 'section',
				name: 'Teig',
				list: [
					{ name: 'Mehl', unit: 'g', amount: '250' },
					{ name: 'Ei', unit: '', amount: '2' },
					{ name: 'Olivenöl', unit: 'EL', amount: '3' },
					{ name: 'Salz', unit: 'Prise', amount: '1' },
					{ name: 'Strasse-ss Zucker', unit: 'TL', amount: '' }
				]
			},
			{
				type: 'reference',
				name: 'Mürbeteig',
				baseRecipeRef: 'abc123',
				includeIngredients: true,
				showLabel: true,
				labelOverride: 'Für den Boden',
				itemsBefore: [{ name: 'Butter', unit: 'g', amount: '50' }],
				itemsAfter: [
					{ name: 'Äpfel', unit: 'Stück', amount: '4' },
					{ name: '', unit: 'Bund', amount: '1' }
				]
			},
			{
				type: 'section',
				name: '',
				list: []
			}
		],
		instructions: [
			{
				type: 'section',
				name: 'Vorbereitung',
				steps: ['Äpfel schälen.', '', 'Ofen auf 180 °C vorheizen, Zweige Rosmarin dazu.']
			},
			{
				type: 'reference',
				name: 'Mürbeteig',
				baseRecipeRef: 'abc123',
				includeInstructions: true,
				showLabel: false,
				labelOverride: '',
				stepsBefore: ['Butter weich werden lassen.'],
				stepsAfter: ['Kühl stellen.', 'Ausrollen.']
			},
			{
				type: 'section',
				name: 'Backen',
				steps: ['30 Minuten backen, dann green onions darüber.']
			}
		],
		images: [
			{ mediapath: 'a.webp', alt: 'Kuchen von oben', caption: '' },
			{ mediapath: 'b.webp', alt: '', caption: 'Frisch aus dem Ofen' }
		]
	};
}

function clone<T>(x: T): T {
	return JSON.parse(JSON.stringify(x));
}

// --- translateText / translateBatch --------------------------------------

describe('translateText', () => {
	it('returns "" without calling DeepL for empty/whitespace/null input', async () => {
		const out = [
			await svc.translateText(''),
			await svc.translateText('   '),
			await svc.translateText(null),
			await svc.translateText(undefined)
		];
		expect(out).toEqual(['', '', '', '']);
		expect(calls).toEqual([]);
	});

	it('preprocesses German terms, applies British English, sends one request', async () => {
		const out = [
			await svc.translateText('2 EL Öl, 1 TL Salz, 1 Prise Pfeffer, 1 Ei, Zucchini'),
			await svc.translateText('eggplant und bell peppers mit cilantro', 'EN-US'),
			await svc.translateText('<p>Backen im Ofen</p>', 'EN-GB', true)
		];
		expect({ out, calls }).toMatchSnapshot();
	});

	it('replaces terms only as whole words, umlauts included', async () => {
		await svc.translateText('Öl und Olivenöl, ÖL');
		// "Öl" alone is a term; inside "Olivenöl" it is not
		expect(calls[0].texts).toEqual(['Oil und Olivenöl, Oil']);
	});

	it('throws when the API key is missing', async () => {
		(svc as any).apiKey = '';
		await expect(svc.translateText('Hallo')).rejects.toThrowErrorMatchingSnapshot();
		// empty still short-circuits before the key check
		await expect(svc.translateText('')).resolves.toBe('');
		expect(calls).toEqual([]);
	});

	it('throws on a non-ok DeepL response', async () => {
		failWith = { status: 500, body: 'Internal Server Error' };
		await expect(svc.translateText('Hallo')).rejects.toThrowErrorMatchingSnapshot();
		expect(calls).toMatchSnapshot();
	});

	it('returns "" when DeepL returns no translations', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() =>
				Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ translations: [] }) })
			)
		);
		await expect(svc.translateText('Hallo')).resolves.toBe('');
	});
});

describe('translateBatch', () => {
	it('returns [] for no input without calling DeepL', async () => {
		expect(await svc.translateBatch([])).toEqual([]);
		expect(calls).toEqual([]);
	});

	it('returns blanks without calling DeepL when every text is empty', async () => {
		expect(await svc.translateBatch(['', '  ', ''])).toEqual(['', '', '']);
		expect(calls).toEqual([]);
	});

	it('translates only non-empty texts and re-slots them in order', async () => {
		const out = await svc.translateBatch(['Mehl', '', 'EL', '  ', 'scallions', 'Äpfel ss']);
		expect({ out, calls }).toMatchSnapshot();
	});

	it('throws when the API key is missing (but not for an empty list)', async () => {
		(svc as any).apiKey = '';
		expect(await svc.translateBatch([])).toEqual([]);
		await expect(svc.translateBatch([''])).rejects.toThrowErrorMatchingSnapshot();
	});

	it('throws on a non-ok DeepL response', async () => {
		failWith = { status: 500, body: 'boom' };
		await expect(svc.translateBatch(['a', 'b'])).rejects.toThrowErrorMatchingSnapshot();
		expect(calls).toHaveLength(1);
	});
});

// --- translateRecipe ------------------------------------------------------

describe('translateRecipe', () => {
	it('translates a rich recipe in a single batch (known category)', async () => {
		const out = await svc.translateRecipe(richRecipe());
		expect({ out, calls }).toMatchSnapshot();
	});

	it('uses translateText for an unknown category (extra round-trip)', async () => {
		const r = richRecipe();
		r.category = 'Aufstrich';
		const out = await svc.translateRecipe(r);
		expect({ category: out.category, calls: calls.map((c) => c.texts) }).toMatchSnapshot();
	});

	it('handles a minimal recipe with missing optional fields', async () => {
		const out = await svc.translateRecipe({
			name: 'Brot',
			description: 'Einfach',
			category: 'Brot'
		} as any);
		expect({ out, calls }).toMatchSnapshot();
	});

	it('handles non-array images and undefined preamble', async () => {
		const out = await svc.translateRecipe({
			name: 'Suppe',
			description: 'Warm',
			category: 'Suppe',
			images: { not: 'an array' },
			tags: []
		} as any);
		expect(out.images).toEqual([]);
		expect(calls).toMatchSnapshot();
	});

	it('propagates a DeepL error', async () => {
		failWith = { status: 500, body: 'down' };
		await expect(svc.translateRecipe(richRecipe())).rejects.toThrowErrorMatchingSnapshot();
		expect(calls).toHaveLength(1);
	});
});

// --- generateEnglishSlug --------------------------------------------------

describe('generateEnglishSlug', () => {
	it('slugifies', () => {
		expect(
			[
				'Äpfel-Kuchen mit Süssem Guss',
				'  Öl & Essig!! ',
				'Grüsse aus München',
				'EN:Apple cake',
				'---'
			].map((s) => svc.generateEnglishSlug(s))
		).toMatchSnapshot();
	});
});

// --- detectChangedFields --------------------------------------------------

describe('detectChangedFields', () => {
	it('reports nothing for identical recipes', () => {
		const r = richRecipe();
		expect(svc.detectChangedFields(r, clone(r))).toMatchSnapshot();
	});

	it('detects scalar, nested and list changes', () => {
		const a = richRecipe();
		const b = clone(a);
		b.name = 'Apfelkuchen';
		b.note = ''; // unchanged ('' vs '')
		b.tags = ['Herbst'];
		b.baking.temperature = '200 °C';
		b.fermentation = undefined; // object -> '' counts as changed
		b.addendum = undefined; // '...' -> '' changed
		b.add_info = { stuff: 'different' }; // not checked
		b.images = []; // not checked
		expect(svc.detectChangedFields(a, b)).toMatchSnapshot();
	});

	it('treats missing vs empty-string as equal', () => {
		const a: any = { name: 'x', description: 'y', note: '', ingredients: [], instructions: [] };
		const b: any = { name: 'x', description: 'y' };
		expect(svc.detectChangedFields(a, b)).toMatchSnapshot();
	});

	it('detects ingredient section / item / group-count changes', () => {
		const a = richRecipe();
		const b = clone(a);
		b.ingredients[0].name = 'Rührteig'; // name change
		b.ingredients[0].list[1].amount = '3'; // amount only
		b.ingredients[0].list.push({ name: 'Zimt', unit: 'TL', amount: '1' }); // added item
		b.ingredients[2].list = [{ name: 'Neu', unit: '', amount: '' }];
		b.ingredients.push({ type: 'section', name: 'Extra', list: [] }); // added group
		expect(svc.detectChangedFields(a, b)).toMatchSnapshot();
	});

	it('detects removed ingredient items / groups', () => {
		const a = richRecipe();
		const b = clone(a);
		b.ingredients[0].list.splice(4, 1);
		b.ingredients.pop();
		expect(svc.detectChangedFields(a, b).ingredientChanges).toMatchSnapshot();
	});

	it('detects ingredient reference changes (each field) and type swaps', () => {
		const base = richRecipe();
		const variants: Record<string, (r: any) => void> = {
			baseRecipeRef: (r) => (r.ingredients[1].baseRecipeRef = 'zzz'),
			includeIngredients: (r) => (r.ingredients[1].includeIngredients = false),
			showLabel: (r) => (r.ingredients[1].showLabel = false),
			labelOverride: (r) => (r.ingredients[1].labelOverride = 'Anders'),
			itemsBefore: (r) => (r.ingredients[1].itemsBefore = []),
			itemsAfter: (r) => r.ingredients[1].itemsAfter.push({ name: 'x', unit: '', amount: '' }),
			nameOnly: (r) => (r.ingredients[1].name = 'Anderer Name'), // not compared for refs
			refToSection: (r) => (r.ingredients[1] = { type: 'section', name: 'S', list: [] }),
			sectionToRef: (r) => (r.ingredients[0] = clone(base.ingredients[1]))
		};
		const out: Record<string, unknown> = {};
		for (const [k, mut] of Object.entries(variants)) {
			const b = clone(base);
			mut(b);
			const res = svc.detectChangedFields(base, b);
			out[k] = { fields: res.fields, ingredientChanges: res.ingredientChanges };
		}
		expect(out).toMatchSnapshot();
	});

	it('detects instruction section / step / reference changes', () => {
		const base = richRecipe();
		const variants: Record<string, (r: any) => void> = {
			sectionName: (r) => (r.instructions[0].name = 'Vorher'),
			stepText: (r) => (r.instructions[0].steps[0] = 'Äpfel waschen.'),
			emptyStepStaysEmpty: (r) => (r.instructions[0].steps[1] = ''), // '' vs '' -> counted as changed
			stepAdded: (r) => r.instructions[2].steps.push('Abkühlen.'),
			stepRemoved: (r) => r.instructions[0].steps.pop(),
			groupAdded: (r) => r.instructions.push({ type: 'section', name: 'N', steps: [] }),
			groupRemoved: (r) => r.instructions.pop(),
			refBase: (r) => (r.instructions[1].baseRecipeRef = 'zzz'),
			refInclude: (r) => (r.instructions[1].includeInstructions = false),
			refShowLabel: (r) => (r.instructions[1].showLabel = true),
			refLabel: (r) => (r.instructions[1].labelOverride = 'X'),
			refStepsBefore: (r) => (r.instructions[1].stepsBefore = ['anders']),
			refStepsAfter: (r) => (r.instructions[1].stepsAfter = []),
			refToSection: (r) => (r.instructions[1] = { type: 'section', name: 'S', steps: [] })
		};
		const out: Record<string, unknown> = {};
		for (const [k, mut] of Object.entries(variants)) {
			const b = clone(base);
			mut(b);
			const res = svc.detectChangedFields(base, b);
			out[k] = { fields: res.fields, instructionChanges: res.instructionChanges };
		}
		expect(out).toMatchSnapshot();
	});
});

// --- translateFields ------------------------------------------------------

const ALL_FIELDS = [
	'name',
	'description',
	'preamble',
	'addendum',
	'note',
	'category',
	'tags',
	'portions',
	'preparation',
	'cooking',
	'total_time',
	'baking',
	'fermentation',
	'ingredients',
	'instructions',
	'unknown_field'
];

describe('translateFields', () => {
	it('translates every field (array form, no old recipe => full ingredient/instruction path)', async () => {
		const out = await svc.translateFields(richRecipe(), ALL_FIELDS);
		expect({ out, calls }).toMatchSnapshot();
	});

	it('unknown category falls back to translateText; known one makes no call', async () => {
		const r = richRecipe();
		const known = await svc.translateFields(r, ['category']);
		const knownCalls = calls.length;
		r.category = 'Aufstrich';
		const unknown = await svc.translateFields(r, ['category']);
		expect({ known, knownCalls, unknown, calls }).toMatchSnapshot();
	});

	it('handles a recipe with every optional field missing', async () => {
		const out = await svc.translateFields(
			{ name: 'Brot', description: '', category: 'Brot' } as any,
			ALL_FIELDS
		);
		expect({ out, calls }).toMatchSnapshot();
	});

	it('array form + oldRecipe: derives changes and does a delta translation', async () => {
		const oldR = richRecipe();
		const existing = await svc.translateRecipe(oldR);
		calls = [];
		const newR = clone(oldR);
		newR.name = 'Birnenkuchen';
		newR.ingredients[0].list[0].name = 'Dinkelmehl';
		newR.ingredients[0].list.push({ name: 'Zimt', unit: 'TL', amount: '1' });
		newR.ingredients[1].itemsAfter[0].amount = '5';
		newR.instructions[0].steps[0] = 'Birnen schälen.';
		newR.instructions[1].stepsAfter = ['Kühl stellen.'];
		const changes = svc.detectChangedFields(oldR, newR);
		const out = await svc.translateFields(newR, changes.fields, oldR, existing);
		expect({ changes, out, calls }).toMatchSnapshot();
	});

	it('object form: uses provided change info', async () => {
		const oldR = richRecipe();
		const existing = await svc.translateRecipe(oldR);
		calls = [];
		const newR = clone(oldR);
		newR.ingredients[0].name = 'Rührteig';
		newR.instructions[2].name = 'Im Ofen';
		const changes = svc.detectChangedFields(oldR, newR);
		const out = await svc.translateFields(newR, changes, undefined, existing);
		expect({ changes, out, calls }).toMatchSnapshot();
	});

	it('object form without change arrays => full translation of ingredients/instructions', async () => {
		const out = await svc.translateFields(richRecipe(), { fields: ['ingredients', 'instructions'] });
		expect({ out, calls }).toMatchSnapshot();
	});

	it('changes provided but no existing translation => each group translated whole', async () => {
		const r = richRecipe();
		const changes = svc.detectChangedFields(r, r);
		const out = await svc.translateFields(r, { ...changes, fields: ['ingredients', 'instructions'] });
		expect({ out, calls }).toMatchSnapshot();
	});

	it('propagates a DeepL error', async () => {
		failWith = { status: 500, body: 'nope' };
		await expect(svc.translateFields(richRecipe(), ['name'])).rejects.toThrowErrorMatchingSnapshot();
	});
});

// --- private ingredient / instruction helpers -----------------------------

describe('_translateIngredients / _translateInstructions (full)', () => {
	it('translates sections, passes references through untouched', async () => {
		const r = richRecipe();
		const ing = await (svc as any)._translateIngredients(r.ingredients);
		const inst = await (svc as any)._translateInstructions(r.instructions);
		expect(ing[1]).toBe(r.ingredients[1]);
		expect(inst[1]).toBe(r.instructions[1]);
		expect({ ing, inst, calls }).toMatchSnapshot();
	});

	it('only references => no DeepL call', async () => {
		const r = richRecipe();
		const ing = await (svc as any)._translateIngredients([r.ingredients[1]]);
		const inst = await (svc as any)._translateInstructions([r.instructions[1]]);
		expect({ ing, inst, calls }).toMatchSnapshot();
	});
});

describe('_translateIngredientsPartial', () => {
	const existingIngredients = () => [
		{
			type: 'section',
			name: 'OLD:Teig',
			list: [
				{ name: 'OLD:Mehl', unit: 'OLD:g', amount: '250' },
				{ name: 'OLD:Ei', unit: '', amount: '2' },
				{ name: 'OLD:Olivenöl', unit: 'OLD:EL', amount: '3' }
			]
		},
		{
			type: 'reference',
			name: 'Mürbeteig',
			baseRecipeRef: 'abc123',
			includeIngredients: true,
			showLabel: true,
			labelOverride: 'OLD:label',
			itemsBefore: [{ name: 'OLD:Butter', unit: 'OLD:g', amount: '50' }],
			itemsAfter: [{ name: 'OLD:Äpfel', unit: 'OLD:Stück', amount: '4' }]
		}
	];

	it('no changes => full _translateIngredients path', async () => {
		const r = richRecipe();
		const out = await (svc as any)._translateIngredientsPartialWithMetadata(r.ingredients, [], undefined);
		expect({ out, calls }).toMatchSnapshot();
	});

	it('mixed per-item change flags, missing existing items, missing change entries', async () => {
		const r = richRecipe();
		const changes = [
			// section: name unchanged, item0 unchanged, item1 changed, item2 unchanged,
			// item3 no flag (?? true), item4 no existing item
			{ groupIndex: 0, changed: true, nameChanged: false, itemChanges: [false, true, false] },
			// reference: nameChanged flag => labelOverride re-translated; itemsBefore/After
			// compared against existing translation (always differ here) => re-translated
			{ groupIndex: 1, changed: true, nameChanged: true }
			// group 2: no change entry => translated whole
		];
		const out = await (svc as any)._translateIngredientsPartialWithMetadata(
			r.ingredients,
			existingIngredients(),
			changes
		);
		expect({ out, calls }).toMatchSnapshot();
	});

	it('reference with equal items keeps existing translation; section name change', async () => {
		const r = richRecipe();
		// make the source ref items equal to the "existing" ones so JSON compare is equal
		const existing = existingIngredients();
		r.ingredients[1].itemsBefore = clone(existing[1].itemsBefore);
		r.ingredients[1].itemsAfter = clone(existing[1].itemsAfter);
		r.ingredients[0].list = r.ingredients[0].list.slice(0, 3);
		const changes = [
			{ groupIndex: 0, changed: true, nameChanged: true, itemChanges: [false, false, false] },
			{ groupIndex: 1, changed: false }
		];
		const out = await (svc as any)._translateIngredientsPartialWithMetadata(
			r.ingredients.slice(0, 2),
			existing,
			changes
		);
		expect({ out, calls }).toMatchSnapshot();
	});

	it('reference with no existing group => translated whole', async () => {
		const r = richRecipe();
		const out = await (svc as any)._translateIngredientsPartial(
			[r.ingredients[1]],
			[],
			[{ groupIndex: 0, changed: true }]
		);
		expect({ out, calls }).toMatchSnapshot();
	});
});

describe('_translateInstructionsPartial', () => {
	const existingInstructions = () => [
		{
			type: 'section',
			name: 'OLD:Vorbereitung',
			steps: ['OLD:step0', 'OLD:step1', 'OLD:step2']
		},
		{
			type: 'reference',
			name: 'Mürbeteig',
			baseRecipeRef: 'abc123',
			includeInstructions: true,
			showLabel: false,
			labelOverride: 'OLD:label',
			stepsBefore: ['OLD:before'],
			stepsAfter: ['Kühl stellen.', 'Ausrollen.']
		}
	];

	it('no changes => full _translateInstructions path', async () => {
		const r = richRecipe();
		const out = await (svc as any)._translateInstructionsPartialWithMetadata(r.instructions, [], undefined);
		expect({ out, calls }).toMatchSnapshot();
	});

	it('mixed per-step flags, reference partial, missing change entry', async () => {
		const r = richRecipe();
		r.instructions[0].steps.push('Vierter Schritt'); // no existing step
		const changes = [
			// step0 changed, step1 unchanged but existing is truthy, step2 no flag (?? true),
			// step3 no existing
			{ groupIndex: 0, changed: true, nameChanged: true, stepChanges: [true, false] },
			// ref: name unchanged; stepsBefore differs from existing => batch; stepsAfter equal => kept
			{ groupIndex: 1, changed: true, nameChanged: false }
			// group 2: no change entry
		];
		const out = await (svc as any)._translateInstructionsPartialWithMetadata(
			r.instructions,
			existingInstructions(),
			changes
		);
		expect({ out, calls }).toMatchSnapshot();
	});

	it('unchanged step whose existing translation is empty gets re-translated', async () => {
		const out = await (svc as any)._translateInstructionsPartial(
			[{ type: 'section', name: 'A', steps: ['eins', 'zwei'] }],
			[{ type: 'section', name: 'OLD:A', steps: ['', 'OLD:zwei'] }],
			[{ groupIndex: 0, changed: false, nameChanged: false, stepChanges: [false, false] }]
		);
		expect({ out, calls }).toMatchSnapshot();
	});

	it('reference with no existing group => translated whole', async () => {
		const r = richRecipe();
		const out = await (svc as any)._translateInstructionsPartial(
			[r.instructions[1]],
			[],
			[{ groupIndex: 0, changed: true }]
		);
		expect({ out, calls }).toMatchSnapshot();
	});
});

// --- singleton ------------------------------------------------------------

describe('module exports', () => {
	it('exports a singleton instance configured from $env', async () => {
		const mod = await import('../../../src/utils/translation');
		expect(mod.translationService).toBeInstanceOf(DeepLTranslationService);
		expect({
			apiKey: (mod.translationService as any).apiKey,
			apiUrl: (mod.translationService as any).apiUrl
		}).toMatchSnapshot();
	});
});

describe('constructor without env config', () => {
	it('falls back to the free API URL and warns about the missing key', async () => {
		vi.resetModules();
		vi.doMock('$env/static/private', () => ({ DEEPL_API_KEY: '', DEEPL_API_URL: '' }));
		const warn = console.warn as unknown as ReturnType<typeof vi.fn>;
		const mod = await import('../../../src/utils/translation');
		const s = new mod.DeepLTranslationService();
		expect({
			apiKey: (s as any).apiKey,
			apiUrl: (s as any).apiUrl,
			warnings: warn.mock.calls
		}).toMatchSnapshot();
		await expect(s.translateText('Hallo')).rejects.toThrow('DeepL API key not configured');
		vi.doUnmock('$env/static/private');
		vi.resetModules();
	});
});
