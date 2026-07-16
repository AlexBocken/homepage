import { describe, it, expect } from 'vitest';
import { formatSetDuration } from '$lib/fitness/segmentFormat';
import { getExerciseById, getExerciseMetrics, isTimedMetrics } from '$lib/data/exercises';
import { bestSetLabel } from '$lib/fitness/setSummary';

describe('formatSetDuration', () => {
	// Stored unit is minutes; timed holds are entered in seconds and stored as raw/60,
	// so a 45 s plank lives in the DB as 0.75.
	it('renders a sub-minute hold in seconds', () => {
		expect(formatSetDuration(0.75)).toBe('45 s');
		expect(formatSetDuration(0.5)).toBe('30 s');
	});

	it('switches to M:SS at a minute and above', () => {
		expect(formatSetDuration(1)).toBe('1:00');
		expect(formatSetDuration(1.5)).toBe('1:30');
		expect(formatSetDuration(2)).toBe('2:00');
	});

	it('rounds to whole seconds rather than leaking float noise', () => {
		expect(formatSetDuration(0.7501)).toBe('45 s');
		expect(formatSetDuration(1 / 3)).toBe('20 s');
	});

	it('renders an em dash for missing or nonsensical values', () => {
		expect(formatSetDuration(undefined)).toBe('—');
		expect(formatSetDuration(null)).toBe('—');
		expect(formatSetDuration(0)).toBe('—');
		expect(formatSetDuration(-1)).toBe('—');
		expect(formatSetDuration(NaN)).toBe('—');
	});
});

describe('isTimedMetrics', () => {
	/** @param id exercise id */
	const metricsOf = (id: string) => getExerciseMetrics(getExerciseById(id));

	it('treats holds and stretches as timed', () => {
		for (const id of ['plank', 'calf-stretch-wall', 'butterfly-yoga-pose', 'cow-stretch']) {
			expect(isTimedMetrics(metricsOf(id)), id).toBe(true);
		}
	});

	it('treats jump rope as timed even though it also counts reps', () => {
		// Keyed on the absence of weight, not the absence of reps — jump rope logs both
		// duration and skips, and summarising it as load x reps gave "0 kg x 0".
		expect(metricsOf('jump-rope')).toContain('reps');
		expect(isTimedMetrics(metricsOf('jump-rope'))).toBe(true);
	});

	it('leaves strength work alone', () => {
		for (const id of ['bench-press-dumbbell', 'squat-barbell', 'bicep-curl-barbell']) {
			expect(isTimedMetrics(metricsOf(id)), id).toBe(false);
		}
	});

	it('leaves cardio alone so it keeps its distance summary', () => {
		for (const id of ['running', 'cycling-outdoor', 'rowing-machine']) {
			expect(metricsOf(id)).toContain('duration');
			expect(isTimedMetrics(metricsOf(id)), id).toBe(false);
		}
	});

	it('covers the stretches in the catalogue', () => {
		const stretches = ['neck-circle-stretch', 'side-push-neck-stretch', 'shoulder-stretch-behind-back',
			'elbows-back-stretch', 'back-pec-stretch', 'thoracic-bridge', 'seated-single-leg-hamstring-stretch',
			'kneeling-toe-up-hamstring-stretch', 'side-lunge-stretch', 'lying-lower-back-stretch',
			'elbow-flexor-stretch', 'seated-shoulder-flexor-stretch-bent-knee'];
		for (const id of stretches) {
			expect(isTimedMetrics(metricsOf(id)), id).toBe(true);
		}
	});
});

describe('bestSetLabel', () => {
	it('shows the longest hold as time for a stretch — the reported bug', () => {
		// Was: "0 kg × 0", because a duration-only set fell through to the strength branch.
		const sets = [{ duration: 0.5, completed: true }, { duration: 0.75, completed: true }];
		expect(bestSetLabel(sets, 'calf-stretch-wall', 'en')).toBe('45 s');
	});

	it('shows a plank hold as time', () => {
		expect(bestSetLabel([{ duration: 1.5 }], 'plank', 'en')).toBe('1:30');
	});

	it('keeps reps alongside the time for jump rope', () => {
		expect(bestSetLabel([{ duration: 2, reps: 120 }], 'jump-rope', 'en')).toBe('2:00 · 120 reps');
	});

	it('localises the reps word', () => {
		expect(bestSetLabel([{ duration: 2, reps: 120 }], 'jump-rope', 'de')).toBe('2:00 · 120 wdh');
	});

	it('appends rpe to a timed set when logged', () => {
		expect(bestSetLabel([{ duration: 1, rpe: 8 }], 'plank', 'en')).toBe('1:00 · @ 8');
	});

	it('still summarises strength work as load x reps', () => {
		const sets = [{ weight: 60, reps: 8 }, { weight: 80, reps: 5 }];
		expect(bestSetLabel(sets, 'bench-press-dumbbell', 'en')).toBe('80 kg × 5');
	});

	it('picks the heavier set, breaking ties on reps', () => {
		const sets = [{ weight: 80, reps: 5 }, { weight: 80, reps: 8 }, { weight: 70, reps: 12 }];
		expect(bestSetLabel(sets, 'squat-barbell', 'en')).toBe('80 kg × 8');
	});

	it('still summarises cardio by distance', () => {
		expect(bestSetLabel([{ distance: 5.2, duration: 28 }], 'running', 'en')).toBe('5.2 km · 28 min');
	});

	it('returns null rather than an empty line when there is nothing to show', () => {
		expect(bestSetLabel([], 'plank', 'en')).toBeNull();
		expect(bestSetLabel([{ duration: 0 }], 'plank', 'en')).toBeNull();
	});
});
