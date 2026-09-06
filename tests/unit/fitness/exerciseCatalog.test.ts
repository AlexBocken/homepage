import { describe, it, expect } from 'vitest';
import { catalogParams, catalogQueryFromParams } from '../../../src/lib/fitness/exerciseCatalog';
import { catalogFilters, exerciseNames, searchCatalog, toSummary } from '../../../src/lib/server/exerciseCatalog';
import { getEnrichedExerciseById } from '../../../src/lib/data/exercisedb';

describe('catalog query encoding', () => {
	it('round-trips through URL parameters in a stable order', () => {
		const q = { q: 'squat', type: 'non-stretch' as const, equipment: ['dumbbell', 'barbell'], muscles: ['quads'] };
		const params = catalogParams(q, 'de');
		expect(params.toString()).toBe('q=squat&type=non-stretch&eq=barbell&eq=dumbbell&muscle=quads&lang=de');
		const back = catalogQueryFromParams(params);
		expect(back.q).toBe('squat');
		expect(back.type).toBe('non-stretch');
		expect(back.equipment).toEqual(['barbell', 'dumbbell']);
		expect(back.muscles).toEqual(['quads']);
	});

	it('treats an unknown type as all and drops an empty search', () => {
		const back = catalogQueryFromParams(new URLSearchParams('type=bogus&q='));
		expect(back.type).toBe('all');
		expect(catalogParams({ q: '  ', type: 'all' }, 'en').toString()).toBe('lang=en');
	});
});

describe('server catalogue', () => {
	it('projects results to the slim summary', () => {
		const all = searchCatalog({}, 'en');
		expect(all.length).toBeGreaterThan(100);
		const first = all[0];
		expect(Object.keys(first).sort()).toEqual(
			['bodyPart', 'equipment', 'exerciseType', 'id', 'localBodyPart', 'localEquipment', 'localName', 'localTarget', 'name', 'target']
				.filter((k) => k !== 'exerciseType' || 'exerciseType' in first)
				.sort()
		);
		expect(first).not.toHaveProperty('overview');
		expect(first).not.toHaveProperty('tips');
	});

	it('keeps the strength tab free of cardio and the cardio tab to cardio', () => {
		expect(searchCatalog({ type: 'non-stretch' }, 'en').some((e) => e.bodyPart === 'cardio')).toBe(false);
		const cardio = searchCatalog({ type: 'cardio' }, 'en');
		expect(cardio.length).toBeGreaterThan(0);
		expect(cardio.every((e) => e.bodyPart === 'cardio')).toBe(true);
	});

	it('localises names in German', () => {
		const en = searchCatalog({ q: 'squat' }, 'en');
		const de = searchCatalog({ q: 'squat' }, 'de');
		expect(en.length).toBeGreaterThan(0);
		expect(de.length).toBeGreaterThan(0);
		const sample = getEnrichedExerciseById(en[0].id, 'de');
		expect(sample).toBeDefined();
		expect(toSummary(sample!).localName).toBe(sample!.localName);
	});

	it('lists filter options and resolves names for known ids only', () => {
		const f = catalogFilters();
		expect(f.bodyParts.length).toBeGreaterThan(0);
		expect(f.equipment.length).toBeGreaterThan(0);
		const id = searchCatalog({}, 'en')[0].id;
		const names = exerciseNames([id, 'not-an-exercise'], 'en');
		expect(names[id]).toBeTruthy();
		expect(names).not.toHaveProperty('not-an-exercise');
	});
});
