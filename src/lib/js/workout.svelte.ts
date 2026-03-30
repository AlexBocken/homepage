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
	distance: number | null;
	duration: number | null;
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
		sets: Array<{ reps?: number; weight?: number; rpe?: number; distance?: number; duration?: number }>;
		restTime?: number;
	}>;
}

const STORAGE_KEY = 'fitness-active-workout';

export type WorkoutMode = 'manual' | 'gps';
export type GpsActivityType = 'running' | 'walking' | 'cycling' | 'hiking';

export interface StoredState {
	active: boolean;
	paused: boolean;
	mode: WorkoutMode;
	activityType: GpsActivityType | null;
	name: string;
	templateId: string | null;
	intervalTemplateId: string | null;
	exercises: WorkoutExercise[];
	elapsed: number; // total elapsed seconds at time of save
	savedAt: number; // Date.now() at time of save
	restStartedAt: number | null; // Date.now() when rest timer started
	restTotal: number; // total rest duration in seconds
	restExerciseIdx: number; // which exercise the rest timer belongs to
	restSetIdx: number; // which set the rest timer belongs to
}

export interface RemoteState {
	name: string;
	mode: WorkoutMode;
	activityType: GpsActivityType | null;
	templateId: string | null;
	intervalTemplateId: string | null;
	exercises: WorkoutExercise[];
	paused: boolean;
	elapsed: number;
	savedAt: number;
	restStartedAt: number | null;
	restTotal: number;
	restExerciseIdx: number;
	restSetIdx: number;
}

