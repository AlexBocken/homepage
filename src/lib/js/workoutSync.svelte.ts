/**
 * Workout sync layer — bridges local workout state with the server
 * for multi-device real-time synchronization via SSE.
 *
 * Usage: call `createWorkoutSync()` once from the fitness layout.
 * It wraps the existing workout singleton and keeps it in sync.
 */

import { getWorkout } from '$lib/js/workout.svelte';
import type { WorkoutExercise } from '$lib/js/workout.svelte';

type SyncStatus = 'idle' | 'synced' | 'syncing' | 'offline' | 'conflict';

interface ServerWorkout {
  version: number;
  name: string;
  templateId: string | null;
  exercises: WorkoutExercise[];
  paused: boolean;
  elapsed: number;
  savedAt: number;
  restStartedAt: number | null;
  restTotal: number;
  restExerciseIdx: number;
  restSetIdx: number;
}

export function createWorkoutSync() {
  const workout = getWorkout();

  let status: SyncStatus = $state('idle');
  let serverVersion = $state(0);
  let eventSource: EventSource | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = 1000;
  let _applying = false; // guard against re-entrant syncs

  function getWorkoutSnapshot(): ServerWorkout {
    // Compute current elapsed for an accurate snapshot
    let elapsed = workout.elapsedSeconds;
    return {
      version: serverVersion,
      name: workout.name,
      templateId: workout.templateId,
      exercises: JSON.parse(JSON.stringify(workout.exercises)),
      paused: workout.paused,
      elapsed,
      savedAt: Date.now(),
      restStartedAt: workout.restStartedAt,
      restTotal: workout.restTimerTotal,
      restExerciseIdx: workout.restExerciseIdx,
      restSetIdx: workout.restSetIdx
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
        serverVersion = doc.version; // reconcile with actual server version
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
      serverVersion = doc.version;

      // Merge strategy: server state wins for structure,
      // but we keep the higher value for completed sets
      workout.applyRemoteState({
        name: doc.name,
        templateId: doc.templateId,
        exercises: doc.exercises,
        paused: doc.paused,
        elapsed: doc.elapsed,
        savedAt: doc.savedAt,
        restStartedAt: doc.restStartedAt ?? null,
        restTotal: doc.restTotal ?? 0,
        restExerciseIdx: doc.restExerciseIdx ?? -1,
        restSetIdx: doc.restSetIdx ?? -1
      });

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

    if (!workout.active) return;

    try {
      eventSource = new EventSource('/api/fitness/workout/active/stream');

      eventSource.addEventListener('update', (e) => {
        try {
          const doc = JSON.parse(e.data);
          // Only apply if server version is newer than ours
          if (doc.version > serverVersion) {
            applyServerState(doc);
          }
        } catch {}
      });

      eventSource.addEventListener('finished', () => {
        // Another device finished the workout
        workout.cancel();
        disconnectSSE();
      });

      eventSource.onerror = () => {
        status = 'offline';
        eventSource?.close();
        eventSource = null;

        // Reconnect with exponential backoff
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          if (workout.active) connectSSE();
        }, reconnectDelay);
      };

      eventSource.onopen = () => {
        status = 'synced';
        reconnectDelay = 1000;
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
    serverVersion = 0;
  }

  /** Called when workout starts — push initial state and connect SSE */
  async function onWorkoutStart() {
    serverVersion = 0;
    await pushToServer();
    connectSSE();
  }

  /** Called when workout finishes or is cancelled — clean up server state */
  async function onWorkoutEnd() {
    disconnectSSE();
    try {
      await fetch('/api/fitness/workout/active', { method: 'DELETE' });
    } catch {}
  }

  /** Called on app load — reconcile local vs server state */
  async function init() {
    try {
      const res = await fetch('/api/fitness/workout/active');
      if (!res.ok) return;

      const data = await res.json();

      if (data.active && data.workout) {
        const serverDoc = data.workout as ServerWorkout;

        if (workout.active) {
          // Both local and server have active workout — use higher version
          serverVersion = serverDoc.version;
          // Push local state to update server (will handle conflicts)
          await pushToServer();
        } else {
          // Server has workout but local doesn't — restore from server
          serverVersion = serverDoc.version;
          workout.restoreFromRemote({
            name: serverDoc.name,
            templateId: serverDoc.templateId,
            exercises: serverDoc.exercises,
            paused: serverDoc.paused,
            elapsed: serverDoc.elapsed,
            savedAt: serverDoc.savedAt,
            restStartedAt: serverDoc.restStartedAt ?? null,
            restTotal: serverDoc.restTotal ?? 0,
            restExerciseIdx: serverDoc.restExerciseIdx ?? -1,
            restSetIdx: serverDoc.restSetIdx ?? -1
          });
        }
        connectSSE();
      } else if (workout.active) {
        // Local has workout but server doesn't — push to server
        await pushToServer();
        connectSSE();
      }
    } catch {
      // Server unreachable — continue with local-only
      status = 'offline';
    }
  }

  /** Notify sync layer that local state changed */
  function notifyChange() {
    if (!_applying && workout.active) {
      debouncedPush();
    }
  }

  function destroy() {
    disconnectSSE();
  }

  return {
    get status() { return status; },
    get serverVersion() { return serverVersion; },
    init,
    onWorkoutStart,
    onWorkoutEnd,
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
