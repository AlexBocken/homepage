/**
 * Exercise-type helpers with no data behind them. Split out of `exercisedb.ts`
 * so a component that only wants to know "is this a stretch?" does not drag
 * the whole ExerciseDB JSON into the client bundle.
 */
import type { ExerciseType } from './exercises';

/** True if exercise is a stretch or yoga-style flexibility pose */
export function isStretchType(t: ExerciseType | string | null | undefined): boolean {
	return t === 'STRETCHING' || t === 'YOGA';
}

export type ExerciseTypeKey = 'stretch' | 'strength' | 'cardio' | 'plyo';

/**
 * Collapse the six catalogue types into the four the UI talks about.
 * `null` for a missing type: the chip row leaves a gap rather than guessing.
 */
export function exerciseTypeKey(t: ExerciseType | string | null | undefined): ExerciseTypeKey | null {
	switch (t) {
		case 'STRETCHING':
		case 'YOGA':
			return 'stretch';
		case 'STRENGTH':
		case 'WEIGHTLIFTING':
			return 'strength';
		case 'CARDIO':
			return 'cardio';
		case 'PLYOMETRICS':
			return 'plyo';
		default:
			return null;
	}
}
