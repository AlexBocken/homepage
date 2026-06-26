/** Elapsed seconds → `M:SS` (or `H:MM:SS` past an hour). */
export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/** Pace (min/km) → `M:SS /km`. */
export function formatPaceKm(minPerKm: number | null | undefined): string {
  if (minPerKm == null || !Number.isFinite(minPerKm) || minPerKm <= 0) return '—';
  const mm = Math.floor(minPerKm);
  const s = Math.round((minPerKm - mm) * 60);
  return `${mm}:${s.toString().padStart(2, '0')} /km`;
}

/** Signed delta in seconds → `+M:SS` / `−M:SS`. */
export function formatDelta(seconds: number): string {
  const sign = seconds > 0 ? '+' : seconds < 0 ? '−' : '±';
  return sign + formatElapsed(Math.abs(seconds));
}

/** Average speed over a split → `NN.N km/h`. */
export function formatSpeedKmh(km: number, seconds: number): string {
  if (!km || !seconds || seconds <= 0) return '—';
  return `${((km / seconds) * 3600).toFixed(1)} km/h`;
}

/**
 * Rate label for a best-effort split: running boards read in pace (min/km),
 * cycling boards in speed (km/h).
 */
export function formatEffortRate(km: number, seconds: number, kind: 'running' | 'cycling'): string {
  return kind === 'cycling' ? formatSpeedKmh(km, seconds) : formatPaceKm(seconds / 60 / km);
}
