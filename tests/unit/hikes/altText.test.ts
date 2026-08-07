import { describe, it, expect } from 'vitest';
import {
	buildPrompt,
	cleanAltText,
	formatElapsed,
	parseBilingual,
	MAX_ALT_CHARS,
	type HikeContext,
	type ShotContext
} from '../../../scripts/hikeAltText.js';

const HIKE: HikeContext = {
	title: 'Monte Generosa',
	summary: 'Eine anspruchsvolle aber kurze Gipfelbesteigung',
	month: 'September',
	difficulty: 'T4',
	tags: ['Tessin', 'Schweiz', 'Sommer'],
	place: 'Rovio, Ticino, Schweiz'
};

describe('cleanAltText', () => {
	it('strips wrapping quotes and label prefixes', () => {
		expect(cleanAltText('"Grüne Wiese vor Nadelwald."')).toBe('Grüne Wiese vor Nadelwald.');
		expect(cleanAltText('Alt-Text: Nebel über dem Tal')).toBe('Nebel über dem Tal');
		expect(cleanAltText('Beschreibung: Felsiger Grat')).toBe('Felsiger Grat');
	});

	it('drops the "photo of" lead-in the model keeps slipping back into', () => {
		expect(cleanAltText('Bild zeigt zwei Wanderer am Grat')).toBe('Zwei Wanderer am Grat');
		expect(cleanAltText('Image showing two hikers')).toBe('Two hikers');
		// The article after the lead-in is kept — dropping it would leave German
		// in the wrong case, and it reads fine in both languages.
		expect(cleanAltText('A photo of a rocky trail')).toBe('A rocky trail');
	});

	it('spells German the Swiss way — the repo takes no sharp s', () => {
		// The prompt asks for this too, but a model trained mostly on German
		// German ignores it often enough that the deterministic pass is what
		// actually holds the line (and the pre-commit hook enforces it).
		const sharpS = String.fromCharCode(0x00df);
		expect(cleanAltText(`Wei${sharpS}e Wolken über gro${sharpS}en Felsen`)).toBe(
			'Weisse Wolken über grossen Felsen'
		);
		expect(cleanAltText(`${String.fromCharCode(0x1e9e)}TRASSE`)).toBe('SSTRASSE');
	});

	it('collapses whitespace and capitalises', () => {
		expect(cleanAltText('  grüner   hang  mit  Fels ')).toBe('Grüner hang mit Fels');
	});

	it('truncates on a word boundary, never mid-word', () => {
		const long =
			'Ein sehr langer Satz über einen Wanderweg der durch Wiesen und Wälder führt ' +
			'und einfach nicht enden will bis irgendwann doch das Ende erreicht ist';
		const out = cleanAltText(long);
		expect(out.length).toBeLessThanOrEqual(MAX_ALT_CHARS);
		expect(out.endsWith('…')).toBe(true);
		// The character before the ellipsis ends a whole word from the input.
		const lastWord = out.slice(0, -1).split(' ').pop()!;
		expect(long.split(' ')).toContain(lastWord);
	});

	it('leaves text at the limit untouched', () => {
		const exact = 'a'.repeat(MAX_ALT_CHARS);
		expect(cleanAltText(exact)).toHaveLength(MAX_ALT_CHARS);
		expect(cleanAltText(exact).endsWith('…')).toBe(false);
	});
});

