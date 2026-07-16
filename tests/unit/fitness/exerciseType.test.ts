import { describe, it, expect } from 'vitest';
import { searchAllExercises, isStretchType, exerciseTypeKey } from '$lib/data/exercisedb';

const ALL = searchAllExercises({ lang: 'en' });

describe('exerciseType coverage', () => {
	// The catalogue is 199 ExerciseDB-mapped entries plus static-only ones. The
	// static-only half used to carry no type at all, which left them with no type
	// chip and made the "Strength" filter (!isStretchType) include them by accident
	// rather than because they were classified. Every entry must be typed.
	it('every exercise has a type', () => {
		const untyped = ALL.filter(e => !e.exerciseType).map(e => e.id);
		expect(untyped).toEqual([]);
	});

	it('only uses known type values', () => {
		const known = new Set(['STRENGTH', 'CARDIO', 'PLYOMETRICS', 'YOGA', 'STRETCHING', 'WEIGHTLIFTING']);
		const unknown = ALL.filter(e => !known.has(e.exerciseType as string)).map(e => e.id);
		expect(unknown).toEqual([]);
	});
});

describe('exerciseType classification', () => {
	/** @param id exercise id */
	const typeOf = (id: string) => ALL.find(e => e.id === id)?.exerciseType;

	it('types the continuous cardio work as cardio', () => {
		for (const id of ['running', 'walking', 'swimming', 'hiking', 'elliptical', 'stair-climber']) {
			expect(typeOf(id), id).toBe('CARDIO');
		}
	});

	it('types barbell and dumbbell resistance work as strength', () => {
		for (const id of ['bench-press-dumbbell', 'squat-barbell', 'deadlift-barbell', 'bicep-curl-barbell']) {
			expect(typeOf(id), id).toBe('STRENGTH');
		}
	});

	it('types the olympic lift consistently with the ExerciseDB-sourced one', () => {
		expect(typeOf('clean-and-press-barbell')).toBe('WEIGHTLIFTING');
		expect(typeOf('dumbbell-clean-and-press')).toBe('WEIGHTLIFTING');
	});

	it('keeps our curated stretch classification, which ExerciseDB gets wrong', () => {
		expect(typeOf('calf-stretch-wall')).toBe('STRETCHING');
		expect(typeOf('butterfly-yoga-pose')).toBe('YOGA');
		expect(isStretchType(typeOf('calf-stretch-wall'))).toBe(true);
		expect(isStretchType(typeOf('butterfly-yoga-pose'))).toBe(true);
	});

	it('does not treat strength or cardio work as stretching', () => {
		expect(isStretchType(typeOf('squat-barbell'))).toBe(false);
		expect(isStretchType(typeOf('running'))).toBe(false);
	});
});

describe('exerciseTypeKey', () => {
	it('collapses the six raw types onto four display buckets', () => {
		expect(exerciseTypeKey('STRETCHING')).toBe('stretch');
		expect(exerciseTypeKey('YOGA')).toBe('stretch');
		expect(exerciseTypeKey('STRENGTH')).toBe('strength');
		expect(exerciseTypeKey('WEIGHTLIFTING')).toBe('strength');
		expect(exerciseTypeKey('CARDIO')).toBe('cardio');
		expect(exerciseTypeKey('PLYOMETRICS')).toBe('plyo');
	});

	it('returns null rather than guessing for absent or unknown types', () => {
		expect(exerciseTypeKey(undefined)).toBeNull();
		expect(exerciseTypeKey(null)).toBeNull();
		expect(exerciseTypeKey('MOBILITY')).toBeNull();
	});

	it('gives every catalogue entry a display bucket', () => {
		expect(ALL.filter(e => !exerciseTypeKey(e.exerciseType)).map(e => e.id)).toEqual([]);
	});
});

// ExerciseChips drops the body-part and target chips when they merely restate the
// cardio category, so assault-bike-run reads "Cardio · machine · quadriceps" and
// running reads "Cardio · Body weight". These lock the data assumptions behind that.
describe('cardio chip redundancy', () => {
	it('every bodyPart=cardio entry has a type chip to carry the meaning', () => {
		const orphans = ALL.filter(e => e.bodyPart === 'cardio' && !exerciseTypeKey(e.exerciseType));
		expect(orphans.map(e => e.id)).toEqual([]);
	});

	it('every cardiovascular-system target belongs to a cardio-typed exercise', () => {
		const odd = ALL.filter(e => e.target === 'cardiovascular system' && exerciseTypeKey(e.exerciseType) !== 'cardio');
		expect(odd.map(e => e.id)).toEqual([]);
	});

	it('keeps a real muscle target on cardio machines that have one', () => {
		const bike = ALL.find(e => e.id === 'assault-bike-run');
		expect(bike?.exerciseType).toBe('CARDIO');
		expect(bike?.target).toBe('quadriceps');
	});

	it('no exercise restates its body part as its target', () => {
		expect(ALL.filter(e => e.target === e.bodyPart).map(e => e.id)).toEqual([]);
	});

	it('the localised labels do not match the type label in German', () => {
		// Guards the fix itself: a display-string comparison would look correct in
		// English and still double up here, which is why the rules key off the raw
		// `bodyPart` / `target` fields.
		const de = searchAllExercises({ lang: 'de' });
		const bike = de.find(e => e.id === 'assault-bike-run');
		expect(bike?.bodyPart).toBe('cardio');
		expect(bike?.localBodyPart).toBe('Ausdauer');

		const run = de.find(e => e.id === 'running');
		expect(run?.target).toBe('cardiovascular system');
		expect(run?.localTarget).toBe('Herz-Kreislauf-System');
	});
});
