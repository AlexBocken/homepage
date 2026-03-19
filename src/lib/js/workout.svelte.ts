/**
 * Active workout state store — factory pattern.
 * Client-side only; persisted to localStorage so state survives navigation.
 * Saved to server on finish via POST /api/fitness/sessions.
 */

import { getExerciseById } from '$lib/data/exercises';

export interface WorkoutSet {
	reps: number | null;
	weight: number | null;
	rpe: number | null;
	completed: boolean;
}

export interface WorkoutExercise {
	exerciseId: string;
	sets: WorkoutSet[];
	restTime: number; // seconds
}

export interface TemplateData {
	_id: string;
	name: string;
	exercises: Array<{
		exerciseId: string;
		sets: Array<{ reps?: number; weight?: number; rpe?: number }>;
		restTime?: number;
	}>;
}

const STORAGE_KEY = 'fitness-active-workout';

interface StoredState {
	active: boolean;
	paused: boolean;
	name: string;
	templateId: string | null;
	exercises: WorkoutExercise[];
	elapsed: number; // total elapsed seconds at time of save
	savedAt: number; // Date.now() at time of save
}

function createEmptySet(): WorkoutSet {
	return { reps: null, weight: null, rpe: null, completed: false };
}

function saveToStorage(state: StoredState) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {}
}

function loadFromStorage(): StoredState | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function clearStorage() {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {}
}

