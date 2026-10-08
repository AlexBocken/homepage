import { describe, it, expect } from 'vitest';
import { cleanIngredientLine, englishHead } from '$lib/js/pantryNames';
import { matchRecipes, compareMatches, type PantryIndex } from '$lib/js/pantryMatch';
import { buildPantryIndex, type PantrySource } from '$lib/server/pantryVocabulary';

const de = (raw: string) => cleanIngredientLine(raw, 'de');

describe('cleanIngredientLine', () => {
	it('drops what comes after the comma and the modifier words', () => {
		expect(de('Butter, weich').keys).toEqual(['butter']);
		expect(de('Zwiebel, mittelgross').keys).toEqual(['zwiebel']);
		expect(de('Milch, lauwarm').keys).toEqual(['milch']);
		expect(de('heisses Wasser').keys).toEqual(['wasser']);
	});

	it('reads the fruit out of zest and juice phrases', () => {
		expect(de('Schale einer Zitrone').keys).toEqual(['zitrone']);
		expect(de('Saft von 2 Orangen').keys).toEqual(['orangen']);
		expect(cleanIngredientLine('Juice of one lemon', 'en').keys).toEqual(['lemon']);
	});

	it('turns alternatives into keys, either of which will do', () => {
		expect(de('Buttermilch (alternativ: Milch)').keys).toEqual(['buttermilch', 'milch']);
		expect(de('Fritieröl oder Schmalz').keys).toEqual(['fritieröl', 'schmalz']);
	});

	it('strips amounts, percentages and purposes left in the name', () => {
		expect(de('90 g Zucker').keys).toEqual(['zucker']);
		expect(de('70% Schokolade').keys).toEqual(['schokolade']);
		expect(de('Wasser zum Bedecken').keys).toEqual(['wasser']);
	});

	it('marks optional lines', () => {
		expect(de('Chilliflocken (optional)').optional).toBe(true);
		expect(de('Petersilie zum Garnieren').optional).toBe(true);
		expect(de('Petersilie').optional).toBe(false);
	});

	it('keeps a recipe link as a reference and its text as the key', () => {
		const line = de('<a href=sauerteigansatz>Sauerteigansatz</a>');
		expect(line.ref).toBe('sauerteigansatz');
		expect(line.keys).toEqual(['sauerteigansatz']);
	});

	it('drops prose that ended up in the ingredient list', () => {
		expect(de('Ein Motiv. Für das Osterlammmotiv von oben: diese SVG ausdrucken').keys).toEqual([]);
	});
});

describe('englishHead', () => {
	it('takes the last word, singular', () => {
		expect(englishHead('white flour')).toBe('flour');
		expect(englishHead('cherries')).toBe('cherry');
		expect(englishHead('tomatoes')).toBe('tomato');
		expect(englishHead('glass')).toBe('glass');
	});
});

/** A recipe whose German and English lines are given side by side. */
function recipe(short_name: string, lines: [string, string][], over: Partial<PantrySource> = {}): PantrySource {
	return {
		_id: `id-${short_name}`,
		short_name,
		ingredients: [{ type: 'section', name: '', list: lines.map(([name]) => ({ name })) }],
		translations: { en: { ingredients: [{ type: 'section', name: '', list: lines.map(([, name]) => ({ name })) }] } },
		...over,
	};
}

