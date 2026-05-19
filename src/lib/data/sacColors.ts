import type { Difficulty } from '$types/hikes';

/**
 * SAC-tier trail colour, used as the polyline colour for every per-hike
 * track rendering (overview map, detail-page live + static heroes).
 *
 *   T1     orange  — yellow Wegweiser trails (Wanderwege)
 *   T2/T3  red     — white-red-white Bergwanderwege
 *   T4-T6  blue    — white-blue-white Alpinwanderwege
 *
 * Single source of truth — keep the build script and every Svelte
 * component pointed here so a re-tune lands in one place. Values are
 * saturated on purpose to contrast strongly against the Pixelkarte's
 * desaturated greens / browns; tweak the build-side `HERO_RENDER_VERSION`
 * if these values change so stale static heroes get invalidated.
 */
export const SAC_TRAIL_COLOR: Record<Difficulty, string> = {
	T1: '#f5a623',
	T2: '#dc1d2a',
	T3: '#dc1d2a',
	T4: '#2965c8',
	T5: '#2965c8',
	T6: '#2965c8'
};

/** Fallback when a hike's difficulty isn't a known SAC tier (defensive —
 * the manifest type only allows valid tiers, but a stale build could leak
 * an unexpected string here). */
export const SAC_TRAIL_COLOR_DEFAULT = '#bf616a';

export function sacTrailColor(difficulty: Difficulty | string | null | undefined): string {
	if (!difficulty) return SAC_TRAIL_COLOR_DEFAULT;
	return SAC_TRAIL_COLOR[difficulty as Difficulty] ?? SAC_TRAIL_COLOR_DEFAULT;
}
