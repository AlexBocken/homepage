/**
 * Combinatorial solver for "Round Off This Day" suggestions.
 * Finds optimal 1-3 food combinations from a curated pantry list
 * that best fill the remaining macro budget.
 */

export interface RemainingBudget {
	kcal: number;
	protein: number;
	fat: number;
	carbs: number;
}

export interface ResolvedFood {
	source: string;
	id: string;
	name: string;
	nameEn: string;
	per100g: { calories: number; protein: number; fat: number; carbs: number };
	group?: string;
}

export interface ComboItem {
	source: string;
	id: string;
	name: string;
	nameEn: string;
	grams: number;
	atServing: { calories: number; protein: number; fat: number; carbs: number };
}

export interface ComboSuggestion {
	items: ComboItem[];
	total: { calories: number; protein: number; fat: number; carbs: number };
	delta: { calories: number; protein: number; fat: number; carbs: number };
	score: number;   // weighted L1 delta — lower is better
	fitPercent: number; // 0-100, how well this fills the remaining budget
	tierLabel: string;
}

const MIN_GRAMS = 20;
const MAX_GRAMS = 500;

// Macro weights for scoring: fat weighted 2x (9 kcal/g vs 4)
const W_KCAL = 1;
const W_P = 1;
const W_F = 2;
const W_C = 1;

/**
 * For a single food, find optimal grams to match remaining budget.
 * Uses weighted least squares (scalar case).
 */
function solveOne(food: ResolvedFood, rem: RemainingBudget): number | null {
	const p = food.per100g;
	if (p.calories <= 5) return null;

	// Weighted least squares: min sum(w_i * (g/100 * p_i - rem_i)^2)
	// Derivative = 0: g/100 = sum(w_i * p_i * rem_i) / sum(w_i * p_i^2)
	const num = W_KCAL * p.calories * rem.kcal
		+ W_P * p.protein * rem.protein
		+ W_F * p.fat * rem.fat * W_F
		+ W_C * p.carbs * rem.carbs;
	const den = W_KCAL * p.calories ** 2
		+ W_P * p.protein ** 2
		+ W_F ** 2 * p.fat ** 2
		+ W_C * p.carbs ** 2;

	if (den <= 0) return null;
	const hectograms = num / den;
	const grams = hectograms * 100;

	if (grams < MIN_GRAMS || grams > MAX_GRAMS) return null;
	return Math.round(grams);
}

/**
 * For 2 foods, solve 2x2 weighted least squares.
 */
function solveTwo(foods: [ResolvedFood, ResolvedFood], rem: RemainingBudget): [number, number] | null {
	const [f1, f2] = foods;
	const p1 = f1.per100g, p2 = f2.per100g;

	// Build normal equations: (A^T W^2 A) x = A^T W^2 b
	// where A is 4x2, W is diagonal weights, b is remaining budget
	const w = [W_KCAL, W_P, W_F * W_F, W_C]; // W^2 for fat
	const a = [
		[p1.calories, p2.calories],
		[p1.protein, p2.protein],
		[p1.fat, p2.fat],
		[p1.carbs, p2.carbs],
	];
	const b = [rem.kcal, rem.protein, rem.fat, rem.carbs];

	// A^T W^2 A (2x2)
	let m00 = 0, m01 = 0, m11 = 0;
	let r0 = 0, r1 = 0;
	for (let i = 0; i < 4; i++) {
		const wi = w[i];
		m00 += wi * a[i][0] * a[i][0];
		m01 += wi * a[i][0] * a[i][1];
		m11 += wi * a[i][1] * a[i][1];
		r0 += wi * a[i][0] * b[i];
		r1 += wi * a[i][1] * b[i];
	}

	const det = m00 * m11 - m01 * m01;
	if (Math.abs(det) < 1e-10) return null;

	const x0 = (m11 * r0 - m01 * r1) / det * 100;
	const x1 = (m00 * r1 - m01 * r0) / det * 100;

	if (x0 < MIN_GRAMS || x0 > MAX_GRAMS || x1 < MIN_GRAMS || x1 > MAX_GRAMS) return null;
	return [Math.round(x0), Math.round(x1)];
}

/**
 * For 3 foods, solve 3x3 weighted least squares.
 */