describe('buildPantryIndex', () => {
	const docs = [
		recipe('zopf', [['Weissmehl', 'White flour'], ['Frischhefe', 'Fresh yeast'], ['Eier', 'Eggs']]),
		recipe('brot', [['Ruchmehl', 'Ruch flour'], ['Mehl', 'Flour'], ['Ei', 'Egg']]),
		recipe('kuchen', [['Kirschen', 'Cherries'], ['Kirsch', 'Kirsch'], ['Dotter', 'Egg yolk']]),
		recipe('suppe', [['Knoblauch', 'Garlic'], ['Lauch', 'Leek'], ['Zwiebeln', 'Onions'], ['Zwiebel', 'Onion']]),
		recipe('limo', [['Zitronensaft', 'Lemon juice'], ['Zitrone', 'Lemon'], ['Kokosnussmilch', 'Coconut milk'], ['Milch', 'Milk']]),
	];
	const index = buildPantryIndex(docs);
	const keys = index.items.map((i) => i.key);
	const covers = (have: string) => index.covers[have] ?? [];

	it('folds plurals whose translations agree, and only those', () => {
		expect(keys).toContain('ei');
		expect(keys).not.toContain('eier');
		expect(keys).toContain('zwiebel');
		expect(keys).not.toContain('zwiebeln');
		expect(keys).toContain('kirschen');
		expect(keys).toContain('kirsch');
	});

	it('lets a specific item cover the generic one when the translations agree', () => {
		expect(covers('ruchmehl')).toContain('mehl');
		expect(covers('weissmehl')).toContain('mehl');
		expect(covers('mehl')).not.toContain('ruchmehl');
		expect(covers('knoblauch')).not.toContain('lauch');
	});

	it('applies the hand-written corrections', () => {
		expect(covers('kokosnussmilch')).not.toContain('milch');
		expect(covers('ei')).toContain('dotter');
		// Only between ingredients the recipes actually use: no Trockenhefe here.
		expect(covers('frischhefe')).not.toContain('trockenhefe');
	});

	it('lets the fruit cover its juice', () => {
		expect(covers('zitrone')).toContain('zitronensaft');
	});

	it('labels in both languages', () => {
		const flour = index.items.find((i) => i.key === 'weissmehl')!;
		expect(flour.de).toBe('Weissmehl');
		expect(flour.en).toBe('White flour');
	});

	it('skips a line that repeats another section, and optional lines', () => {
		const pizza = recipe('pizza', []);
		pizza.ingredients = [
			{ type: 'section', name: 'Teig', list: [{ name: 'Mehl' }] },
			{ type: 'section', name: 'Belag', list: [{ name: 'Teig' }, { name: 'Basilikum (optional)' }, { name: 'Tomaten' }] },
		];
		pizza.translations = undefined;
		const needs = buildPantryIndex([pizza]).recipes[0].needs.map((n) => n.any);
		expect(needs).toEqual([['mehl'], ['tomaten']]);
	});

	it('resolves links and reference sections to recipe ids', () => {
		const starter = recipe('sauerteigansatz', [['Roggenmehl', 'Rye flour']]);
		const bread = recipe('roggenbrot', [['<a href=sauerteigansatz>Sauerteigansatz</a>', 'Sourdough starter']]);
		bread.ingredients!.push({ type: 'reference', baseRecipeRef: 'id-zopf', includeIngredients: true });
		const built = buildPantryIndex([starter, bread, docs[0]]);
		const r = built.recipes.find((x) => x.id === 'id-roggenbrot')!;
		expect(r.needs[0]).toEqual({ any: ['sauerteigansatz'], ref: 'id-sauerteigansatz' });
		expect(r.bases).toEqual(['id-zopf']);
	});
});

describe('matchRecipes', () => {
	const index: Pick<PantryIndex, 'covers' | 'recipes'> = {
		covers: { ruchmehl: ['mehl'], ei: ['dotter'] },
		recipes: [
			{ id: 'brot', needs: [{ any: ['mehl'] }, { any: ['salz'] }], bases: [] },
			{ id: 'zopf', needs: [{ any: ['mehl'] }, { any: ['butter', 'margarine'] }, { any: ['dotter'] }], bases: [] },
			{ id: 'starter', needs: [{ any: ['roggenmehl'] }], bases: [] },
			{ id: 'roggenbrot', needs: [{ any: ['sauerteigansatz'], ref: 'starter' }, { any: ['salz'] }], bases: [] },
			{ id: 'pizza', needs: [{ any: ['tomate'] }], bases: ['brot'] },
		],
	};
	const run = (have: string[], mine: string[] = have) => matchRecipes(index, have, mine);

	it('lets the specific item satisfy the generic line, and alternatives count', () => {
		const m = run(['ruchmehl', 'salz', 'margarine', 'ei']);
		expect(m.get('brot')!.missing).toEqual([]);
		expect(m.get('zopf')!.missing).toEqual([]);
	});

	it('names what is missing', () => {
		expect(run(['ruchmehl']).get('zopf')!.missing).toEqual(['butter', 'dotter']);
	});

	it('counts a linked recipe you can make as had', () => {
		expect(run(['salz']).get('roggenbrot')!.missing).toEqual(['sauerteigansatz']);
		expect(run(['salz', 'roggenmehl']).get('roggenbrot')!.missing).toEqual([]);
		expect(run(['salz', 'sauerteigansatz']).get('roggenbrot')!.missing).toEqual([]);
	});

	it('includes the base recipe’s ingredients', () => {
		expect(run(['tomate']).get('pizza')!.missing).toEqual(['mehl', 'salz']);
		expect(run(['tomate', 'mehl', 'salz']).get('pizza')!.missing).toEqual([]);
	});

	it('ranks by how much of your own selection a recipe uses', () => {
		const m = run(['ruchmehl', 'salz', 'butter', 'ei'], ['butter', 'ei']);
		const ranked = [m.get('brot')!, m.get('zopf')!].sort(compareMatches);
		expect(ranked[0].id).toBe('zopf');
		expect(m.get('brot')!.used).toBe(0);
	});
});