function createEmptySet(): WorkoutSet {
	return { reps: null, weight: null, rpe: null, distance: null, duration: null, completed: false };
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
	let mode = $state<WorkoutMode>('manual');
	let activityType = $state<GpsActivityType | null>(null);
	let name = $state('');
	let templateId: string | null = $state(null);
	let intervalTemplateId: string | null = $state(null);
	let exercises = $state<WorkoutExercise[]>([]);
	let startTime: Date | null = $state(null);
	let _pausedElapsed = $state(0); // seconds accumulated before current run
	let _elapsed = $state(0);
	let _restSeconds = $state(0);
	let _restTotal = $state(0);
	let _restActive = $state(false);
	let _restStartedAt: number | null = null; // absolute timestamp
	let _restExerciseIdx = $state(-1);
	let _restSetIdx = $state(-1);

	let _timerInterval: ReturnType<typeof setInterval> | null = null;
	let _restInterval: ReturnType<typeof setInterval> | null = null;
	let _onChangeCallback: (() => void) | null = null;

	function _persist() {
		if (!active) return;
		// When running, compute current elapsed before saving
		if (!paused && startTime) {
			_elapsed = _pausedElapsed + Math.floor((Date.now() - startTime.getTime()) / 1000);
		}
		saveToStorage({
			active,
			paused,
			mode,
			activityType,
			name,
			templateId,
			intervalTemplateId,
			exercises: JSON.parse(JSON.stringify(exercises)),
			elapsed: _elapsed,
			savedAt: Date.now(),
			restStartedAt: _restActive ? _restStartedAt : null,
			restTotal: _restTotal,
			restExerciseIdx: _restActive ? _restExerciseIdx : -1,
			restSetIdx: _restActive ? _restSetIdx : -1
		});
		_onChangeCallback?.();
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

	function _computeRestSeconds() {
		if (!_restActive || !_restStartedAt) return;
		const elapsed = Math.floor((Date.now() - _restStartedAt) / 1000);
		_restSeconds = Math.max(0, _restTotal - elapsed);
		if (_restSeconds <= 0) {
			_stopRestTimer();
			_persist();
		}
	}

	function _startRestInterval() {
		if (_restInterval) clearInterval(_restInterval);
		_restInterval = setInterval(() => _computeRestSeconds(), 1000);
	}

	function _stopRestTimer() {
		if (_restInterval) {
			clearInterval(_restInterval);
			_restInterval = null;
		}
		_restActive = false;
		_restSeconds = 0;
		_restTotal = 0;
		_restStartedAt = null;
		_restExerciseIdx = -1;
		_restSetIdx = -1;
	}

	// Restore from localStorage on creation
	function restore() {
		const stored = loadFromStorage();
		if (!stored || !stored.active) return;

		active = true;
		paused = stored.paused;
		mode = stored.mode ?? 'manual';
		activityType = stored.activityType ?? null;
		name = stored.name;
		templateId = stored.templateId;
		intervalTemplateId = stored.intervalTemplateId ?? null;
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

		// Restore rest timer if it was active
		if (stored.restStartedAt && stored.restTotal > 0) {
			const elapsed = Math.floor((Date.now() - stored.restStartedAt) / 1000);
			const remaining = stored.restTotal - elapsed;
			if (remaining > 0) {
				_restStartedAt = stored.restStartedAt;
				_restTotal = stored.restTotal;
				_restSeconds = remaining;
				_restActive = true;
				_restExerciseIdx = stored.restExerciseIdx ?? -1;
				_restSetIdx = stored.restSetIdx ?? -1;
				_startRestInterval();
			}
		}
	}

	function startFromTemplate(template: TemplateData) {
		name = template.name;
		templateId = template._id;
		intervalTemplateId = null;
		mode = 'manual';
		exercises = template.exercises.map((e) => ({
			exerciseId: e.exerciseId,
			sets: e.sets.length > 0
				? e.sets.map((s) => ({
						reps: s.reps ?? null,
						weight: s.weight ?? null,
						rpe: s.rpe ?? null,
						distance: s.distance ?? null,
						duration: s.duration ?? null,
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
		intervalTemplateId = null;
		mode = 'manual';
		exercises = [];
		startTime = new Date();
		_pausedElapsed = 0;
		_elapsed = 0;
		paused = false;
		active = true;
		_startTimer();
		_persist();
	}

	function startGpsWorkout(activity: GpsActivityType = 'running') {
		const labels: Record<GpsActivityType, string> = {
			running: 'Running',
			walking: 'Walking',
			cycling: 'Cycling',
			hiking: 'Hiking'
		};
		name = labels[activity];
		templateId = null;
		intervalTemplateId = null;
		mode = 'gps';
		activityType = activity;
		exercises = [];
		startTime = null;
		_pausedElapsed = 0;
		_elapsed = 0;
		paused = true;
		active = true;
		_persist();
	}

	function startFromGpsTemplate(template: { _id: string; name: string; activityType?: string; intervalTemplateId?: string }) {
		name = template.name;
		templateId = template._id;
		intervalTemplateId = template.intervalTemplateId ?? null;
		mode = 'gps';
		activityType = (template.activityType as GpsActivityType) ?? 'running';
		exercises = [];
		startTime = null;
		_pausedElapsed = 0;
		_elapsed = 0;
		paused = true;
		active = true;
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

	function moveExercise(index: number, direction: number) {
		const newIndex = index + direction;
		if (newIndex < 0 || newIndex >= exercises.length) return;
		const [item] = exercises.splice(index, 1);
		exercises.splice(newIndex, 0, item);
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

	function startRestTimer(seconds: number, exerciseIdx: number = -1, setIdx: number = -1) {
		_stopRestTimer();
		_restStartedAt = Date.now();
		_restSeconds = seconds;
		_restTotal = seconds;
		_restActive = true;
		_restExerciseIdx = exerciseIdx;
		_restSetIdx = setIdx;
		_startRestInterval();
		_persist();
	}

	function cancelRestTimer() {
		_stopRestTimer();
		_persist();
	}

	function adjustRestTimer(delta: number) {
		if (!_restActive) return;
		_restTotal = Math.max(1, _restTotal + delta);
		// Recompute remaining from the absolute timestamp
		_computeRestSeconds();
		if (_restSeconds <= 0) {
			_stopRestTimer();
		}
		_persist();
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
			mode,
			activityType,
			exercises: exercises
				.filter((e) => e.sets.some((s) => s.completed))
				.map((e) => ({
					exerciseId: e.exerciseId,
					name: getExerciseById(e.exerciseId)?.name ?? e.exerciseId,
					sets: e.sets
						.filter((s) => s.completed)
						.map((s) => ({
							reps: s.reps ?? undefined,
							weight: s.weight ?? undefined,
							rpe: s.rpe ?? undefined,
							distance: s.distance ?? undefined,
							duration: s.duration ?? undefined,
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
		mode = 'manual';
		activityType = null;
		name = '';
		templateId = null;
		intervalTemplateId = null;
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

	/** Apply state from another device (merge strategy: incoming wins) */
	function applyRemoteState(remote: RemoteState) {
		name = remote.name;
		mode = remote.mode ?? 'manual';
		activityType = remote.activityType ?? null;
		templateId = remote.templateId;
		intervalTemplateId = remote.intervalTemplateId ?? null;
		exercises = remote.exercises;

		if (remote.paused) {
			_stopTimer();
			paused = true;
			_pausedElapsed = remote.elapsed;
			_elapsed = remote.elapsed;
			startTime = null;
		} else {
			paused = false;
			// Account for time elapsed since the remote saved
			const secondsSinceSave = Math.floor((Date.now() - remote.savedAt) / 1000);
			const totalElapsed = remote.elapsed + secondsSinceSave;
			_pausedElapsed = totalElapsed;
			_elapsed = totalElapsed;
			startTime = new Date();
			_startTimer();
		}

		// Apply rest timer state — skip if already running with same parameters
		const restChanged = remote.restStartedAt !== _restStartedAt || remote.restTotal !== _restTotal;
		if (restChanged) {
			_stopRestTimer();
			if (remote.restStartedAt && remote.restTotal > 0) {
				const elapsed = Math.floor((Date.now() - remote.restStartedAt) / 1000);
				const remaining = remote.restTotal - elapsed;
				if (remaining > 0) {
					_restStartedAt = remote.restStartedAt;
					_restTotal = remote.restTotal;
					_restSeconds = remaining;
					_restActive = true;
					_restExerciseIdx = remote.restExerciseIdx ?? -1;
					_restSetIdx = remote.restSetIdx ?? -1;
					_startRestInterval();
				}
			}
		}

		// Persist locally but don't trigger onChange (to avoid re-push loop)
		saveToStorage({
			active: true,
			paused,
			mode,
			activityType,
			name,
			templateId,
			intervalTemplateId,
			exercises: JSON.parse(JSON.stringify(exercises)),
			elapsed: _elapsed,
			savedAt: Date.now(),
			restStartedAt: _restActive ? _restStartedAt : null,
			restTotal: _restTotal,
			restExerciseIdx: _restActive ? _restExerciseIdx : -1,
			restSetIdx: _restActive ? _restSetIdx : -1
		});
	}

	/** Restore a workout from server when local has no active workout */
	function restoreFromRemote(remote: RemoteState) {
		active = true;
		applyRemoteState(remote);
	}

	/** Register callback for state changes (used by sync layer) */
	function onChange(cb: () => void) {
		_onChangeCallback = cb;
	}

	return {
		get active() { return active; },
		get paused() { return paused; },
		get mode() { return mode; },
		get activityType() { return activityType; },
		get name() { return name; },
		set name(v: string) { name = v; _persist(); },
		get templateId() { return templateId; },
		get intervalTemplateId() { return intervalTemplateId; },
		get exercises() { return exercises; },
		get startTime() { return startTime; },
		get elapsedSeconds() { return _elapsed; },
		get restTimerSeconds() { return _restSeconds; },
		get restTimerTotal() { return _restTotal; },
		get restTimerActive() { return _restActive; },
		get restStartedAt() { return _restStartedAt; },
		get restExerciseIdx() { return _restExerciseIdx; },
		get restSetIdx() { return _restSetIdx; },
		restore,
		startFromTemplate,
		startEmpty,
		startGpsWorkout,
		startFromGpsTemplate,
		pauseTimer,
		resumeTimer,
		addExercise,
		removeExercise,
		moveExercise,
		addSet,
		removeSet,
		updateSet,
		toggleSetComplete,
		startRestTimer,
		cancelRestTimer,
		adjustRestTimer,
		finish,
		cancel,
		applyRemoteState,
		restoreFromRemote,
		onChange
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
