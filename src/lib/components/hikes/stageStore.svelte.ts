/**
 * Active-stage selection for a multi-day hike detail page.
 *
 * `active` is the index into the hike's `stages[]`, or `null` for the
 * "Alle Etappen" (whole route) view. The stage nav writes it; the map,
 * elevation profile, metrics row and photo strip read it to scope themselves
 * to one stage. A shared rune (like hoverStore / focusedImageStore) avoids
 * prop-drilling through the two map instances.
 */

export const stage = $state<{ active: number | null }>({ active: null });

export function setActiveStage(index: number | null): void {
	stage.active = index;
}

export function clearActiveStage(): void {
	stage.active = null;
}
