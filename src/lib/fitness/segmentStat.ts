// Map a segment-detail API response into the compact stat the dashboard card
// shows. Pure + isomorphic so the server load (SSR) and the client (on re-pick)
// produce identical results — no hydration shift.

export interface SegStat {
	best: number | null;
	pace: number | null;
	rank: number | null;
	dir: 'improve' | 'worse' | 'neutral';
	delta: number;
	komDays: number | null;
	athletes: number;
	recent: number;
	failed: boolean;
}

interface SegDetail {
	myEfforts?: { elapsedSeconds: number; avgPace: number | null; date: string }[];
	myBest?: number | null;
	myRank?: number | null;
	leaderboard?: { rank: number; username: string; date: string }[];
	recentCount?: number;
}

/** @param now Pass a fixed timestamp for deterministic output. */
export function buildSegStat(d: SegDetail, athleteCount: number | undefined, now = Date.now()): SegStat {
	const efforts = d.myEfforts ?? [];
	const best = d.myBest ?? (efforts.length ? Math.min(...efforts.map((e) => e.elapsedSeconds)) : null);
	const pace = best != null ? (efforts.find((e) => e.elapsedSeconds === best)?.avgPace ?? null) : null;

	// Trend: best time in the last 30 days vs best before that window.
	const cutoff = now - 30 * 86400000;
	const recent = efforts.filter((e) => new Date(e.date).getTime() >= cutoff);
	const older = efforts.filter((e) => new Date(e.date).getTime() < cutoff);
	let dir: SegStat['dir'] = 'neutral';
	let delta = 0;
	if (recent.length && older.length) {
		const bestRecent = Math.min(...recent.map((e) => e.elapsedSeconds));
		const bestOlder = Math.min(...older.map((e) => e.elapsedSeconds));
		delta = Math.abs(bestRecent - bestOlder);
		dir = bestRecent < bestOlder ? 'improve' : bestRecent > bestOlder ? 'worse' : 'neutral';
	}

	// KOM reign: if I hold the record (rank 1), days since I set it.
	const board = d.leaderboard ?? [];
	const kom = board[0];
	const komDays =
		kom && d.myRank === 1 ? Math.max(0, Math.floor((now - new Date(kom.date).getTime()) / 86400000)) : null;

	return {
		best,
		pace,
		rank: d.myRank ?? null,
		dir,
		delta,
		komDays,
		athletes: athleteCount ?? board.length,
		recent: d.recentCount ?? 0,
		failed: false
	};
}
