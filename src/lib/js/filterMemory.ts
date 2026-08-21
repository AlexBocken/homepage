/**
 * Filters that survive leaving a listing, and are forgotten when they stop being
 * about what you are doing.
 *
 * The address bar already carries the filter state, which covers reloading, sharing
 * and the back button. What it cannot cover is leaving by a link: clicking "Rezepte"
 * in the nav lands on a bare listing, and everything you had set up is gone even
 * though you were away for ten seconds looking at one recipe.
 *
 * So the last filter string is kept per tab, and re-applied when a listing is opened
 * with no filters of its own. Two clocks decide whether it is still relevant:
 *
 * - **Idle**, refreshed every time the filters are touched. This is "are you still
 *   doing the thing you were doing?" Thirty minutes is the window analytics has long
 *   used to call a browsing session over, and it matches the feel of it: come back
 *   after lunch and you are starting again.
 * - **Absolute**, from when this particular filter set was first built. Every restore
 *   rewrites the same string and so keeps resetting the idle clock; without a second
 *   clock, one filter set could ride along for days on its own restores. The clock
 *   starts over when the filters actually *change*, because changing them is a
 *   person deciding something, and that is a new task rather than the old one being
 *   kept alive.
 *
 * `sessionStorage`, not `localStorage`: a filter set is a task, not a preference, and
 * a tab is roughly one task. Closing it should forget them. Every access is guarded —
 * private windows and storage-blocking settings throw on the accessor itself, and a
 * listing must not fail to render over a convenience.
 */

/** Time since the filters were last touched. */
export const IDLE_TTL_MS = 30 * 60 * 1000;
/** Time since the filter set was first built, never refreshed. */
export const MAX_AGE_MS = 4 * 60 * 60 * 1000;

export type FilterSnapshot = {
	/** The query string, without the leading `?`. */
	search: string;
	/** When the filters were last touched. */
	ts: number;
	/** When this run of filtering started — survives refreshes of `ts`. */
	firstTs: number;
};

/** The subset of Storage this module needs, so the rules can be tested. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function session(): StorageLike | null {
	try {
		return typeof sessionStorage === 'undefined' ? null : sessionStorage;
	} catch {
		return null;
	}
}

/**
 * Decide what a stored snapshot is worth now. Exported for its own sake: this is the
 * whole policy, and it is easier to trust when it can be read on one screen.
 */
export function snapshotIsFresh(snap: FilterSnapshot, now: number): boolean {
	if (!snap.search) return false;
	if (now - snap.ts > IDLE_TTL_MS) return false;
	if (now - snap.firstTs > MAX_AGE_MS) return false;
	// A clock that moved backwards (a corrected system time, a restored session)
	// makes both ages meaningless rather than merely large.
	if (snap.ts > now || snap.firstTs > now) return false;
	return true;
}

/**
 * Remember the current filters, or forget them when there are none.
 *
 * An empty string is a deliberate "no filters", so it clears the snapshot: having
 * cleared the rail by hand, nobody expects the old filters back ten minutes later.
 */
export function rememberFilters(
	key: string,
	search: string,
	now: number = Date.now(),
	storage: StorageLike | null = session(),
): void {
	if (!storage) return;
	try {
		if (!search) {
			storage.removeItem(key);
			return;
		}
		// Same filters as last time — including a restore rewriting them verbatim —
		// continue the run they belong to. Different filters start a new one.
		const previous = read(key, storage);
		const firstTs = previous && previous.search === search ? previous.firstTs : now;
		storage.setItem(key, JSON.stringify({ search, ts: now, firstTs } satisfies FilterSnapshot));
	} catch {
		// Storage full or blocked — the listing works without this.
	}
}

/** The remembered filters if they are still relevant, else null (and forgotten). */
export function recallFilters(
	key: string,
	now: number = Date.now(),
	storage: StorageLike | null = session(),
): string | null {
	if (!storage) return null;
	const snap = read(key, storage);
	if (!snap) return null;
	if (!snapshotIsFresh(snap, now)) {
		try { storage.removeItem(key); } catch { /* nothing to do */ }
		return null;
	}
	return snap.search;
}

export function forgetFilters(key: string, storage: StorageLike | null = session()): void {
	try { storage?.removeItem(key); } catch { /* nothing to do */ }
}

function read(key: string, storage: StorageLike): FilterSnapshot | null {
	try {
		const raw = storage.getItem(key);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (typeof parsed?.search !== 'string' || typeof parsed?.ts !== 'number') return null;
		return {
			search: parsed.search,
			ts: parsed.ts,
			// Snapshots written before the absolute cap existed have no firstTs; treat
			// the last touch as the start rather than dropping them.
			firstTs: typeof parsed.firstTs === 'number' ? parsed.firstTs : parsed.ts,
		};
	} catch {
		return null;
	}
}
