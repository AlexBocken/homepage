/**
 * Level promotion/demotion and daily-set selection. Pure functions over plain
 * attempt records so the server (which owns progress) and tests share them.
 */

import { shiftDay } from '../localDate';
import { type Rng, newSeed } from './rng';
import { MAX_LEVEL, SKILLS, SKILL_BY_ID } from './skills';

export type AttemptLite = { skill: string; level: number; correct: boolean; ms: number; at: number };

export const PROMOTE_WINDOW = 10;
export const PROMOTE_ACCURACY = 0.9;
export const DEMOTE_WINDOW = 6;
export const DEMOTE_ACCURACY = 0.6;

export function median(xs: number[]): number {
	if (!xs.length) return 0;
	const s = [...xs].sort((a, b) => a - b);
	const mid = s.length >> 1;
	return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * The level a skill should sit at after these attempts. Only attempts at the
 * current level made since it was set count, so a demotion isn't immediately
 * undone by the old streak that got you promoted in the first place.
 *
 * Promote: the last 10 are ≥ 90% right with a median time within target.
 * Demote: the last 6 are under 60% right.
 */
export function nextLevel(skillId: string, level: number, since: number, attempts: AttemptLite[]): number {
	const skill = SKILL_BY_ID[skillId];
	if (!skill) return level;
	const atLevel = attempts
		.filter((a) => a.skill === skillId && a.level === level && a.at >= since)
		.sort((a, b) => a.at - b.at);

	const lastP = atLevel.slice(-PROMOTE_WINDOW);
	if (level < MAX_LEVEL && lastP.length >= PROMOTE_WINDOW) {
		const acc = lastP.filter((a) => a.correct).length / lastP.length;
		const med = median(lastP.map((a) => a.ms));
		if (acc >= PROMOTE_ACCURACY && med <= skill.targetMs(level)) return level + 1;
	}
	const lastD = atLevel.slice(-DEMOTE_WINDOW);
	if (level > 1 && lastD.length >= DEMOTE_WINDOW) {
		const acc = lastD.filter((a) => a.correct).length / lastD.length;
		if (acc < DEMOTE_ACCURACY) return level - 1;
	}
	return level;
}

export type SkillState = {
	level: number;
	/** Accuracy over recent attempts (any level), or null if never practiced. */
	accuracy: number | null;
	/** Median time ÷ target at the current level; >1 means slow. */
	speed: number | null;
	/** Epoch ms of the last attempt, or null. */
	lastSeen: number | null;
};

export type PlannedQuestion = { skill: string; level: number; seed: number };

export const DAILY_SIZE = 20;
const MAX_PER_SKILL = 3;
const STRETCH_CHANCE = 0.2;
const DAY = 86_400_000;

/**
 * How much a skill deserves practice today: weak, slow and stale skills weigh
 * more; never-practiced ones get a solid default so they're introduced early.
 */
export function skillWeight(state: SkillState | undefined, now: number): number {
	if (!state || state.accuracy === null) return 3;
	const weakness = 3 * (1 - state.accuracy);
	const slowness = state.speed ? Math.min(2, Math.max(0, state.speed - 1)) : 0;
	const staleness = state.lastSeen ? Math.min(2, (now - state.lastSeen) / (7 * DAY)) : 2;
	return 0.5 + weakness + slowness + staleness;
}

/**
 * Pick today's questions: weighted sampling without letting one skill take over,
 * with ~20% stretch questions one level up. Every category appears at least once.
 */
export function buildDailySet(
	states: Record<string, SkillState>,
	rng: Rng,
	now = Date.now(),
	size = DAILY_SIZE,
	seed: () => number = newSeed
): PlannedQuestion[] {
	const counts: Record<string, number> = {};
	const chosen: string[] = [];

	const take = (pool: string[]) => {
		const open = pool.filter((id) => (counts[id] ?? 0) < MAX_PER_SKILL);
		if (!open.length) return;
		const weights = open.map((id) => skillWeight(states[id], now));
		let r = rng() * weights.reduce((a, b) => a + b, 0);
		let i = 0;
		while (i < open.length - 1 && r >= weights[i]) r -= weights[i++];
		counts[open[i]] = (counts[open[i]] ?? 0) + 1;
		chosen.push(open[i]);
	};

	for (const cat of ['core', 'case', 'estimate'] as const) {
		take(SKILLS.filter((s) => s.category === cat).map((s) => s.id));
	}
	const all = SKILLS.map((s) => s.id);
	while (chosen.length < size && chosen.length < all.length * MAX_PER_SKILL) take(all);

	// Shuffle so the category openers aren't always first.
	for (let i = chosen.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[chosen[i], chosen[j]] = [chosen[j], chosen[i]];
	}

	return chosen.map((id) => {
		const base = states[id]?.level ?? 1;
		const level = base < MAX_LEVEL && rng() < STRETCH_CHANCE ? base + 1 : base;
		return { skill: id, level, seed: seed() };
	});
}


/**
 * Consecutive days with a finished daily set, ending today — or yesterday, so
 * the streak doesn't read 0 in the morning before today's set is done.
 */
export function streak(dailyDates: Iterable<string>, today: string): number {
	const done = new Set(dailyDates);
	let day = done.has(today) ? today : shiftDay(today, -1);
	let n = 0;
	while (done.has(day)) {
		n++;
		day = shiftDay(day, -1);
	}
	return n;
}

/** Monday of the week a YYYY-MM-DD falls in. */
export function weekOf(day: string): string {
	const dow = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
	return shiftDay(day, -dow);
}
