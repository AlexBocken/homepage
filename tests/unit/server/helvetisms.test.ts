import { describe, it, expect } from 'vitest';
import { toSwissGerman, germanSynonyms, collapseSlashVariants } from '$lib/data/helvetisms';
import { BLS_DB } from '$lib/data/blsDb';
import namesDe from '$lib/data/nutritionNamesDe.json';

describe('toSwissGerman', () => {
	it('fixes the orthography', () => {
		expect(toSwissGerman('Gerste Grieß')).toBe('Gerste Griess'); // ß-ok
		expect(toSwissGerman('Sojasoße')).toBe('Sojasauce'); // ß-ok
		expect(toSwissGerman('Schwein Filetmedaillon, gegrillt')).toBe(
			'Schwein Filetmedaillon, grilliert'
		);
	});

	it('replaces the vocabulary, inside compounds too', () => {
		expect(toSwissGerman('Zucchini roh')).toBe('Zucchetti roh');
		expect(toSwissGerman('Hähnchen Brustfilet')).toBe('Poulet Brustfilet');
		expect(toSwissGerman('Hähnchenschenkel')).toBe('Pouletschenkel');
		expect(toSwissGerman('Schlagsahne mind. 36 % Fett')).toBe('Schlagrahm mind. 36 % Fett');
		expect(toSwissGerman('Karottensuppe')).toBe('Rüeblisuppe');
		expect(toSwissGerman('Putenbrust')).toBe('Trutenbrust');
		expect(toSwissGerman('Rindfleischbrühe')).toBe('Rindfleischbouillon');
		expect(toSwissGerman('Gemüsepaprika grün, roh')).toBe('Peperoni grün, roh');
	});

	it('capitalises correctly whichever side of the seam the term sits on', () => {
		// Regressions: "Rahmdickmilch" and "Vollkorneierkuchen" kept their German half
		// when the table only matched a capitalised term.
		expect(toSwissGerman('Sahnedickmilch')).toBe('Rahmsauermilch');
		expect(toSwissGerman('Vollkorneierkuchen')).toBe('Vollkornomelette');
		expect(toSwissGerman('Putenragout mit saurer Sahne')).toBe('Trutenragout mit Sauerrahm');
	});

	it('collapses a doublet whose halves became the same word', () => {
		expect(toSwissGerman('Karotte/Möhre, roh')).toBe('Rüebli, roh');
		expect(toSwissGerman('Porree/Lauch, roh')).toBe('Lauch, roh');
		expect(toSwissGerman('Dickmilch/Sauermilch, mind. 3,5 % Fett')).toBe(
			'Sauermilch, mind. 3,5 % Fett'
		);
	});

	it('drops the German half of a curated doublet', () => {
		expect(toSwissGerman('Garnele/Granat/Krabbe, roh')).toBe('Crevette, roh');
		expect(toSwissGerman('Kekse/Plätzchen (Vollkornmürbeteig)')).toBe(
			'Biscuits (Vollkornmürbeteig)'
		);
		expect(toSwissGerman('Fleischkäse einfach, fein/Original Bayerischer Leberkäse fein')).toBe(
			'Fleischkäse einfach, fein'
		);
	});

	// The guards are the whole reason this is a table and not a sed script.
	describe('leaves the sense alone', () => {
		it('keeps Pfannkuchen where it means the doughnut', () => {
			expect(toSwissGerman('Berliner/Pfannkuchen/Krapfen (Hefeteig) frittiert')).toBe(
				'Berliner/Krapfen (Hefeteig) frittiert'
			);
			expect(toSwissGerman('Ausgezogene Nudeln/Knienudeln (Hefeteig) frittiert')).toBe(
				'Ausgezogene Nudeln/Knienudeln (Hefeteig) frittiert'
			);
		});

		it('keeps Marmelade in its legal citrus sense', () => {
			expect(toSwissGerman('Marmelade (hergestellt aus Zitrusfrüchten)')).toBe(
				'Marmelade (hergestellt aus Zitrusfrüchten)'
			);
			expect(toSwissGerman('Marmelade, Orange')).toBe('Konfitüre, Orange');
		});

		it('never turns anything into the sausage or the hot pod', () => {
			// German Peperoni is Peperoncini here, and USDA's Peperoni is a sausage.
			expect(toSwissGerman('Truthahn-Peperoni, in Scheiben')).toContain('Peperoni');
			expect(toSwissGerman('Paprikapulver edelsüss')).toBe('Paprikapulver edelsüss');
		});

		it('keeps cut names and dish names that merely look German', () => {
			expect(toSwissGerman('Schaf Hinterhaxe, mager, roh')).toBe('Schaf Hinterhaxe, mager, roh');
			expect(toSwissGerman('Glasnudeln aus Mungbohnenstärke')).toBe(
				'Glasnudeln aus Mungbohnenstärke'
			);
			expect(toSwissGerman('Semmelknödel gekocht')).toBe('Semmelknödel gekocht');
			expect(toSwissGerman('Brühwurst')).toBe('Brühwurst');
			expect(toSwissGerman('Rosenkohl roh')).toBe('Rosenkohl roh');
			expect(toSwissGerman('Kohlrabi roh')).toBe('Kohlrabi roh');
		});
	});

	it('is idempotent', () => {
		for (const name of ['Karotte/Möhre, roh', 'Sahnedickmilch', 'Hähnchen ganz, gegrillt']) {
			const once = toSwissGerman(name);
			expect(toSwissGerman(once)).toBe(once);
		}
	});
});

describe('collapseSlashVariants', () => {
	it('drops repeats regardless of trailing punctuation and case', () => {
		expect(collapseSlashVariants('Rüebli/Rüebli, roh')).toBe('Rüebli, roh');
		expect(collapseSlashVariants('Bouillon/bouillon/Suppe')).toBe('Bouillon/Suppe');
	});

	it('keeps genuinely different alternatives', () => {
		expect(collapseSlashVariants('Kartoffelpuffer/Reibekuchen')).toBe(
			'Kartoffelpuffer/Reibekuchen'
		);
	});
});

describe('germanSynonyms', () => {
	it('offers the German wording a search might still use', () => {
		expect(germanSynonyms('Rüeblisuppe')).toContain('karotte');
		expect(germanSynonyms('Rüeblisuppe')).toContain('möhre');
		expect(germanSynonyms('Zucchetti roh')).toContain('zucchini');
		expect(germanSynonyms('Pouletbrust')).toContain('hähnchen');
	});

	it('is empty when nothing was helvetised, so the index skips the entry', () => {
		expect(germanSynonyms('Apfel roh')).toBe('');
	});
});

describe('the shipped food tables', () => {
	it('are already normalised — no reichsdeutsch left to rewrite', () => {
		const stale = BLS_DB.filter((e) => toSwissGerman(e.nameDe) !== e.nameDe).map((e) => e.nameDe);
		expect(stale).toEqual([]);
	});

	it('carry no eszett', () => {
		const withEszett = BLS_DB.filter((e) => e.nameDe.includes('ß')).map((e) => e.nameDe); // ß-ok
		expect(withEszett).toEqual([]);
		const usda = Object.values(namesDe as Record<string, string>).filter((n) => n.includes('ß')); // ß-ok
		expect(usda).toEqual([]);
	});

	it('translate the USDA table into the same Swiss forms', () => {
		const stale = Object.values(namesDe as Record<string, string>).filter(
			(n) => toSwissGerman(n) !== n
		);
		expect(stale).toEqual([]);
	});
});
