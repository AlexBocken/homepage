import { describe, it, expect } from 'vitest';
import { formatMeasurementConflicts } from '$lib/fitness/measurementSave';
import { m } from '$lib/js/fitnessI18n';

// The overwrite dialog's list of conflicting values, as the check-in and body-part
// pages both wrote it before sharing this helper.
describe('formatMeasurementConflicts', () => {
	it('labels each field with its unit, and each body-part side', () => {
		const t = m.en;
		const out = formatMeasurementConflicts(
			[
				{ key: 'weight', oldVal: 80, newVal: 81.5 },
				{ key: 'bodyFatPercent', oldVal: 15, newVal: 16 },
				{ key: 'caloricIntake', oldVal: 2000, newVal: 2100 },
				{ key: 'notes', oldVal: 'a', newVal: 'b' },
				{ key: 'measurements.neck', oldVal: 38, newVal: 39 },
				{ key: 'measurements.leftBicep', oldVal: 35, newVal: 36 },
				{ key: 'measurements.rightCalf', oldVal: 38, newVal: 38.5 },
				{ key: 'measurements.rightForearm', oldVal: 29, newVal: 30 }
			],
			t
		);
		expect(out).toBe(
			[
				'Weight (80 kg → 81.5 kg)',
				`${t.body_fat_label} (15 % → 16 %)`,
				`${t.calories} (2000 kcal → 2100 kcal)`,
				'Notes (a → b)',
				'Neck (38 cm → 39 cm)',
				'L Bicep (35 cm → 36 cm)',
				'R Calf (38 cm → 38.5 cm)',
				'R Forearm (29 cm → 30 cm)'
			].join(', ')
		);
	});

	it('is empty for no conflicts', () => {
		expect(formatMeasurementConflicts([], m.en)).toBe('');
	});
});