describe('parseBilingual', () => {
	it('splits a well-formed two-line answer', () => {
		expect(parseBilingual('DE: Grüne Wiese\nEN: Green meadow')).toEqual({
			de: 'Grüne Wiese',
			en: 'Green meadow'
		});
	});

	it('ignores a <think> block a reasoning model emits anyway', () => {
		const raw = '<think>Let me look at the image…</think>\nDE: Nebel im Tal\nEN: Mist in the valley';
		expect(parseBilingual(raw)).toEqual({ de: 'Nebel im Tal', en: 'Mist in the valley' });
	});

	it('tolerates surrounding prose and loose label spacing', () => {
		const raw = 'Here you go:\n\n  de :  Felsiger Grat\n  EN:   Rocky ridge\n\nHope that helps!';
		expect(parseBilingual(raw)).toEqual({ de: 'Felsiger Grat', en: 'Rocky ridge' });
	});

	it('returns null when a language is missing, so nothing half-formed is stored', () => {
		expect(parseBilingual('DE: Grüne Wiese')).toBeNull();
		expect(parseBilingual('Just some text about a meadow.')).toBeNull();
	});

	// The model's most common slip: right content, right order, no labels.
	describe('unlabelled two-line answers', () => {
		it('recovers them in DE-then-EN order', () => {
			const raw =
				'Ein steiniger Pfad schlängelt sich durch grüne Hänge unter blauem Himmel.\n' +
				'A rocky path winds through green slopes under a blue sky.';
			expect(parseBilingual(raw)).toEqual({
				de: 'Ein steiniger Pfad schlängelt sich durch grüne Hänge unter blauem Himmel.',
				en: 'A rocky path winds through green slopes under a blue sky.'
			});
		});

		it('refuses a swapped pair rather than storing the languages the wrong way round', () => {
			const raw =
				'A rocky path winds through green slopes under a blue sky.\n' +
				'Ein steiniger Pfad schlängelt sich durch grüne Hänge unter blauem Himmel.';
			expect(parseBilingual(raw)).toBeNull();
		});

		it('ignores anything that is not exactly two lines', () => {
			expect(parseBilingual('Grüne Wiese unter blauem Himmel.')).toBeNull();
			expect(parseBilingual('Grüne Wiese\nGreen meadow\nExtra commentary line')).toBeNull();
		});

		it('still prefers the labels when they are present', () => {
			const raw = 'DE: Nebel im Tal\nEN: Mist in the valley';
			expect(parseBilingual(raw)).toEqual({ de: 'Nebel im Tal', en: 'Mist in the valley' });
		});
	});
});

describe('formatElapsed', () => {
	it('formats minutes, whole hours and mixed', () => {
		expect(formatElapsed(45)).toBe('45 min');
		expect(formatElapsed(120)).toBe('2 h');
		expect(formatElapsed(135)).toBe('2 h 15 min');
	});
});

describe('buildPrompt', () => {
	const shot: ShotContext = { altitudeM: 1704.6, elapsedMin: 135, distanceKm: 8.32, totalKm: 14.2 };

	it('includes the hike context and the shot situation', () => {
		const prompt = buildPrompt(HIKE, shot);
		expect(prompt).toContain('Monte Generosa');
		expect(prompt).toContain('Rovio, Ticino, Schweiz');
		expect(prompt).toContain('month September');
		expect(prompt).toContain('SAC grade T4');
		expect(prompt).toContain('1705 m above sea level');
		expect(prompt).toContain('2 h 15 min into the hike');
		expect(prompt).toContain('km 8.3 of 14.2');
	});

	it('marks the region as background so the model does not assert it saw the place', () => {
		expect(buildPrompt(HIKE, {})).toMatch(/Region \(background only[^)]*\)/);
	});

	it('asks for exactly the two labelled lines the parser expects', () => {
		const prompt = buildPrompt(HIKE, {});
		expect(prompt).toContain('DE: <German description>');
		expect(prompt).toContain('EN: <English description>');
		// Round-trip: the format the prompt demands is the one we can parse.
		expect(parseBilingual('DE: Test\nEN: Test')).not.toBeNull();
	});

	it('omits absent context rather than emitting empty labels', () => {
		const prompt = buildPrompt(
			{ title: 'Ohne Kontext', summary: '', month: '', difficulty: '', tags: [], place: '' },
			{}
		);
		expect(prompt).not.toContain('About:');
		expect(prompt).not.toContain('When:');
		expect(prompt).not.toContain('Keywords:');
		expect(prompt).not.toContain('Taken:');
		expect(prompt).not.toContain('Region');
	});

	it('caps keywords so a heavily tagged hike cannot crowd out the instructions', () => {
		const prompt = buildPrompt({ ...HIKE, tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, {});
		expect(prompt).toContain('Keywords: a, b, c, d, e');
		expect(prompt).not.toContain('f, g');
	});
});
