/**
 * Workout sync layer — bridges local workout state with the server
 * for multi-device real-time synchronization via SSE.
 *
 * Usage: call `createWorkoutSync()` once from the fitness layout.
 * It wraps the existing workout singleton and keeps it in sync.
 */

import { getWorkout } from '$lib/js/workout.svelte';
import type { WorkoutExercise, WorkoutMode, GpsActivityType } from '$lib/js/workout.svelte';

type SyncStatus = 'idle' | 'synced' | 'syncing' | 'offline' | 'conflict';

interface ServerWorkout {
  version: number;
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
  holdStartedAt: number | null;
  holdTotal: number;
  holdExerciseIdx: number;
  holdSetIdx: number;
}

export function createWorkoutSync() {
  const workout = getWorkout();

  let status: SyncStatus = $state('idle');
  let serverVersion = $state(0);
  let lastFinishedSession: any = $state(null);
  let eventSource: EventSource | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = 1000;
  let _applying = false; // guard against re-entrant syncs
  let _localFinishing = false; // true between a local finish/cancel and its own 'finished' echo
  let _hasConnected = false; // true once the SSE stream has opened at least once
  let _onlineHandler: (() => void) | null = null;

  const VERSION_KEY = 'workout_sync_version';

  function loadPersistedVersion(): number {
    try {
      const raw = localStorage.getItem(VERSION_KEY);
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }

  /** Set the tracked server version. Persisted to localStorage (unless persist=false)
   *  so a full page reload can still tell "we were synced to a server workout" apart
   *  from "we started this workout offline". The former must END locally when the
   *  server workout is gone (it finished on another device); the latter must be PUSHED. */
  function setServerVersion(v: number, persist = true) {
    serverVersion = v;
    if (!persist) return;
    try {
      if (v > 0) localStorage.setItem(VERSION_KEY, String(v));
      else localStorage.removeItem(VERSION_KEY);
    } catch {}
  }

  /** Did we know about a live server-side workout — in memory (open tab) or
   *  persisted across a reload? */
  function wasSynced(): boolean {
    return serverVersion > 0 || loadPersistedVersion() > 0;
  }

  function getWorkoutSnapshot(): ServerWorkout {
    // Compute current elapsed for an accurate snapshot
    let elapsed = workout.elapsedSeconds;
    return {
      version: serverVersion,
      name: workout.name,
      mode: workout.mode,
      activityType: workout.activityType,
      templateId: workout.templateId,
      intervalTemplateId: workout.intervalTemplateId,
      exercises: JSON.parse(JSON.stringify(workout.exercises)),
      paused: workout.paused,
      elapsed,
      savedAt: Date.now(),
      restStartedAt: workout.restStartedAt,
      restTotal: workout.restTimerTotal,
      restExerciseIdx: workout.restExerciseIdx,
      restSetIdx: workout.restSetIdx,
      holdStartedAt: workout.holdStartedAt,
      holdTotal: workout.holdTimerTotal,
      holdExerciseIdx: workout.holdExerciseIdx,
      holdSetIdx: workout.holdSetIdx
    };
  }

  async function pushToServer() {
    if (!workout.active || _applying) return;

    status = 'syncing';
    const snapshot = getWorkoutSnapshot();

    try {
      const res = await fetch('/api/fitness/workout/active', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...snapshot,
          expectedVersion: serverVersion || undefined
        })
      });

      if (res.ok) {
        const { workout: doc } = await res.json();
        setServerVersion(doc.version); // reconcile with actual server version
        status = 'synced';
        reconnectDelay = 1000; // reset backoff on success
      } else if (res.status === 409) {
        // Conflict — server has a newer version
        const { workout: serverDoc } = await res.json();
        status = 'conflict';
        applyServerState(serverDoc);
        // Retry push with merged state
        await pushToServer();
      } else if (res.status === 401) {
        status = 'offline';
      } else {
        status = 'offline';
      }
    } catch {
      status = 'offline';
    }
  }

  function debouncedPush() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => pushToServer(), 200);
  }

  function applyServerState(doc: ServerWorkout) {
    if (!doc) return;
    _applying = true;
    try {
      setServerVersion(doc.version);

      // Merge strategy: server state wins for structure,
      // but we keep the higher value for completed sets
      const mapped = {
        name: doc.name,
        mode: doc.mode ?? 'manual',
        activityType: doc.activityType ?? null,
        templateId: doc.templateId,
        intervalTemplateId: doc.intervalTemplateId ?? null,
        exercises: doc.exercises,
        paused: doc.paused,
        elapsed: doc.elapsed,
        savedAt: doc.savedAt,
        restStartedAt: doc.restStartedAt ?? null,
        restTotal: doc.restTotal ?? 0,
        restExerciseIdx: doc.restExerciseIdx ?? -1,
        restSetIdx: doc.restSetIdx ?? -1,
        holdStartedAt: doc.holdStartedAt ?? null,
        holdTotal: doc.holdTotal ?? 0,
        holdExerciseIdx: doc.holdExerciseIdx ?? -1,
        holdSetIdx: doc.holdSetIdx ?? -1
      };

      if (workout.active) {
        workout.applyRemoteState(mapped);
      } else {
        // A workout started on another device — adopt it locally so this
        // device shows it live (FAB, active page) without a reload.
        workout.restoreFromRemote(mapped);
      }

      status = 'synced';
    } finally {
      _applying = false;
    }
  }

  function connectSSE() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    try {
      eventSource = new EventSource('/api/fitness/workout/active/stream');

      eventSource.addEventListener('update', (e) => {
        try {
          const doc = JSON.parse(e.data);
          // Apply when the server has a newer version, or when this device has
          // no local workout yet (a workout just started on another device).
          if (!workout.active || doc.version > serverVersion) {
            applyServerState(doc);
          }
        } catch {}
      });

      eventSource.addEventListener('finished', (e) => {
        // Our own finish/cancel echoes back over the stream — the local
        // completion flow already handles it, so just clear the baseline.
        if (_localFinishing) {
          _localFinishing = false;
          setServerVersion(0);
          return;
        }
        // Another device finished the workout. Only surface the completion
        // overview if this device was actually in the workout.
        const wasActive = workout.active;
        if (wasActive) {
          try {
            const data = JSON.parse(e.data);
            lastFinishedSession = data?.session ?? null;
          } catch {
            lastFinishedSession = null;
          }
          workout.cancel();
        }
        // Reset the version baseline but keep the connection open so the next
        // workout started on any device shows up here live.
        setServerVersion(0);
      });

      eventSource.onerror = () => {
        status = 'offline';
        eventSource?.close();
        eventSource = null;

        // Reconnect with exponential backoff. Stay connected even with no
        // active workout so workouts started elsewhere arrive live.
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connectSSE();
        }, reconnectDelay);
      };

      eventSource.onopen = () => {
        status = 'synced';
        reconnectDelay = 1000;
        // On a *re*connection (after the stream dropped), reconcile with the
        // server. While we were offline the workout may have been finished or
        // cancelled on another device — the one-shot 'finished' event was
        // broadcast then and we missed it, so a plain reopen would leave this
        // device running a workout the server no longer has.
        if (_hasConnected) {
          reconcile();
        } else {
          _hasConnected = true;
        }
      };
    } catch {
      status = 'offline';
    }
  }

  function disconnectSSE() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    status = 'idle';
    // Keep the persisted marker: disconnect happens on layout unmount, not on
    // workout end, so a still-active workout must stay recognisable as "synced".
    setServerVersion(0, false);
  }

  /** Called when workout starts — push initial state and connect SSE */
  async function onWorkoutStart() {
    setServerVersion(0);
    _localFinishing = false;
    if (!eventSource) connectSSE();
    await pushToServer();
  }

  /** Called when workout finishes or is cancelled — clean up server state.
   *  Pass the just-saved session id so other devices receive it via SSE
   *  and can render the finish overview.
   *
   *  The SSE connection is kept open so this device stays in sync with any
   *  future workout started on another device. `_localFinishing` suppresses
   *  the finish event echoed back to us. */
  async function onWorkoutEnd(sessionId?: string | null) {
    _localFinishing = true;
    setServerVersion(0);
    // Safety net: clear the guard even if the echo never arrives (e.g. the
    // stream is momentarily down) so a later genuine remote finish isn't eaten.
    setTimeout(() => { _localFinishing = false; }, 5000);
    try {
      const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
      await fetch(`/api/fitness/workout/active${qs}`, { method: 'DELETE' });
    } catch {}
  }

  /** Clear the finished-session payload after the page has consumed it. */
  function clearFinishedSession() {
    lastFinishedSession = null;
  }

  /** Called on app load — reconcile local vs server state */
  async function init() {
    try {
      const res = await fetch('/api/fitness/workout/active');
      if (res.status === 401) {
        status = 'offline';
        return;
      }

      const data = res.ok ? await res.json() : null;

      // Always open a live connection — even with no active workout — so a
      // workout started on another device shows up here without a reload.
      connectSSE();

      // When the network returns, reconnect immediately (rather than waiting out
      // the backoff) — connectSSE's onopen then reconciles missed finishes.
      if (typeof window !== 'undefined' && !_onlineHandler) {
        _onlineHandler = () => {
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          connectSSE();
        };
        window.addEventListener('online', _onlineHandler);
      }

      if (data?.active && data.workout) {
        const serverDoc = data.workout as ServerWorkout;
        setServerVersion(serverDoc.version);

        if (workout.active) {
          // Both local and server have active workout — push local state to
          // update server (will handle conflicts).
          await pushToServer();
        } else {
          // Server has workout but local doesn't — restore from server.
          workout.restoreFromRemote({
            name: serverDoc.name,
            mode: serverDoc.mode ?? 'manual',
            activityType: serverDoc.activityType ?? null,
            templateId: serverDoc.templateId,
            intervalTemplateId: serverDoc.intervalTemplateId ?? null,
            exercises: serverDoc.exercises,
            paused: serverDoc.paused,
            elapsed: serverDoc.elapsed,
            savedAt: serverDoc.savedAt,
            restStartedAt: serverDoc.restStartedAt ?? null,
            restTotal: serverDoc.restTotal ?? 0,
            restExerciseIdx: serverDoc.restExerciseIdx ?? -1,
            restSetIdx: serverDoc.restSetIdx ?? -1,
            holdStartedAt: serverDoc.holdStartedAt ?? null,
            holdTotal: serverDoc.holdTotal ?? 0,
            holdExerciseIdx: serverDoc.holdExerciseIdx ?? -1,
            holdSetIdx: serverDoc.holdSetIdx ?? -1
          });
        }
      } else if (workout.active) {
        if (wasSynced()) {
          // We were synced to a server workout that is now gone → it finished or
          // was cancelled on another device while this one was offline/closed and
          // missed the 'finished' event. End locally instead of re-pushing (which
          // would resurrect the completed workout).
          endFromRemote();
        } else {
          // We started this workout while offline; the server never knew about
          // it — push it up.
          await pushToServer();
        }
      }
    } catch {
      // Server unreachable — continue with local-only
      status = 'offline';
    }
  }

  /** Reconcile with the server after regaining connectivity (SSE reopen or the
   *  browser 'online' event). Handles the case where the workout was finished on
   *  another device while this one was offline and missed the 'finished' event. */
  async function reconcile() {
    if (_applying || _localFinishing) return;
    try {
      const res = await fetch('/api/fitness/workout/active');
      if (res.status === 401) {
        status = 'offline';
        return;
      }
      const data = res.ok ? await res.json() : null;

      if (data?.active && data.workout) {
        const serverDoc = data.workout as ServerWorkout;
        if (!workout.active || serverDoc.version > serverVersion) {
          applyServerState(serverDoc);
        } else if (workout.active) {
          // Local is at least as new — re-push any changes made while offline.
          await pushToServer();
        }
        return;
      }

      // Server has no active workout.
      if (workout.active && wasSynced()) {
        endFromRemote();
      } else if (workout.active) {
        // Started offline; server never knew — push it up.
        await pushToServer();
      }
    } catch {
      status = 'offline';
    }
  }

  /** Mirror a finish/cancel that happened on another device while this one was
   *  offline (and missed the 'finished' event): clear the synced baseline and end
   *  the local workout. The active page's effects then navigate away cleanly.
   *  No completion overview here — unlike the live 'finished' event we don't have
   *  the exact saved session, and guessing it from recent history is unreliable. */
  function endFromRemote() {
    setServerVersion(0);
    workout.cancel();
  }

  /** Notify sync layer that local state changed */
  function notifyChange() {
    if (!_applying && workout.active) {
      debouncedPush();
    }
  }

  function destroy() {
    disconnectSSE();
    if (_onlineHandler && typeof window !== 'undefined') {
      window.removeEventListener('online', _onlineHandler);
      _onlineHandler = null;
    }
  }

  return {
    get status() { return status; },
    get serverVersion() { return serverVersion; },
    get lastFinishedSession() { return lastFinishedSession; },
    init,
    onWorkoutStart,
    onWorkoutEnd,
    clearFinishedSession,
    notifyChange,
    destroy
  };
}

/** Shared singleton */
let _syncInstance: ReturnType<typeof createWorkoutSync> | null = null;

export function getWorkoutSync() {
  if (!_syncInstance) {
    _syncInstance = createWorkoutSync();
  }
  return _syncInstance;
}
