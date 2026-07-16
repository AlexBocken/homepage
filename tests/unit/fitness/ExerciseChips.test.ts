import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ExerciseChips from '$lib/components/fitness/ExerciseChips.svelte';
import { searchAllExercises } from '$lib/data/exercisedb';

/** The chip labels currently rendered, in order. */
function chips(): string[] {
	return screen.getAllByText(/.+/, { selector: '.tag' }).map(el => el.textContent?.trim() ?? '');
}

/** @param id exercise id */
function exercise(id: string) {
	const e = searchAllExercises({ lang: 'en' }).find(x => x.id === id);
	if (!e) throw new Error(`fixture exercise missing: ${id}`);
	return e;
}

describe('ExerciseChips', () => {
	it('gives an ordinary strength exercise a full chip set', () => {
		render(ExerciseChips, { exercise: exercise('bench-press-dumbbell'), lang: 'en', showTarget: true });
		expect(chips()).toEqual(['Strength', 'chest', 'dumbbell', 'pectorals']);
	});

	it('no longer doubles up cardio on a machine — the reported bug', () => {
		// Was: Cardio · cardio · machine · quadriceps
		render(ExerciseChips, { exercise: exercise('assault-bike-run'), lang: 'en', showTarget: true });
		const c = chips();
		expect(c).toEqual(['Cardio', 'machine', 'quadriceps']);
		expect(c.filter(x => x.toLowerCase() === 'cardio')).toHaveLength(1);
	});

	it('drops the cardiovascular-system target rather than restating the category', () => {
		render(ExerciseChips, { exercise: exercise('running'), lang: 'en', showTarget: true });
		expect(chips()).toEqual(['Cardio', 'body weight']);
	});

	it('shows the stretch type where the old inline badge used to be', () => {
		render(ExerciseChips, { exercise: exercise('calf-stretch-wall'), lang: 'en', showTarget: true });
		expect(chips()[0]).toBe('Stretch');
	});

	it('types the exercises that previously had no type chip at all', () => {
		// These 55 static-only entries rendered three chips instead of four before.
		for (const id of ['squat-barbell', 'deadlift-barbell', 'ab-wheel-rollout']) {
			const { unmount } = render(ExerciseChips, { exercise: exercise(id), lang: 'en', showTarget: true });
			expect(chips()[0], id).toBe('Strength');
			unmount();
		}
	});

	it('omits the target chip when not asked for', () => {
		render(ExerciseChips, { exercise: exercise('bench-press-dumbbell'), lang: 'en' });
		expect(chips()).toEqual(['Strength', 'chest', 'dumbbell']);
	});

	it('renders nothing rather than empty pills for a missing exercise', () => {
		const { container } = render(ExerciseChips, { exercise: null, lang: 'en' });
		expect(container.querySelectorAll('.tag')).toHaveLength(0);
	});
});

describe('ExerciseChips (German)', () => {
	/** @param id exercise id */
	function deExercise(id: string) {
		const e = searchAllExercises({ lang: 'de' }).find(x => x.id === id);
		if (!e) throw new Error(`fixture exercise missing: ${id}`);
		return e;
	}

	it('dedupes on the raw field, not the label, so German loses the duplicate too', () => {
		render(ExerciseChips, { exercise: deExercise('assault-bike-run'), lang: 'de', showTarget: true });
		const c = chips();
		// "Ausdauer" (the German bodyPart label) must not appear beside the Cardio pill.
		expect(c).not.toContain('Ausdauer');
		expect(c[0]).toBe('Cardio');
	});

	it('drops the German cardiovascular-system target too', () => {
		render(ExerciseChips, { exercise: deExercise('running'), lang: 'de', showTarget: true });
		expect(chips()).not.toContain('Herz-Kreislauf-System');
	});

	it('translates the type pill', () => {
		render(ExerciseChips, { exercise: deExercise('calf-stretch-wall'), lang: 'de', showTarget: true });
		expect(chips()[0]).toBe('Dehnung');
	});
});