export function createWorkout() {
	let active = $state(false);
	let paused = $state(false);
	let name = $state('');
	let templateId: string | null = $state(null);
	let exercises = $state<WorkoutExercise[]>([]);
	let startTime: Date | null = $state(null);
	let _pausedElapsed = $state(0); // seconds accumulated before current run
	let _elapsed = $state(0);
	let _restSeconds = $state(0);
	let _restTotal = $state(0);
	let _restActive = $state(false);

	let _timerInterval: ReturnType<typeof setInterval> | null = null;
	let _restInterval: ReturnType<typeof setInterval> | null = null;

	function _persist() {
		if (!active) return;
		// When running, compute current elapsed before saving
		if (!paused && startTime) {
			_elapsed = _pausedElapsed + Math.floor((Date.now() - startTime.getTime()) / 1000);
		}
		saveToStorage({
			active,
			paused,
			name,
			templateId,
			exercises: JSON.parse(JSON.stringify(exercises)),
			elapsed: _elapsed,
			savedAt: Date.now()
		});
	}

	function _computeElapsed() {
		if (paused || !startTime) return;
		_elapsed = _pausedElapsed + Math.floor((Date.now() - startTime.getTime()) / 1000);
	}

	function _startTimer() {
		_stopTimer();
		_timerInterval = setInterval(() => {
			_computeElapsed();
		}, 1000);
	}

	function _stopTimer() {
		if (_timerInterval) {
			clearInterval(_timerInterval);
			_timerInterval = null;
		}
	}

	function _stopRestTimer() {
		if (_restInterval) {
			clearInterval(_restInterval);
			_restInterval = null;
		}
		_restActive = false;
		_restSeconds = 0;
		_restTotal = 0;
	}

	// Restore from localStorage on creation
	function restore() {
		const stored = loadFromStorage();
		if (!stored || !stored.active) return;

		active = true;
		paused = stored.paused;
		name = stored.name;
		templateId = stored.templateId;
		exercises = stored.exercises;

		if (stored.paused) {
			// Was paused: elapsed is exactly what was saved
			_pausedElapsed = stored.elapsed;
			_elapsed = stored.elapsed;
			startTime = null;
		} else {
			// Was running: add the time that passed since we last saved
			const secondsSinceSave = Math.floor((Date.now() - stored.savedAt) / 1000);
			const totalElapsed = stored.elapsed + secondsSinceSave;
			_pausedElapsed = totalElapsed;
			_elapsed = totalElapsed;
			startTime = new Date(); // start counting from now
			_startTimer();
		}
	}

	function startFromTemplate(template: TemplateData) {
		name = template.name;
		templateId = template._id;
		exercises = template.exercises.map((e) => ({
			exerciseId: e.exerciseId,
			sets: e.sets.length > 0
				? e.sets.map((s) => ({
						reps: s.reps ?? null,
						weight: s.weight ?? null,
						rpe: s.rpe ?? null,
						completed: false
					}))
				: [createEmptySet()],
			restTime: e.restTime ?? 120
		}));
		startTime = new Date();
		_pausedElapsed = 0;
		_elapsed = 0;
		paused = false;
		active = true;
		_startTimer();
		_persist();
	}

	function startEmpty() {
		name = 'Quick Workout';
		templateId = null;
		exercises = [];
		startTime = new Date();
		_pausedElapsed = 0;
		_elapsed = 0;
		paused = false;
		active = true;
		_startTimer();
		_persist();
	}

	function pauseTimer() {
		if (!active || paused) return;
		_computeElapsed();
		_pausedElapsed = _elapsed;
		paused = true;
		startTime = null;
		_stopTimer();
		_persist();
	}

	function resumeTimer() {
		if (!active || !paused) return;
		paused = false;
		startTime = new Date();
		_startTimer();
		_persist();
	}

	function addExercise(exerciseId: string) {
		exercises.push({
			exerciseId,
			sets: [createEmptySet()],
			restTime: 120
		});
		_persist();
	}

	function removeExercise(index: number) {
		exercises.splice(index, 1);
		_persist();
	}

	function addSet(exerciseIndex: number) {
		const ex = exercises[exerciseIndex];
		if (ex) {
			ex.sets.push(createEmptySet());
			_persist();
		}
	}

	function removeSet(exerciseIndex: number, setIndex: number) {
		const ex = exercises[exerciseIndex];
		if (ex && ex.sets.length > 1) {
			ex.sets.splice(setIndex, 1);
			_persist();
		}
	}

	function updateSet(exerciseIndex: number, setIndex: number, data: Partial<WorkoutSet>) {
		const ex = exercises[exerciseIndex];
		if (ex?.sets[setIndex]) {
			Object.assign(ex.sets[setIndex], data);
			_persist();
		}
	}

	function toggleSetComplete(exerciseIndex: number, setIndex: number) {
		const ex = exercises[exerciseIndex];
		if (ex?.sets[setIndex]) {
			const wasCompleted = ex.sets[setIndex].completed;
			ex.sets[setIndex].completed = !wasCompleted;

			if (wasCompleted) {
				// Unticked — cancel rest timer
				_stopRestTimer();
			}

			_persist();
		}
	}

	function startRestTimer(seconds: number) {
		_stopRestTimer();
		_restSeconds = seconds;
		_restTotal = seconds;
		_restActive = true;
		_restInterval = setInterval(() => {
			_restSeconds--;
			if (_restSeconds <= 0) {
				_stopRestTimer();
			}
		}, 1000);
	}

	function cancelRestTimer() {
		_stopRestTimer();
	}

	function finish() {
		_stopTimer();
		_stopRestTimer();

		const endTime = new Date();
		_computeElapsed();

		const sessionData = {
			templateId,
			templateName: templateId ? name : undefined,
			name,
			exercises: exercises
				.filter((e) => e.sets.some((s) => s.completed))
				.map((e) => ({
					exerciseId: e.exerciseId,
					name: getExerciseById(e.exerciseId)?.name ?? e.exerciseId,
					sets: e.sets
						.filter((s) => s.completed)
						.map((s) => ({
							reps: s.reps ?? 0,
							weight: s.weight ?? 0,
							rpe: s.rpe ?? undefined,
							completed: true
						}))
				})),
			startTime: _getOriginalStartTime()?.toISOString() ?? new Date().toISOString(),
			endTime: endTime.toISOString()
		};

		_reset();
		return sessionData;
	}

	function _getOriginalStartTime(): Date | null {
		// Compute original start from elapsed
		if (_elapsed > 0) {
			return new Date(Date.now() - _elapsed * 1000);
		}
		return startTime;
	}

	function _reset() {
		active = false;
		paused = false;
		name = '';
		templateId = null;
		exercises = [];
		startTime = null;
		_pausedElapsed = 0;
		_elapsed = 0;
		clearStorage();
	}

	function cancel() {
		_stopTimer();
		_stopRestTimer();
		_reset();
	}

	return {
		get active() { return active; },
		get paused() { return paused; },
		get name() { return name; },
		set name(v: string) { name = v; _persist(); },
		get templateId() { return templateId; },
		get exercises() { return exercises; },
		get startTime() { return startTime; },
		get elapsedSeconds() { return _elapsed; },
		get restTimerSeconds() { return _restSeconds; },
		get restTimerTotal() { return _restTotal; },
		get restTimerActive() { return _restActive; },
		restore,
		startFromTemplate,
		startEmpty,
		pauseTimer,
		resumeTimer,
		addExercise,
		removeExercise,
		addSet,
		removeSet,
		updateSet,
		toggleSetComplete,
		startRestTimer,
		cancelRestTimer,
		finish,
		cancel
	};
}

/** Shared singleton — use this instead of createWorkout() in components */
let _instance: ReturnType<typeof createWorkout> | null = null;

export function getWorkout() {
	if (!_instance) {
		_instance = createWorkout();
	}
	return _instance;
}
