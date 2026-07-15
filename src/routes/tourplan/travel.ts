// Travel times between consecutive Aktive stops, generated once against the
// Google Maps API and then frozen into `travel.generated.json`
// (`pnpm tourplan:travel`). Nothing here calls a network API at runtime.
//
// Legs are keyed by the *departing* stop, since each stop has exactly one
// successor in the day's march.
import raw from './travel.generated.json';

export type TravelMode = 'walking' | 'driving';

export interface Leg {
	/** stopKey of the stop this leg arrives at. */
	to: string;
	mode: TravelMode;
	meters: number;
	seconds: number;
}

export interface TravelData {
	generatedAt: string | null;
	coords: Record<string, { lat: number; lng: number }>;
	legs: Record<string, Leg>;
}

export const TRAVEL = raw as TravelData;

/** The leg leaving `key`, or null when the data hasn't been generated for it. */
export function legFrom(key: string): Leg | null {
	return TRAVEL.legs[key] ?? null;
}

/** "4 Min" — always at least a minute, so a 20 s hop doesn't render as "0 Min". */
export function formatDuration(seconds: number): string {
	return `${Math.max(1, Math.round(seconds / 60))} Min`;
}

/** "280 m" below a kilometre, otherwise "2,1 km" (German decimal comma). */
export function formatDistance(meters: number): string {
	if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
	return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
