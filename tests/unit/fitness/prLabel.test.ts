import { describe, it, expect } from 'vitest';
import { formatPr, prTypeLongLabel, prValueLabel } from '$lib/fitness/prLabel';

// Pins the labels the workout-complete summary, the history detail and the run
// detail rendered before they shared this module.
describe('formatPr', () => {
	const cases: Array<[any, string, string]> = [
		[{ type: 'est1rm', value: 102.5 }, 'Est. 1RM', '102.5 kg'],
		[{ type: 'maxWeight', value: 100 }, 'Max Weight', '100 kg'],
		[{ type: 'bestSetVolume', value: 800 }, 'Best Set Volume', '800 kg'],
		[{ type: 'repMax', reps: 5, value: 90 }, '5-rep max', '90 kg'],
		[{ type: 'longestDistance', value: 21.1 }, 'Longest Distance', '21.1 km'],
		[{ type: 'fastestPace:1:5', value: 5.5 }, 'Fastest Pace (1–5 km)', '5:30 min/km'],
		[{ type: 'fastestPace:21:Infinity', value: 4.25 }, 'Fastest Pace (21+ km)', '4:15 min/km'],
		[{ type: 'somethingNew', value: 3 }, 'somethingNew', '3 kg']
	];
	for (const [pr, type, value] of cases) {
		it(pr.type, () => {
			expect(formatPr({ exerciseId: 'bench', ...pr })).toEqual({ exerciseId: 'bench', type, value });
			expect(prTypeLongLabel(pr)).toBe(type);
			expect(prValueLabel(pr)).toBe(value);
		});
	}
});
