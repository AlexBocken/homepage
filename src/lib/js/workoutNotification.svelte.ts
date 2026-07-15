/**
 * Bridges the active lifting workout to the native Android foreground-service
 * notification (see WorkoutForegroundService.kt). Android app only — a no-op in
 * a normal browser / on non-lifting (GPS) sessions.
 *
 * Direction of truth: the JS `workout` store is authoritative. This module only
 *   - pushes a shadow of the *remaining* sets + the current rest window to native
 *     whenever they change (so the notification and the backgrounded rest beep
 *     stay correct), and
 *   - drains events the notification originated (Complete set / rest ±) back into
 *     the store, then lets the next push correct any drift.
 * Native never computes workout progression; it only walks the pushed list.
 *
 * native→JS is poll-based here (matching AndroidBridge.getPoints), so we drain on
 * visibility-resume and on a slow interval.
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { getExerciseById, getExerciseMetrics } from '$lib/data/exercises';
import type { getWorkout } from '$lib/js/workout.svelte';

type Workout = ReturnType<typeof getWorkout>;
type Lang = 'en' | 'de';

interface WorkoutBridge {
	startWorkoutService(stateJson: string): void;
	updateWorkoutState(stateJson: string): void;
	startWorkoutRest(restEndsAt: string, restTotalSecs: number): void;
	stopWorkoutRest(): void;
	stopWorkoutService(): void;
	isWorkoutServiceRunning(): boolean;
	drainWorkoutActions(): string;
	consumePendingRoute(): string;
}

type NativeEvent =
	| {
			type: 'complete';
			exerciseIdx: number;
			setIdx: number;
			weight?: number | null;
			reps?: number | null;
			restStartedAt: number;
			restTotal: number;
	  }
	| { type: 'restAdjust'; endsAt: number; total: number }
	| {
			type: 'holdStart';
			exerciseIdx: number;
			setIdx: number;
			holdStartedAt: number;
			holdTotal: number;
	  };

/** The custom JS interface is injected only inside the Android app. */
function bridge(): WorkoutBridge | null {
	if (!browser || !('__TAURI__' in window)) return null;
	const b = (window as unknown as { AndroidBridge?: Partial<WorkoutBridge> }).AndroidBridge;
	if (!b || typeof b.startWorkoutService !== 'function') return null;
	return b as WorkoutBridge;
}

/** Ordered remaining-sets shadow (head = current set) the native side renders. */
function buildStateJson(workout: Workout, lang: Lang): string {
	const sets: unknown[] = [];
	const exs = workout.exercises;
	for (let ei = 0; ei < exs.length; ei++) {
		const ex = exs[ei];
		const meta = getExerciseById(ex.exerciseId, lang);
		const metrics = getExerciseMetrics(getExerciseById(ex.exerciseId));
		const isDuration =
			metrics.includes('duration') && !metrics.includes('weight') && !metrics.includes('reps');
		for (let si = 0; si < ex.sets.length; si++) {
			const s = ex.sets[si];
			if (s.completed) continue;
			sets.push({
				exerciseIdx: ei,
				setIdx: si,
				exerciseName: meta?.localName ?? ex.exerciseId,
				setLabel: `Set ${si + 1} of ${ex.sets.length}`,
				weight: s.weight,
				reps: s.reps,
				isDuration,
				holdSecs: isDuration ? Math.round((s.duration ?? 0) * 60) : 0,
				restSecs: ex.restTime
			});
		}
	}
	return JSON.stringify({ sets });
}

function drain(b: WorkoutBridge, workout: Workout) {
	let raw: string;
	try {
		raw = b.drainWorkoutActions();
	} catch {
		return;
	}
	if (!raw || raw === '[]') return;
	let events: NativeEvent[];
	try {
		events = JSON.parse(raw);
	} catch {
		return;
	}
	for (const ev of events) {
		if (ev.type === 'complete') {
			workout.applyNativeCompletion(ev);
		} else if (ev.type === 'restAdjust') {
			workout.adoptRestTimer(
				ev.endsAt - ev.total * 1000,
				ev.total,
				workout.restExerciseIdx,
				workout.restSetIdx
			);
		} else if (ev.type === 'holdStart') {
			workout.adoptHoldTimer(ev.holdStartedAt, ev.holdTotal, ev.exerciseIdx, ev.setIdx);
		}
	}
}

function consumeRoute(b: WorkoutBridge) {
	let route: string;
	try {
		route = b.consumePendingRoute();
	} catch {
		return;
	}
	if (route && route.startsWith('/') && route !== window.location.pathname) {
		goto(route);
	}
}

/**
 * Wire the shared workout store to the native notification for the app's lifetime.
 * Call once from the root layout's onMount. Returns a cleanup (usually unused —
 * the app lives as long as the process).
 */
export function attachWorkoutNotification(workout: Workout, getLang: () => Lang): () => void {
	const b = bridge();
	if (!b) return () => {};

	// Native owns the rest-end beep so it fires while backgrounded; mute the
	// in-page Web Audio cue to avoid a double beep.
	workout.suppressRestSound = true;

	let pushTimer: ReturnType<typeof setTimeout> | null = null;
	const stopRoot = $effect.root(() => {
		// Push the remaining-sets shadow whenever it changes (debounced so rapid
		// weight/reps edits don't thrash startForegroundService).
		$effect(() => {
			const isLifting = workout.active && workout.mode !== 'gps';
			// Touch reactive deps eagerly so the effect re-runs on any set edit.
			const json = isLifting ? buildStateJson(workout, getLang()) : '';
			if (pushTimer) clearTimeout(pushTimer);
			pushTimer = setTimeout(() => {
				if (!isLifting) {
					if (b.isWorkoutServiceRunning()) b.stopWorkoutService();
					return;
				}
				if (b.isWorkoutServiceRunning()) b.updateWorkoutState(json);
				else b.startWorkoutService(json);
			}, 350);
		});

		// Push the authoritative rest window (native schedules the beep off it).
		$effect(() => {
			if (!(workout.active && workout.mode !== 'gps')) return;
			if (workout.restTimerActive && workout.restStartedAt) {
				const endsAt = workout.restStartedAt + workout.restTimerTotal * 1000;
				b.startWorkoutRest(String(endsAt), workout.restTimerTotal);
			} else {
				b.stopWorkoutRest();
			}
		});
	});

	const poll = () => {
		drain(b, workout);
		consumeRoute(b);
	};
	const onVisible = () => {
		if (document.visibilityState === 'visible') poll();
	};
	document.addEventListener('visibilitychange', onVisible);
	const interval = setInterval(poll, 3000);
	poll();

	return () => {
		if (pushTimer) clearTimeout(pushTimer);
		stopRoot();
		document.removeEventListener('visibilitychange', onVisible);
		clearInterval(interval);
		workout.suppressRestSound = false;
		if (b.isWorkoutServiceRunning()) b.stopWorkoutService();
	};
}
