type CardioCategory = 'running' | 'swimming' | 'cycling' | 'hiking' | 'rowing';

interface PaceRange {
	min: number;
	max: number;
}

const CATEGORY_MAP: Record<string, CardioCategory> = {
	'running': 'running',
	'walking': 'hiking',
	'hiking': 'hiking',
	'cycling-outdoor': 'cycling',
	'cycling-indoor': 'cycling',
	'swimming': 'swimming',
	'rowing-machine': 'rowing',
	'rowing-outdoor': 'rowing',
	'elliptical': 'running',
	'stair-climber': 'running',
};

const PACE_RANGES: Record<CardioCategory, PaceRange[]> = {
	running: [
		{ min: 0, max: 3 },
		{ min: 3, max: 7 },
		{ min: 7, max: 21.1 },
		{ min: 21.1, max: 42.2 },
		{ min: 42.2, max: Infinity },
	],
	swimming: [
		{ min: 0, max: 0.4 },
		{ min: 0.4, max: 1.5 },
		{ min: 1.5, max: 5 },
		{ min: 5, max: 10 },
		{ min: 10, max: Infinity },
	],
	cycling: [
		{ min: 0, max: 15 },
		{ min: 15, max: 40 },
		{ min: 40, max: 100 },
		{ min: 100, max: 200 },
		{ min: 200, max: Infinity },
	],
	hiking: [
		{ min: 0, max: 5 },
		{ min: 5, max: 15 },
		{ min: 15, max: 30 },
		{ min: 30, max: 50 },
		{ min: 50, max: Infinity },
	],
	rowing: [
		{ min: 0, max: 2 },
		{ min: 2, max: 5 },
		{ min: 5, max: 10 },
		{ min: 10, max: 21.1 },
		{ min: 21.1, max: Infinity },
	],
};

export function getCardioCategory(exerciseId: string): CardioCategory | undefined {
	return CATEGORY_MAP[exerciseId];
}

export function getPaceRanges(exerciseId: string): PaceRange[] {
	const cat = CATEGORY_MAP[exerciseId];
	return cat ? PACE_RANGES[cat] : PACE_RANGES.running;
}

interface SetData {
	distance?: number;
	duration?: number;
	completed: boolean;
}

interface ExerciseData {
	exerciseId: string;
	sets: SetData[];
}

interface SessionData {
	exercises: ExerciseData[];
}

interface CardioPr {
	exerciseId: string;
	type: string;
	value: number;
}

export function detectCardioPrs(
	exerciseId: string,
	currentSets: SetData[],
	previousSessions: SessionData[]
): CardioPr[] {
	const ranges = getPaceRanges(exerciseId);
	const prs: CardioPr[] = [];

	let bestDistance = 0;
	const bestPaces = new Map<string, number>();

	for (const s of currentSets) {
		if (!s.completed || !s.distance || s.distance <= 0) continue;
		if (s.distance > bestDistance) bestDistance = s.distance;

		if (s.duration && s.duration > 0) {
			const pace = s.duration / s.distance;
			const range = ranges.find(r => s.distance! >= r.min && s.distance! < r.max);
			if (range) {
				const key = `${range.min}:${range.max}`;
				const cur = bestPaces.get(key);
				if (!cur || pace < cur) bestPaces.set(key, pace);
			}
		}
	}

	let prevBestDistance = 0;
	const prevBestPaces = new Map<string, number>();

	for (const ps of previousSessions) {
		const pe = ps.exercises.find(e => e.exerciseId === exerciseId);
		if (!pe) continue;
		for (const s of pe.sets) {
			if (!s.completed || !s.distance || s.distance <= 0) continue;
			if (s.distance > prevBestDistance) prevBestDistance = s.distance;

			if (s.duration && s.duration > 0) {
				const pace = s.duration / s.distance;
				const range = ranges.find(r => s.distance! >= r.min && s.distance! < r.max);
				if (range) {
					const key = `${range.min}:${range.max}`;
					const cur = prevBestPaces.get(key);
					if (!cur || pace < cur) prevBestPaces.set(key, pace);
				}
			}
		}
	}

	if (bestDistance > prevBestDistance && prevBestDistance > 0) {
		prs.push({ exerciseId, type: 'longestDistance', value: Math.round(bestDistance * 100) / 100 });
	}

	for (const [key, pace] of bestPaces) {
		const prevPace = prevBestPaces.get(key);
		if (prevPace && pace < prevPace) {
			prs.push({ exerciseId, type: `fastestPace:${key}`, value: Math.round(pace * 100) / 100 });
		}
	}

	return prs;
}

export function formatPaceRangeLabel(type: string): string {
	const match = type.match(/^fastestPace:(.+):(.+)$/);
	if (!match) return type;
	const [, minStr, maxStr] = match;
	const max = parseFloat(maxStr);
	if (!isFinite(max)) return `${minStr}+ km`;
	return `${minStr}–${maxStr} km`;
}

export function formatPaceValue(minPerKm: number): string {
	const mins = Math.floor(minPerKm);
	const secs = Math.round((minPerKm - mins) * 60);
	return `${mins}:${secs.toString().padStart(2, '0')} min/km`;
}