function solveThree(foods: [ResolvedFood, ResolvedFood, ResolvedFood], rem: RemainingBudget): [number, number, number] | null {
	const [f1, f2, f3] = foods;
	const p = [f1.per100g, f2.per100g, f3.per100g];

	const w = [W_KCAL, W_P, W_F * W_F, W_C];
	const a = [
		[p[0].calories, p[1].calories, p[2].calories],
		[p[0].protein, p[1].protein, p[2].protein],
		[p[0].fat, p[1].fat, p[2].fat],
		[p[0].carbs, p[1].carbs, p[2].carbs],
	];
	const b = [rem.kcal, rem.protein, rem.fat, rem.carbs];

	// Build 3x3 normal equations: M x = r
	const M = Array.from({ length: 3 }, () => new Float64Array(3));
	const r = new Float64Array(3);
	for (let i = 0; i < 4; i++) {
		const wi = w[i];
		for (let j = 0; j < 3; j++) {
			for (let k = 0; k < 3; k++) {
				M[j][k] += wi * a[i][j] * a[i][k];
			}
			r[j] += wi * a[i][j] * b[i];
		}
	}

	// Solve by Cramer's rule (3x3)
	const det3 = (m: Float64Array[] | number[][]) =>
		m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
		- m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
		+ m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

	const D = det3(M);
	if (Math.abs(D) < 1e-10) return null;

	const results: number[] = [];
	for (let col = 0; col < 3; col++) {
		const Mc = M.map(row => Float64Array.from(row));
		for (let row = 0; row < 3; row++) Mc[row][col] = r[row];
		results.push(det3(Mc) / D * 100);
	}

	for (const g of results) {
		if (g < MIN_GRAMS || g > MAX_GRAMS) return null;
	}
	return [Math.round(results[0]), Math.round(results[1]), Math.round(results[2])];
}

function macrosAtGrams(food: ResolvedFood, grams: number) {
	const f = grams / 100;
	return {
		calories: food.per100g.calories * f,
		protein: food.per100g.protein * f,
		fat: food.per100g.fat * f,
		carbs: food.per100g.carbs * f,
	};
}

function sumMacros(...servings: { calories: number; protein: number; fat: number; carbs: number }[]) {
	const r = { calories: 0, protein: 0, fat: 0, carbs: 0 };
	for (const s of servings) {
		r.calories += s.calories;
		r.protein += s.protein;
		r.fat += s.fat;
		r.carbs += s.carbs;
	}
	return r;
}

function scoreDelta(total: { calories: number; protein: number; fat: number; carbs: number }, rem: RemainingBudget): number {
	return Math.abs(total.calories - rem.kcal) * W_KCAL
		+ Math.abs(total.protein - rem.protein) * W_P
		+ Math.abs(total.fat - rem.fat) * W_F
		+ Math.abs(total.carbs - rem.carbs) * W_C;
}

function makeComboItem(food: ResolvedFood, grams: number): ComboItem {
	return {
		source: food.source,
		id: food.id,
		name: food.name,
		nameEn: food.nameEn,
		grams,
		atServing: macrosAtGrams(food, grams),
	};
}

// fitPercent is computed relative to the worst result in each batch — see findBestCombos

function makeCombo(items: ComboItem[], rem: RemainingBudget, tierLabel: string): ComboSuggestion {
	const total = sumMacros(...items.map(i => i.atServing));
	const delta = {
		calories: rem.kcal - total.calories,
		protein: rem.protein - total.protein,
		fat: rem.fat - total.fat,
		carbs: rem.carbs - total.carbs,
	};
	return {
		items,
		total,
		delta,
		score: scoreDelta(total, rem),
		fitPercent: 0, // filled in by findBestCombos
		tierLabel,
	};
}

/**
 * Search all combinations of foods (up to maxComboSize) for best macro fit.
 * @param maxComboSize - max foods per combo (1 = singles only, 3 = up to triples)
 */
export function findBestCombos(
	foods: ResolvedFood[],
	remaining: RemainingBudget,
	tierLabel: string,
	limit: number = 20,
	maxComboSize: number = 3,
): ComboSuggestion[] {
	const results: ComboSuggestion[] = [];
	const n = foods.length;

	// Singles
	for (let i = 0; i < n; i++) {
		const g = solveOne(foods[i], remaining);
		if (g === null) continue;
		results.push(makeCombo([makeComboItem(foods[i], g)], remaining, tierLabel));
	}

	// Pairs
	if (maxComboSize >= 2) {
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				const sol = solveTwo([foods[i], foods[j]], remaining);
				if (!sol) continue;
				results.push(makeCombo([
					makeComboItem(foods[i], sol[0]),
					makeComboItem(foods[j], sol[1]),
				], remaining, tierLabel));
			}
		}
	}

	// Triples
	if (maxComboSize >= 3) {
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				for (let k = j + 1; k < n; k++) {
					const sol = solveThree([foods[i], foods[j], foods[k]], remaining);
					if (!sol) continue;
					results.push(makeCombo([
						makeComboItem(foods[i], sol[0]),
						makeComboItem(foods[j], sol[1]),
						makeComboItem(foods[k], sol[2]),
					], remaining, tierLabel));
				}
			}
		}
	}

	// Sort by score (lower = better fit)
	results.sort((a, b) => a.score - b.score);
	const top = results.slice(0, limit);

	// Compute fitPercent: best = 100%, worst in returned set = 0%
	if (top.length > 0) {
		const bestScore = top[0].score;
		const worstScore = top[top.length - 1].score;
		const range = worstScore - bestScore;
		for (const r of top) {
			r.fitPercent = range > 0
				? Math.round((1 - (r.score - bestScore) / range) * 100)
				: 100;
		}
	}

	return top;
}
