<script>
	import { m } from '$lib/js/fitnessI18n';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import { toast } from '$lib/js/toast.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';

	/**
	 * @type {{ periods: any[], lang: 'en' | 'de', sharedWith?: string[], readOnly?: boolean, ownerName?: string, mode?: 'entry' | 'projection' | 'full' }}
	 */
	let { periods: initialPeriods = [], lang = 'en', sharedWith: initialSharedWith = [], readOnly = false, ownerName = '', mode = 'full' } = $props();
	const t = $derived(m[lang]);
	const showEntry = $derived(mode !== 'projection');
	const showProjection = $derived(mode !== 'entry');

	// svelte-ignore state_referenced_locally
	let periods = $state([...initialPeriods]);
	let loading = $state(false);
	let showAddForm = $state(false);
	let addStart = $state('');
	let addEnd = $state('');

	// Edit state
	let editId = $state('');
	let editStart = $state('');
	let editEnd = $state('');

	// History collapsed by default
	let showHistory = $state(false);

	// Sharing state
	// svelte-ignore state_referenced_locally
	let shareList = $state([...initialSharedWith]);
	let showShare = $state(false);
	let shareInput = $state('');
	let shareSaving = $state(false);

	// Calendar navigation: month offset from today
	let calendarOffset = $state(0);

	const today = new Date();

	/** @param {Date} d */
	function fmtLocal(d) {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	const todayStr = fmtLocal(today);

	/** Normalize any Date to local-midnight timestamp */
	/** @param {Date} dt */
	function midnight(dt) { return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime(); }

	/** Parse a date string (ISO or YYYY-MM-DD) to local-midnight timestamp */
	/** @param {string} s */
	function parseLocal(s) {
		const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
		if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
		return midnight(new Date(s));
	}

	const todayMidnight = midnight(today);

	/** @param {string|Date} dateStr */
	function formatDate(dateStr) {
		const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
		return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
			month: 'short', day: 'numeric'
		});
	}

	/** Format a date as a relative description, e.g. "Tuesday in 3 weeks" */
	/** @param {Date} date */
	function relativeDate(date) {
		const locale = lang === 'de' ? 'de-DE' : 'en-US';
		const dayName = date.toLocaleDateString(locale, { weekday: 'long' });
		const diffDays = Math.round((midnight(date) - todayMidnight) / 86400000);

		if (diffDays === 0) return lang === 'de' ? 'Heute' : 'Today';
		if (diffDays === 1) return lang === 'de' ? 'Morgen' : 'Tomorrow';
		if (diffDays === -1) return lang === 'de' ? 'Gestern' : 'Yesterday';

		if (diffDays > 0) {
			if (diffDays < 7) {
				return lang === 'de' ? `${dayName} (in ${diffDays} Tagen)` : `${dayName} (in ${diffDays} days)`;
			}
			const weeks = Math.ceil(diffDays / 7);
			const wLabel = weeks === 1
				? (lang === 'de' ? '1 Woche' : '1 week')
				: (lang === 'de' ? `${weeks} Wochen` : `${weeks} weeks`);
			return lang === 'de' ? `${dayName} in ${wLabel}` : `${dayName} in ${wLabel}`;
		}

		const absDays = Math.abs(diffDays);
		if (absDays < 7) {
			return lang === 'de' ? `${dayName} (vor ${absDays} Tagen)` : `${dayName} (${absDays} days ago)`;
		}
		const weeks = Math.ceil(absDays / 7);
		const wLabel = weeks === 1
			? (lang === 'de' ? '1 Woche' : '1 week')
			: (lang === 'de' ? `${weeks} Wochen` : `${weeks} weeks`);
		return lang === 'de' ? `${dayName} vor ${wLabel}` : `${dayName} ${wLabel} ago`;
	}

	/** Short relative range: "Tuesday to Saturday in 3 weeks" */
	/** @param {Date} start @param {Date} end */
	function relativeRange(start, end) {
		const locale = lang === 'de' ? 'de-DE' : 'en-US';
		const startDay = start.toLocaleDateString(locale, { weekday: 'long' });
		const endDay = end.toLocaleDateString(locale, { weekday: 'long' });
		const diffDays = Math.round((midnight(start) - todayMidnight) / 86400000);
		const toWord = t.to;

		if (diffDays >= 0 && diffDays < 7) {
			return lang === 'de'
				? `${startDay} ${toWord} ${endDay} (in ${diffDays} Tagen)`
				: `${startDay} ${toWord} ${endDay} (in ${diffDays} days)`;
		}
		if (diffDays >= 7) {
			const weeks = Math.ceil(diffDays / 7);
			const wLabel = weeks === 1
				? (lang === 'de' ? '1 Woche' : '1 week')
				: (lang === 'de' ? `${weeks} Wochen` : `${weeks} weeks`);
			return lang === 'de'
				? `${startDay} ${toWord} ${endDay} in ${wLabel}`
				: `${startDay} ${toWord} ${endDay} in ${wLabel}`;
		}
		return `${startDay} ${toWord} ${endDay}`;
	}

	// Sort periods newest first
	const sorted = $derived([...periods].sort((a, b) =>
		new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
	));

	// Ongoing period (no endDate)
	const ongoing = $derived(sorted.find(p => !p.endDate));

	// Completed periods (have endDate), oldest first for EMA
	const completed = $derived(
		sorted.filter(p => p.endDate).sort((a, b) =>
			new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
		)
	);

	// Cycle predictions — Clue-style: average over the recent cycles, variability
	// over a longer recent window. Population priors (29-day cycle, 5-day period)
	// stand in until enough history accrues.
	const predictions = $derived.by(() => {
		const MEAN_WINDOW = 6;   // average the last 6 cycles for the point estimate
		const VAR_WINDOW = 12;   // ...over a 12-cycle history for variability
		const PRIOR_CYCLE = 29;
		const PRIOR_PERIOD = 5;
		const lutealLength = 14;

		/** @type {number[]} */
		const cycleLengths = [];
		/** @type {number[]} */
		const periodLengths = [];

		for (let i = 0; i < completed.length; i++) {
			const p = completed[i];
			const start = new Date(p.startDate);
			const end = new Date(p.endDate);
			const dur = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
			periodLengths.push(dur);

			if (i > 0) {
				const prevStart = new Date(completed[i - 1].startDate);
				const cycle = Math.round((start.getTime() - prevStart.getTime()) / 86400000);
				if (cycle > 0 && cycle < 60) cycleLengths.push(cycle);
			}
		}

		/** Mean of the last `n` values, or `fallback` if there are none. */
		/** @param {number[]} arr @param {number} n @param {number} fallback */
		function recentMean(arr, n, fallback) {
			if (arr.length === 0) return fallback;
			const w = arr.slice(-n);
			return w.reduce((a, b) => a + b, 0) / w.length;
		}
		/** Sample standard deviation of the last `n` values (0 if fewer than 2). */
		/** @param {number[]} arr @param {number} n */
		function recentSd(arr, n) {
			const w = arr.slice(-n);
			if (w.length < 2) return 0;
			const m = w.reduce((a, b) => a + b, 0) / w.length;
			const variance = w.reduce((s, v) => s + (v - m) ** 2, 0) / (w.length - 1);
			return Math.sqrt(variance);
		}
		const meanCycle = recentMean(cycleLengths, MEAN_WINDOW, PRIOR_CYCLE);
		const meanPeriod = recentMean(periodLengths, MEAN_WINDOW, PRIOR_PERIOD);
		// Typical cycle-to-cycle variation: one SD over the recent window. This is
		// what users read a "± N days" as (how much an individual cycle swings),
		// unlike a CI of the mean, which only narrows as more cycles are logged.
		const cycleSd = Math.round(recentSd(cycleLengths, MEAN_WINDOW) * 10) / 10;
		const periodSd = Math.round(recentSd(periodLengths, MEAN_WINDOW) * 10) / 10;

		// Predict ongoing end
		let predictedEndOfOngoing = null;
		if (ongoing) {
			const ongoingStart = new Date(ongoing.startDate);
			predictedEndOfOngoing = new Date(ongoingStart.getTime() + (Math.round(meanPeriod) - 1) * 86400000);
		}

		// Generate future predicted cycles (12 cycles ≈ ~1 year)
		const meanCycleDays = Math.round(meanCycle);
		const cycleMs = meanCycleDays * 86400000;
		const periodMs = (Math.round(meanPeriod) - 1) * 86400000;
		const lastStart = sorted[0] ? new Date(sorted[0].startDate) : null;

		// Ovulation-timing uncertainty for widening future fertile windows: one SD
		// of recent cycle length (capped at ±5d), so the band tracks how regular
		// she actually is rather than being pinned by a single lifetime outlier.
		const delta = Math.round(Math.min(recentSd(cycleLengths, VAR_WINDOW), 5));

		/**
		 * Build a fertility window for one cycle.
		 *
		 * Anchor: the next period's start (luteal-back-count). Past cycles know it
		 * exactly; future cycles use the mean prediction and widen the ovulation
		 * estimate by ±delta (one SD of recent cycle length).
		 *
		 * Floor: fertile/peak never overlap the prior bleed. Day-after-period-end
		 * is the earliest possible fertile day shown — a hard biological floor for
		 * the user's mental model, even though sperm survival could in theory begin
		 * earlier in the bleed for very short cycles.
		 *
		 * @param {number} cycleStartMs   ms of cycle start (= prior period start)
		 * @param {number | null} priorPeriodEndMs  ms of prior bleed end, or null if unknown
		 * @param {number} nextPeriodStartMs  ms of the next period's start
		 * @param {boolean} widen  true → widen ovulation by ±delta; false → point estimate
		 */
		function buildWindow(cycleStartMs, priorPeriodEndMs, nextPeriodStartMs, widen) {
			const ovMs = nextPeriodStartMs - lutealLength * 86400000;
			// Future cycles widen ovulation by ±delta around the prediction; past
			// cycles know the next period exactly, so they collapse to a point.
			const d = widen ? delta : 0;
			const earliestOvMs = ovMs - d * 86400000;
			let latestOvMs = ovMs + d * 86400000;
			// Cap latest ov before the next bleed starts.
			if (latestOvMs > nextPeriodStartMs - 86400000) latestOvMs = nextPeriodStartMs - 86400000;

			const floorMs = priorPeriodEndMs !== null ? priorPeriodEndMs + 86400000 : cycleStartMs;

			let fertileStartMs = Math.max(earliestOvMs - 5 * 86400000, floorMs, cycleStartMs);
			let peakStartMs = Math.max(ovMs - 2 * 86400000, floorMs, cycleStartMs);
			// Peak fertility includes ovulation day itself — highest conception
			// probability is the 2 days before ovulation plus ovulation day.
			const peakEndMs = ovMs;
			let fertileEndMs = Math.max(latestOvMs, ovMs);

			// Suppress peak if floor pushed it past ov (e.g. very short cycle + long period).
			if (peakStartMs > peakEndMs) peakStartMs = peakEndMs + 86400000;
			// Keep fertile envelope around peak/ov.
			if (fertileStartMs > peakStartMs && peakStartMs <= peakEndMs) fertileStartMs = peakStartMs;

			return {
				fertileStart: new Date(fertileStartMs),
				fertileEnd: new Date(fertileEndMs),
				peakStart: new Date(peakStartMs),
				peakEnd: new Date(peakEndMs),
				ovulation: new Date(ovMs),
				lutealStart: new Date(latestOvMs + 86400000),
				lutealEnd: new Date(nextPeriodStartMs - 86400000)
			};
		}

		/** @type {{ start: Date, end: Date, fertileStart: Date, fertileEnd: Date, peakStart: Date, peakEnd: Date, ovulation: Date, lutealStart: Date, lutealEnd: Date }[]} */
		const futureCycles = [];
		if (lastStart) {
			let base = lastStart.getTime();
			// Prior bleed end for the first predicted cycle: actual end if recorded,
			// predicted end if ongoing, else cycle start.
			let priorPeriodEndMs;
			if (sorted[0]?.endDate) {
				priorPeriodEndMs = midnight(new Date(sorted[0].endDate));
			} else if (predictedEndOfOngoing) {
				priorPeriodEndMs = midnight(predictedEndOfOngoing);
			} else {
				priorPeriodEndMs = base;
			}

			for (let i = 0; i < 12; i++) {
				const nextPeriodStartMs = base + cycleMs;
				const periodEndMs = nextPeriodStartMs + periodMs;
				const w = buildWindow(base, priorPeriodEndMs, nextPeriodStartMs, /* widen */ true);
				futureCycles.push({
					start: new Date(nextPeriodStartMs),
					end: new Date(periodEndMs),
					...w
				});
				base = nextPeriodStartMs;
				priorPeriodEndMs = periodEndMs;
			}
		}

		// Past fertility/luteal windows (from completed cycles)
		/** @type {{ fertileStart: Date, fertileEnd: Date, peakStart: Date, peakEnd: Date, ovulation: Date, lutealStart: Date, lutealEnd: Date }[]} */
		const pastFertileWindows = [];
		for (let i = 1; i < completed.length; i++) {
			const cycleStartMs = midnight(new Date(completed[i - 1].startDate));
			const priorPeriodEndMs = completed[i - 1].endDate
				? midnight(new Date(completed[i - 1].endDate))
				: null;
			const nextPeriodStartMs = midnight(new Date(completed[i].startDate));
			pastFertileWindows.push(buildWindow(cycleStartMs, priorPeriodEndMs, nextPeriodStartMs, /* widen */ false));
		}

		// The cycle running into an ongoing period is fully determined — its next
		// period start is known (the ongoing period's start) even though that
		// period has no recorded end yet. Build its window from the most recent
		// completed period so the gap before today isn't left blank.
		if (ongoing && completed.length > 0) {
			const last = completed[completed.length - 1];
			const cycleStartMs = midnight(new Date(last.startDate));
			const priorPeriodEndMs = last.endDate ? midnight(new Date(last.endDate)) : null;
			const nextPeriodStartMs = midnight(new Date(ongoing.startDate));
			if (nextPeriodStartMs > cycleStartMs) {
				pastFertileWindows.push(buildWindow(cycleStartMs, priorPeriodEndMs, nextPeriodStartMs, /* widen */ false));
			}
		}

		// Most recent cycle length: gap between the two latest period starts
		// (includes an ongoing period, so it reflects the genuinely last cycle).
		let lastCycleLength = null;
		if (sorted.length >= 2) {
			const c = Math.round((midnight(new Date(sorted[0].startDate)) - midnight(new Date(sorted[1].startDate))) / 86400000);
			if (c > 0 && c < 60) lastCycleLength = c;
		}

		// Most recent completed period length.
		const lastPeriodLength = periodLengths.length > 0 ? periodLengths[periodLengths.length - 1] : null;

		return {
			avgCycle: Math.round(meanCycle * 10) / 10,
			avgPeriod: Math.round(meanPeriod * 10) / 10,
			cycleSd,
			periodSd,
			lastCycleLength,
			lastPeriodLength,
			predictedEndOfOngoing,
			futureCycles,
			pastFertileWindows
		};
	});

	// First future cycle (for status display)
	const nextCycle = $derived(predictions.futureCycles[0] ?? null);

	// Authoritative references for the cycle insights below.
	const SRC_ACOG_AUB = { label: 'ACOG', url: 'https://www.acog.org/womens-health/faqs/abnormal-uterine-bleeding' };
	const SRC_ACOG_VITAL = { label: 'ACOG', url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2015/12/menstruation-in-girls-and-adolescents-using-the-menstrual-cycle-as-a-vital-sign' };
	const SRC_CC_ABNORMAL = { label: 'Cleveland Clinic', url: 'https://my.clevelandclinic.org/health/diseases/14633-abnormal-menstruation-periods' };
	const SRC_CC_HYPO = { label: 'Cleveland Clinic', url: 'https://health.clevelandclinic.org/hypomenorrhea' };
	const SRC_CC_MENORRHAGIA = { label: 'Cleveland Clinic', url: 'https://my.clevelandclinic.org/health/diseases/17734-menorrhagia-heavy-menstrual-bleeding' };
	const SRC_CC_OLIGO = { label: 'Cleveland Clinic', url: 'https://my.clevelandclinic.org/health/symptoms/22834-oligomenorrhea' };

	// Contextual, non-diagnostic insights about recent cycle/period behaviour.
	// Thresholds follow common clinical guidance: cycle 21–35 days, period ≤7 days
	// (≤2 = light), regularity judged over recent cycles. Patterns over several
	// cycles matter more than any single one — copy and disclaimer reflect that.
	const insights = $derived.by(() => {
		const startsAsc = [...periods]
			.map(p => midnight(new Date(p.startDate)))
			.sort((a, b) => a - b);
		const cycles = [];
		for (let i = 1; i < startsAsc.length; i++) {
			const c = Math.round((startsAsc[i] - startsAsc[i - 1]) / 86400000);
			if (c > 0 && c < 60) cycles.push(c);
		}
		const periodDurs = completed.map(p =>
			Math.round((midnight(new Date(p.endDate)) - midnight(new Date(p.startDate))) / 86400000) + 1
		);

		/** @type {{ id: string, level: 'positive'|'info'|'attention', title: string, body: string, source: { label: string, url: string } }[]} */
		const list = [];

		// Cycle regularity — needs at least 3 cycles to judge.
		const recent = cycles.slice(-6);
		if (recent.length >= 3) {
			const min = Math.min(...recent);
			const max = Math.max(...recent);
			if (min >= 21 && max <= 35 && max - min <= 7) {
				list.push({ id: 'regular', level: 'positive', title: t.insight_regular_title, body: t.insight_regular_body, source: SRC_ACOG_VITAL });
			} else if (max - min > 9 || min < 21 || max > 35) {
				list.push({ id: 'irregular', level: 'attention', title: t.insight_irregular_title, body: t.insight_irregular_body, source: SRC_CC_ABNORMAL });
			}
		}

		// Most recent completed cycle length.
		const lastCycle = cycles.at(-1);
		if (lastCycle !== undefined) {
			if (lastCycle < 21) list.push({ id: 'short_cycle', level: 'info', title: t.insight_short_cycle_title, body: t.insight_short_cycle_body, source: SRC_ACOG_AUB });
			else if (lastCycle > 35) list.push({ id: 'long_cycle', level: 'info', title: t.insight_long_cycle_title, body: t.insight_long_cycle_body, source: SRC_CC_OLIGO });
		}

		// Most recent completed period length.
		const lastPeriod = periodDurs.at(-1);
		if (lastPeriod !== undefined) {
			if (lastPeriod <= 2) list.push({ id: 'short_period', level: 'info', title: t.insight_short_period_title, body: t.insight_short_period_body, source: SRC_CC_HYPO });
			else if (lastPeriod > 7) list.push({ id: 'long_period', level: 'attention', title: t.insight_long_period_title, body: t.insight_long_period_body, source: SRC_CC_MENORRHAGIA });
		}

		return list;
	});

	// Days into current period
	const ongoingDay = $derived.by(() => {
		if (!ongoing) return 0;
		const start = parseLocal(ongoing.startDate);
		return Math.floor((todayMidnight - start) / 86400000) + 1;
	});

	// Calendar data
	const calendarMonth = $derived.by(() => {
		const d = new Date(today.getFullYear(), today.getMonth() + calendarOffset, 1);
		return { year: d.getFullYear(), month: d.getMonth() };
	});

	const calendarLabel = $derived(
		new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString(
			lang === 'de' ? 'de-DE' : 'en-US', { month: 'long', year: 'numeric' }
		)
	);

	const calendarDays = $derived.by(() => {
		const { year, month } = calendarMonth;
		const first = new Date(year, month, 1);
		const last = new Date(year, month + 1, 0);
		const startDay = (first.getDay() + 6) % 7; // Monday = 0

		// Build cells with per-layer membership, including overflow days.
		/** @type {{ day: number, date: string, overflow: boolean, layers: Record<string, boolean>, pos: Record<string, string> }[]} */
		const cells = [];
		/** @param {number} d @param {string} date @param {boolean} overflow */
		const push = (d, date, overflow) => cells.push({ day: d, date, overflow, layers: getDayLayers(date), pos: {} });

		// Previous month overflow
		if (startDay > 0) {
			const prevLast = new Date(year, month, 0); // last day of previous month
			for (let i = startDay - 1; i >= 0; i--) {
				const d = prevLast.getDate() - i;
				push(d, fmtLocal(new Date(year, month - 1, d)), true);
			}
		}

		// Current month
		for (let d = 1; d <= last.getDate(); d++) {
			push(d, `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, false);
		}

		// Next month overflow to complete the last row
		const remainder = cells.length % 7;
		if (remainder > 0) {
			for (let d = 1; d <= 7 - remainder; d++) push(d, fmtLocal(new Date(year, month + 1, d)), true);
		}

		// Each nesting layer is rendered as its own rounded capsule band; a day rounds
		// a layer's left/right end only where the linearly-adjacent day lacks that
		// layer. Wrapping across the week boundary is linear adjacency, so a band stays
		// flat there and reads as one capsule across rows. Inner layers (active, inner,
		// ov) paint over the outer ones at the same height to give the nested look.
		const LAYERS = ['predicted', 'active', 'luteal', 'fertile', 'inner'];
		for (let i = 0; i < cells.length; i++) {
			for (const k of LAYERS) {
				if (!cells[i].layers[k]) continue;
				const prev = i > 0 && cells[i - 1].layers[k];
				const next = i + 1 < cells.length && cells[i + 1].layers[k];
				cells[i].pos[k] = (!prev && !next) ? 'solo' : (!prev) ? 'start' : (!next) ? 'end' : 'mid';
			}
		}

		return cells;
	});

	/** @param {string} dateStr */
	function getDayLayers(dateStr) {
		const d = parseLocal(dateStr);
		const L = { active: false, predicted: false, fertile: false, inner: false, ov: false, luteal: false };

		// Actual logged period days (an ongoing period counts through today).
		for (const p of periods) {
			const start = midnight(new Date(p.startDate));
			const end = p.endDate ? midnight(new Date(p.endDate)) : todayMidnight;
			if (d >= start && d <= end) L.active = true;
		}

		// Predicted period = the outer pill. For the ongoing period it spans the
		// whole expected period so the logged days nest inside it; future cycles are
		// entirely predicted.
		if (ongoing && predictions.predictedEndOfOngoing) {
			const start = midnight(new Date(ongoing.startDate));
			const end = midnight(predictions.predictedEndOfOngoing);
			if (d >= start && d <= end) L.predicted = true;
		}
		for (const c of predictions.futureCycles) {
			if (d >= midnight(c.start) && d <= midnight(c.end)) L.predicted = true;
		}

		// Fertility nesting: fertile (outer) ⊃ peak+ovulation (inner) ⊃ ovulation.
		for (const w of [...predictions.futureCycles, ...predictions.pastFertileWindows]) {
			if (d >= midnight(w.fertileStart) && d <= midnight(w.fertileEnd)) L.fertile = true;
			if (d >= midnight(w.peakStart) && d <= midnight(w.ovulation)) L.inner = true;
			if (d === midnight(w.ovulation)) L.ov = true;
			if (d >= midnight(w.lutealStart) && d <= midnight(w.lutealEnd)) L.luteal = true;
		}

		return L;
	}

	async function startPeriod() {
		loading = true;
		try {
			const res = await fetch('/api/fitness/period', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ startDate: new Date().toISOString(), owner: ownerName || undefined })
			});
			if (res.ok) {
				const { entry } = await res.json();
				periods = [entry, ...periods];
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to start period');
			}
		} catch { toast.error('Failed to start period'); }
		finally { loading = false; }
	}

	/** @param {string} dateStr — YYYY-MM-DD from a calendar cell */
	async function promptStartPeriodOn(dateStr) {
		const d = new Date(parseLocal(dateStr));
		const ok = await confirm(
			lang === 'de'
				? `Periode am ${formatDate(d)} starten?`
				: `Start period on ${formatDate(d)}?`,
			{
				title: lang === 'de' ? 'Periode starten' : 'Start period',
				confirmText: lang === 'de' ? 'Starten' : 'Start',
				cancelText: lang === 'de' ? 'Abbrechen' : 'Cancel',
				destructive: false
			}
		);
		if (!ok) return;
		loading = true;
		try {
			const res = await fetch('/api/fitness/period', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ startDate: d.toISOString(), owner: ownerName || undefined })
			});
			if (res.ok) {
				const { entry } = await res.json();
				periods = [entry, ...periods];
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to start period');
			}
		} catch { toast.error('Failed to start period'); }
		finally { loading = false; }
	}

	/**
	 * Long-press attachment. Fires `handler` after THRESHOLD ms of unmoving
	 * pointer contact. Cancels on movement > MOVE_TOL, pointer leave/cancel,
	 * or release before threshold. Suppresses the browser context menu when
	 * the gesture fires (iOS otherwise pops a callout on touch hold).
	 *
	 * @param {() => void} handler
	 * @returns {import('svelte/attachments').Attachment<HTMLElement>}
	 */
	function longPress(handler) {
		const THRESHOLD = 600;
		const MOVE_TOL = 8;
		return (node) => {
			/** @type {number | null} */
			let timer = null;
			let startX = 0;
			let startY = 0;
			let firing = false;

			function clear() {
				if (timer !== null) {
					clearTimeout(timer);
					timer = null;
				}
				node.classList.remove('long-pressing');
			}

			/** @param {PointerEvent} e */
			function onPointerDown(e) {
				if (e.button !== undefined && e.button !== 0) return;
				startX = e.clientX;
				startY = e.clientY;
				firing = false;
				node.classList.add('long-pressing');
				timer = window.setTimeout(() => {
					firing = true;
					node.classList.remove('long-pressing');
					timer = null;
					handler();
				}, THRESHOLD);
			}

			/** @param {PointerEvent} e */
			function onPointerMove(e) {
				if (timer === null) return;
				if (Math.abs(e.clientX - startX) > MOVE_TOL || Math.abs(e.clientY - startY) > MOVE_TOL) {
					clear();
				}
			}

			/** @param {Event} e */
			function onContextMenu(e) {
				if (firing) {
					e.preventDefault();
					firing = false;
				}
			}

			node.addEventListener('pointerdown', onPointerDown);
			node.addEventListener('pointermove', onPointerMove);
			node.addEventListener('pointerup', clear);
			node.addEventListener('pointerleave', clear);
			node.addEventListener('pointercancel', clear);
			node.addEventListener('contextmenu', onContextMenu);

			return () => {
				clear();
				node.removeEventListener('pointerdown', onPointerDown);
				node.removeEventListener('pointermove', onPointerMove);
				node.removeEventListener('pointerup', clear);
				node.removeEventListener('pointerleave', clear);
				node.removeEventListener('pointercancel', clear);
				node.removeEventListener('contextmenu', onContextMenu);
			};
		};
	}

	/** Whether long-pressing the given calendar cell can start a period. */
	/** @param {{ date: string, layers: Record<string, boolean> }} cell */
	function canStartOn(cell) {
		if (readOnly || !showEntry) return false;
		if (ongoing) return false;
		if (cell.layers.active) return false;
		return parseLocal(cell.date) <= todayMidnight;
	}

	async function endPeriod() {
		if (!ongoing) return;
		loading = true;
		try {
			const res = await fetch(`/api/fitness/period/${ongoing._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ endDate: new Date(Date.now() - 86400000).toISOString() })
			});
			if (res.ok) {
				const { entry } = await res.json();
				periods = periods.map(p => p._id === entry._id ? entry : p);
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to end period');
			}
		} catch { toast.error('Failed to end period'); }
		finally { loading = false; }
	}

	async function addPastPeriod() {
		if (!addStart) return;
		loading = true;
		try {
			const body = { startDate: new Date(addStart).toISOString(), owner: ownerName || undefined };
			if (addEnd) Object.assign(body, { endDate: new Date(addEnd).toISOString() });
			const res = await fetch('/api/fitness/period', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (res.ok) {
				const { entry } = await res.json();
				periods = [entry, ...periods];
				showAddForm = false;
				addStart = '';
				addEnd = '';
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to add period');
			}
		} catch { toast.error('Failed to add period'); }
		finally { loading = false; }
	}

	/** @param {any} p */
	function startEdit(p) {
		editId = p._id;
		editStart = fmtLocal(new Date(p.startDate));
		editEnd = p.endDate ? fmtLocal(new Date(p.endDate)) : '';
	}

	function cancelEdit() {
		editId = '';
		editStart = '';
		editEnd = '';
	}

	async function saveEdit() {
		if (!editStart) return;
		loading = true;
		try {
			/** @type {Record<string, unknown>} */
			const body = { startDate: new Date(editStart).toISOString() };
			body.endDate = editEnd ? new Date(editEnd).toISOString() : null;
			const res = await fetch(`/api/fitness/period/${editId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (res.ok) {
				const { entry } = await res.json();
				periods = periods.map(p => p._id === editId ? entry : p);
				cancelEdit();
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to update period');
			}
		} catch { toast.error('Failed to update period'); }
		finally { loading = false; }
	}

	/** @param {string} id */
	async function deletePeriod(id) {
		if (!await confirm(t.delete_period_confirm)) return;
		try {
			const res = await fetch(`/api/fitness/period/${id}`, { method: 'DELETE' });
			if (res.ok) {
				periods = periods.filter(p => p._id !== id);
			} else {
				toast.error('Failed to delete period');
			}
		} catch { toast.error('Failed to delete period'); }
	}

	async function updateShareList(/** @type {string[]} */ newList) {
		shareSaving = true;
		try {
			const res = await fetch('/api/fitness/period/share', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sharedWith: newList })
			});
			if (res.ok) {
				const data = await res.json();
				shareList = data.sharedWith;
			} else {
				toast.error('Failed to update sharing');
			}
		} catch { toast.error('Failed to update sharing'); }
		finally { shareSaving = false; }
	}

	function addShareUser() {
		const name = shareInput.trim().toLowerCase();
		if (!name || shareList.includes(name)) return;
		shareInput = '';
		updateShareList([...shareList, name]);
	}

	/** @param {string} name */
	function removeShareUser(name) {
		updateShareList(shareList.filter(u => u !== name));
	}

	const weekDays = $derived(
		lang === 'de'
			? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
			: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
	);
</script>

<section class="period-tracker" class:read-only={readOnly}>
	<h2>
		{t.period_tracker}
		{#if ownerName}
			<span class="shared-header" title={t.shared_from}>
				<ProfilePicture username={ownerName} size={20} />
				<span class="shared-name">{ownerName}</span>
			</span>
		{/if}
	</h2>

	<!-- Status card -->
	<div class="status-card">
		{#if ongoing}
			<div class="status-split">
				<div class="status-main">
					<span class="status-pill period-pill">{t.current_period}</span>
					<span class="status-hero ongoing-hero">{t.period_day} {ongoingDay}</span>
					{#if showProjection && predictions.predictedEndOfOngoing}
						<span class="status-detail">{t.predicted_end}</span>
						<span class="status-relative">{relativeDate(predictions.predictedEndOfOngoing)}</span>
						<span class="status-date">{formatDate(predictions.predictedEndOfOngoing)}</span>
					{/if}
					{#if showEntry && !readOnly}
						<button class="end-btn" onclick={endPeriod} disabled={loading}>
							<span class="end-btn-icon"><Check size={18} strokeWidth={2.5} /></span>
							<span class="end-btn-label">{t.end_period}</span>
						</button>
					{/if}
				</div>
				{#if showProjection && nextCycle}
					<div class="status-side">
						<div class="status-side-item ovulation-accent">
							<span class="status-side-label">{t.ovulation}</span>
							<span class="status-side-relative">{relativeDate(nextCycle.ovulation)}</span>
							<span class="status-side-date">{formatDate(nextCycle.ovulation)}</span>
						</div>
						<div class="status-side-item fertile-accent">
							<span class="status-side-label">{t.fertile}</span>
							<span class="status-side-date">{formatDate(nextCycle.fertileStart)} — {formatDate(nextCycle.fertileEnd)}</span>
						</div>
					</div>
				{/if}
			</div>
		{:else if showProjection && nextCycle}
			<div class="status-split">
				<div class="status-main">
					<span class="status-pill period-pill">{t.next_period}</span>
					<span class="status-hero">{relativeRange(nextCycle.start, nextCycle.end)}</span>
					<span class="status-date">{formatDate(nextCycle.start)} — {formatDate(nextCycle.end)}</span>
					{#if showEntry && !readOnly}
						<button class="start-btn" onclick={startPeriod} disabled={loading}>
							{t.start_period}
						</button>
					{/if}
				</div>
				<div class="status-side">
					<div class="status-side-item ovulation-accent">
						<span class="status-side-label">{t.ovulation}</span>
						<span class="status-side-relative">{relativeDate(nextCycle.ovulation)}</span>
						<span class="status-side-date">{formatDate(nextCycle.ovulation)}</span>
					</div>
					<div class="status-side-item fertile-accent">
						<span class="status-side-label">{t.fertile}</span>
						<span class="status-side-date">{formatDate(nextCycle.fertileStart)} — {formatDate(nextCycle.fertileEnd)}</span>
					</div>
				</div>
			</div>
		{:else if showEntry}
			<div class="status-block">
				<span class="status-empty">{sorted.length === 0 ? t.no_period_data : t.no_active_period}</span>
				{#if !readOnly}
					<button class="start-btn" onclick={startPeriod} disabled={loading}>
						{t.start_period}
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if showProjection}
	<!-- Calendar -->
	<div class="calendar">
		<div class="cal-header">
			<button class="cal-nav" onclick={() => calendarOffset--}>
				<ChevronLeft size={16} />
			</button>
			<span class="cal-title">{calendarLabel}</span>
			<button class="cal-nav" onclick={() => calendarOffset++} disabled={calendarOffset >= 12}>
				<ChevronRight size={16} />
			</button>
			{#if calendarOffset !== 0}
				<button class="go-today-btn" onclick={() => calendarOffset = 0}>{lang === 'de' ? 'Heute' : 'Today'}</button>
			{/if}
		</div>
		<div class="cal-weekdays">
			{#each weekDays as wd}
				<span class="cal-wd">{wd}</span>
			{/each}
		</div>
		<div class="cal-grid">
			{#each calendarDays as cell (cell.date)}
				{@const startable = canStartOn(cell)}
				<span
					class="cal-day"
					class:today={cell.date === todayStr}
					class:overflow={cell.overflow}
					class:startable
					class:on-active={cell.layers.active}
					{@attach startable && longPress(() => promptStartPeriodOn(cell.date))}
				>
					{#if cell.layers.predicted}<i class="band band-pred p-{cell.pos.predicted}"></i>{/if}
					{#if cell.layers.active}<i class="band band-active p-{cell.pos.active}"></i>{/if}
					{#if cell.layers.luteal}<i class="band band-luteal p-{cell.pos.luteal}"></i>{/if}
					{#if cell.layers.fertile}<i class="band band-fertile p-{cell.pos.fertile}"></i>{/if}
					{#if cell.layers.inner}<i class="band band-inner p-{cell.pos.inner}"></i>{/if}
					{#if cell.layers.ov}<i class="band band-ov p-solo"></i>{/if}
					<span class="cal-num">{cell.day}</span>
				</span>
			{/each}
		</div>
		<div class="cal-legend">
			<span class="legend-item"><span class="legend-dot period"></span> {lang === 'de' ? 'Periode' : 'Period'}</span>
			<span class="legend-item"><span class="legend-dot predicted"></span> {lang === 'de' ? 'Prognose' : 'Predicted'}</span>
			<span class="legend-item"><span class="legend-dot fertile"></span> {t.fertile}</span>
			<span class="legend-item"><span class="legend-dot peak-fertile"></span> {t.peak_fertility}</span>
			<span class="legend-item"><span class="legend-dot ovulation"></span> {t.ovulation}</span>
			<span class="legend-item"><span class="legend-dot luteal"></span> {t.luteal_phase}</span>
		</div>
	</div>

	{/if}

	{#if showProjection && completed.length >= 2}
		<div class="cycle-stats">
			<div class="cycle-stat">
				<span class="cycle-stat-label">{t.cycle_length}</span>
				<span class="cycle-stat-value">{Math.round(predictions.avgCycle)} {t.days}</span>
				{#if predictions.cycleSd > 0}
					<span class="cycle-stat-variance">± {predictions.cycleSd} {t.days} ({t.typical})</span>
				{/if}
				{#if predictions.lastCycleLength}
					<span class="cycle-stat-sub">{t.last_cycle}: {predictions.lastCycleLength} {t.days}</span>
				{/if}
			</div>
			<div class="cycle-stat">
				<span class="cycle-stat-label">{t.period_length}</span>
				<span class="cycle-stat-value">{Math.round(predictions.avgPeriod)} {t.days}</span>
				{#if predictions.periodSd > 0}
					<span class="cycle-stat-variance">± {predictions.periodSd} {t.days} ({t.typical})</span>
				{/if}
				{#if predictions.lastPeriodLength}
					<span class="cycle-stat-sub">{t.last_period}: {predictions.lastPeriodLength} {t.days}</span>
				{/if}
			</div>
		</div>
	{/if}

	{#if showProjection && insights.length > 0}
		<div class="cycle-insights">
			<h3 class="insights-title">{t.insights_title}</h3>
			{#each insights as ins (ins.id)}
				<div class="insight insight-{ins.level}">
					<span class="insight-title">{ins.title}</span>
					<p class="insight-body">{ins.body}</p>
					<a class="insight-source" href={ins.source.url} target="_blank" rel="noopener noreferrer">{t.insight_source}: {ins.source.label}</a>
				</div>
			{/each}
			<p class="insights-disclaimer">{t.insights_disclaimer}</p>
		</div>
	{/if}

	{#if showEntry && !readOnly}
		<!-- History + Share row -->
		{#if sorted.length > 0}
			<div class="history">
				<div class="history-share-row">
					<button class="history-toggle" onclick={() => showHistory = !showHistory}>
						<h3>{t.history}</h3>
						<ChevronRight size={14} class={showHistory ? 'chevron open' : 'chevron'} />
					</button>
					{#if !ownerName}
					<div class="share-bar">
						{#if shareList.length > 0}
							<div class="shared-avatars">
								<span class="shared-label">{t.shared_with}</span>
								{#each shareList as user}
									<div class="shared-avatar" title={user}>
										<ProfilePicture username={user} size={28} />
									</div>
								{/each}
							</div>
						{/if}
						<button class="share-btn" onclick={() => showShare = true} aria-label={t.share}>
							<UserPlus size={16} />
						</button>
					</div>
					{/if}
				</div>

				{#if showHistory}
					<div class="history-header">
						<button class="add-past-btn" onclick={() => showAddForm = !showAddForm}>
							<Plus size={14} />
							{t.add_past_period}
						</button>
					</div>

					{#if showAddForm}
						<div class="add-form">
							<div class="add-row">
								<label>
									{t.period_start}
									<DatePicker bind:value={addStart} max={todayStr} {lang} />
								</label>
								<label>
									{t.period_end}
									<DatePicker bind:value={addEnd} min={addStart} max={todayStr} {lang} />
								</label>
							</div>
							<div class="add-actions">
								<button class="save-btn" onclick={addPastPeriod} disabled={!addStart || loading}>
									{t.save}
								</button>
								<button class="cancel-btn" onclick={() => { showAddForm = false; addStart = ''; addEnd = ''; }}>
									{t.cancel}
								</button>
							</div>
						</div>
					{/if}

					<div class="history-list">
					{#each sorted as p, i (p._id)}
						{#if editId === p._id}
							<div class="history-item editing">
								<div class="add-row">
									<label>
										{t.period_start}
										<DatePicker bind:value={editStart} {lang} />
									</label>
									<label>
										{t.period_end}
										<DatePicker bind:value={editEnd} min={editStart} {lang} />
									</label>
								</div>
								<div class="add-actions">
									<button class="save-btn" onclick={saveEdit} disabled={!editStart || loading}>
										{t.save}
									</button>
									<button class="cancel-btn" onclick={cancelEdit}>
										{t.cancel}
									</button>
								</div>
							</div>
						{:else}
							<div class="history-item">
								<div class="history-info">
									<span class="history-dates">
										{formatDate(p.startDate)}
										{#if p.endDate}
											— {formatDate(p.endDate)}
										{:else}
											<span class="ongoing-badge">{t.ongoing}</span>
										{/if}
									</span>
									{#if p.endDate}
										{@const dur = Math.round((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / 86400000) + 1}
										<span class="history-dur">{dur} {t.days}</span>
									{/if}
								</div>
								<div class="history-actions">
									<button class="icon-btn edit" onclick={() => startEdit(p)} aria-label="Edit">
										<Pencil size={14} />
									</button>
									<button class="icon-btn delete" onclick={() => deletePeriod(p._id)} aria-label="Delete">
										<Trash2 size={14} />
									</button>
								</div>
							</div>
						{/if}
						{#if i < sorted.length - 1}
							{@const cyc = Math.round((new Date(p.startDate).getTime() - new Date(sorted[i + 1].startDate).getTime()) / 86400000)}
							{#if cyc > 0 && cyc < 365}
								<div class="cycle-gap" title={t.cycle_length}>
									<span class="cycle-gap-label">{t.cycle} · {cyc} {t.days}</span>
								</div>
							{/if}
						{/if}
					{/each}
				</div>
				{/if}
			</div>
		{:else}
			<div class="empty-state">
				<div class="share-bar">
					<p>{t.no_period_data}</p>
					{#if !ownerName}
					<button class="share-btn" onclick={() => showShare = true} aria-label={t.share}>
						<UserPlus size={16} />
					</button>
					{/if}
				</div>
				<button class="add-past-btn" onclick={() => showAddForm = !showAddForm}>
					<Plus size={14} />
					{t.add_past_period}
				</button>
				{#if showAddForm}
					<div class="add-form">
						<div class="add-row">
							<label>
								{t.period_start}
								<DatePicker bind:value={addStart} max={todayStr} {lang} />
							</label>
							<label>
								{t.period_end}
								<DatePicker bind:value={addEnd} min={addStart} max={todayStr} {lang} />
							</label>
						</div>
						<div class="add-actions">
							<button class="save-btn" onclick={addPastPeriod} disabled={!addStart || loading}>
								{t.save}
							</button>
							<button class="cancel-btn" onclick={() => { showAddForm = false; addStart = ''; addEnd = ''; }}>
								{t.cancel}
							</button>
						</div>
					</div>
				{/if}
			</div>
		{/if}

	{/if}
</section>

<!-- Share modal -->
{#if showShare}
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div class="share-overlay" onclick={() => showShare = false} onkeydown={(e) => e.key === 'Escape' && (showShare = false)}>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<div class="share-modal" role="presentation" onclick={(e) => e.stopPropagation()}>
			<div class="share-modal-header">
				<h3>{t.share}</h3>
				<button class="share-modal-close" onclick={() => showShare = false}>
					<X size={16} />
				</button>
			</div>
			{#if shareList.length > 0}
				<div class="share-user-list">
					{#each shareList as user}
						<div class="share-user">
							<ProfilePicture username={user} size={32} />
							<span class="share-username">{user}</span>
							<button class="chip-remove" onclick={() => removeShareUser(user)} disabled={shareSaving} aria-label="Remove {user}">
								<X size={12} />
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<span class="share-empty">{t.no_shared}</span>
			{/if}
			<form class="share-add" onsubmit={(e) => { e.preventDefault(); addShareUser(); }}>
				<input
					type="text"
					bind:value={shareInput}
					placeholder={t.add_user}
					disabled={shareSaving}
				/>
				<button type="submit" class="share-add-btn" disabled={!shareInput.trim() || shareSaving}>
					<Plus size={14} />
				</button>
			</form>
		</div>
	</div>
{/if}

<style>
	.period-tracker {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.period-tracker h2 {
		margin: 0;
		font-size: 1.1rem;
	}

	/* Status card — split columns */
	.status-card {
		background: var(--color-surface);
		border-radius: 10px;
		box-shadow: var(--shadow-sm);
		padding: 1rem 1.1rem;
	}
	.status-split {
		display: flex;
		gap: 1rem;
	}
	.status-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}
	.status-side {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding-left: 1rem;
		border-left: 1px solid var(--color-border);
		justify-content: center;
	}
	.status-block {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	/* Side items with colored left accent */
	.status-side-item {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding-left: 0.6rem;
		border-left: 3px solid transparent;
	}
	.status-side-item.ovulation-accent { border-left-color: var(--blue); }
	.status-side-item.fertile-accent { border-left-color: color-mix(in srgb, var(--blue) 40%, transparent); }

	.status-side-label {
		font-size: 0.6rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.status-side-relative {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-primary);
		white-space: nowrap;
	}
	.status-side-date {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	/* Main column labels */
	.status-pill {
		display: inline-block;
		align-self: flex-start;
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.15rem 0.5rem;
		border-radius: 10px;
	}
	.status-pill.period-pill {
		background: var(--nord11);
		color: white;
	}
	.status-label {
		font-size: 0.6rem;
		font-weight: 700;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.status-hero {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--color-text-primary);
		line-height: 1.25;
	}
	.status-hero.ongoing-hero {
		font-size: 1.5rem;
		color: var(--nord11);
	}
	.status-relative {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}
	.status-detail {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		font-weight: 500;
		margin-top: 0.2rem;
	}
	.status-date {
		font-size: 0.7rem;
		color: var(--color-text-tertiary);
	}
	.status-empty {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	.start-btn {
		padding: 0.45rem 0.9rem;
		border: none;
		border-radius: 7px;
		font-weight: 600;
		font-size: 0.75rem;
		cursor: pointer;
		white-space: nowrap;
		align-self: flex-start;
		margin-top: 0.6rem;
		background: var(--nord11);
		color: white;
	}
	.start-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Prominent end-period CTA — flat fill, full width */
	.end-btn {
		align-self: stretch;
		margin-top: 0.9rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		padding: 0.8rem 1.1rem;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		color: white;
		background: var(--nord11);
		box-shadow: var(--shadow-sm);
		transition: background 140ms ease;
		-webkit-tap-highlight-color: transparent;
	}
	.end-btn:hover {
		background: color-mix(in srgb, var(--nord11) 88%, black);
	}
	.end-btn:active {
		background: color-mix(in srgb, var(--nord11) 80%, black);
	}
	.end-btn:focus-visible {
		outline: 2px solid var(--nord11);
		outline-offset: 2px;
	}
	.end-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.end-btn-label {
		font-weight: 700;
		font-size: 0.85rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.end-btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	@media (max-width: 360px) {
		.status-split { flex-direction: column; gap: 0.6rem; }
		.status-side { border-left: none; padding-left: 0; border-top: 1px solid var(--color-border); padding-top: 0.6rem; flex-direction: row; gap: 1rem; }
	}

	/* Stats row */
	/* Calendar */
	.calendar {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 0.75rem;
	}
	.cal-header {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
		position: relative;
	}
	.go-today-btn {
		position: absolute;
		right: 0;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
		padding: 0.15rem 0.5rem;
		border-radius: 5px;
		cursor: pointer;
		transition: background 0.15s;
		-webkit-tap-highlight-color: transparent;
	}
	.go-today-btn:hover {
		background: color-mix(in srgb, var(--color-primary) 20%, transparent);
	}
	.cal-title {
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: capitalize;
	}
	.cal-nav {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-secondary);
		padding: 0.25rem;
		border-radius: 4px;
		display: flex;
	}
	.cal-nav:hover { color: var(--color-text-primary); }
	.cal-nav:disabled { opacity: 0.3; cursor: not-allowed; }

	.cal-weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		margin-bottom: 2px;
	}
	.cal-wd {
		text-align: center;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
	}
	.cal-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
	}
	.cal-day {
		height: 38px;
		text-align: center;
		font-size: 0.82rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-primary);
		position: relative;
		z-index: 0;
		box-sizing: border-box;
	}
	.cal-day.overflow { color: var(--color-text-tertiary); }
	.cal-num { position: relative; z-index: 5; }
	.cal-day.on-active .cal-num { color: #fff; }

	/* Long-press affordance: scale + colored ring grows during the hold. */
	.cal-day.startable {
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		-webkit-touch-callout: none;
		user-select: none;
		transition: transform 100ms ease-out, box-shadow 100ms ease-out;
	}
	.cal-day.startable.long-pressing {
		z-index: 2;
		border-radius: 999px;
		animation: longPressRing 600ms ease-out forwards;
	}
	@keyframes longPressRing {
		from {
			transform: scale(1);
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--nord11) 70%, transparent);
		}
		to {
			transform: scale(1.18);
			box-shadow: 0 0 0 4px color-mix(in srgb, var(--nord11) 70%, transparent);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cal-day.startable.long-pressing {
			animation: none;
			transform: scale(1.1);
			box-shadow: 0 0 0 3px color-mix(in srgb, var(--nord11) 70%, transparent);
		}
	}

	/* --- Nested cycle pills ---
	   Every phase is a same-height capsule band (top/bottom rules + rounded caps),
	   full cell width so equal-height fills tile seamlessly and wrap across weeks.
	   Inner layers paint over outer ones at the same height, so peak nests inside
	   fertile and ovulation inside peak; likewise the logged period nests inside the
	   predicted period. A band rounds an end only where its range truly ends. */
	.band {
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 0;
		right: 0;
		pointer-events: none;
		box-sizing: border-box;
	}
	.band.p-solo  { border-radius: 999px; }
	.band.p-start { border-radius: 999px 0 0 999px; }
	.band.p-mid   { border-radius: 0; }
	.band.p-end   { border-radius: 0 999px 999px 0; }

	/* Fertility: fertile outline (outer) → peak fill → ovulation (innermost). */
	.band-fertile {
		z-index: 1;
		border-top: 2px solid color-mix(in srgb, var(--blue) 60%, transparent);
		border-bottom: 2px solid color-mix(in srgb, var(--blue) 60%, transparent);
	}
	.band-fertile.p-start, .band-fertile.p-solo { border-left: 2px solid color-mix(in srgb, var(--blue) 60%, transparent); }
	.band-fertile.p-end, .band-fertile.p-solo { border-right: 2px solid color-mix(in srgb, var(--blue) 60%, transparent); }
	.band-inner {
		z-index: 2;
		background: color-mix(in srgb, var(--blue) 24%, var(--color-surface));
		border-top: 2px solid var(--blue);
		border-bottom: 2px solid var(--blue);
	}
	.band-inner.p-start, .band-inner.p-solo { border-left: 2px solid var(--blue); }
	.band-inner.p-end, .band-inner.p-solo { border-right: 2px solid var(--blue); }
	.band-ov { z-index: 3; background: var(--blue); }

	/* Menses: predicted period (dashed outer) with the logged period nested inside. */
	.band-pred {
		z-index: 1;
		background: color-mix(in srgb, var(--nord11) 12%, var(--color-surface));
		border-top: 1.5px dashed var(--nord11);
		border-bottom: 1.5px dashed var(--nord11);
	}
	.band-pred.p-start, .band-pred.p-solo { border-left: 1.5px dashed var(--nord11); }
	.band-pred.p-end, .band-pred.p-solo { border-right: 1.5px dashed var(--nord11); }
	.band-active { z-index: 2; background: var(--nord11); }

	/* Luteal: faint tail, the calmest band. */
	.band-luteal { z-index: 0; background: color-mix(in srgb, var(--orange) 16%, transparent); }

	/* Today marker — circle above the bands, behind the number. */
	.cal-day.today { font-weight: 700; z-index: 1; }
	.cal-day.today::after {
		content: '';
		position: absolute;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: var(--color-text-primary);
		z-index: 4;
	}
	/* Today's number is inverted against its circle — wins over .on-active white. */
	.cal-day.today .cal-num { color: var(--color-bg-primary); }

	/* Legend */
	.cal-legend {
		display: flex;
		gap: 0.5rem 0.8rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-top: 0.6rem;
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
	.legend-dot {
		width: 20px;
		height: 10px;
		border-radius: 5px;
		flex-shrink: 0;
	}
	.legend-dot.period { background: var(--nord11); }
	.legend-dot.predicted { background: color-mix(in srgb, var(--nord11) 12%, var(--color-surface)); border: 1.5px dashed var(--nord11); box-sizing: border-box; }
	.legend-dot.fertile { border: 2px solid color-mix(in srgb, var(--blue) 60%, transparent); box-sizing: border-box; }
	.legend-dot.peak-fertile { border: 2px solid var(--blue); box-sizing: border-box; background: color-mix(in srgb, var(--blue) 24%, var(--color-surface)); }
	.legend-dot.ovulation { width: 12px; height: 10px; border-radius: 5px; background: var(--blue); }
	.legend-dot.luteal { background: color-mix(in srgb, var(--orange) 16%, transparent); }

	/* Cycle stats */
	.cycle-stats {
		display: flex;
		gap: 0.6rem;
	}
	.cycle-stat {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.6rem;
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
	}
	.cycle-stat-label {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.cycle-stat-value {
		font-size: 1.1rem;
		font-weight: 700;
	}
	.cycle-stat-variance {
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--color-text-secondary);
	}
	.cycle-stat-sub {
		font-size: 0.72rem;
		font-weight: 400;
		color: var(--color-text-tertiary);
	}

	/* Cycle insights */
	.cycle-insights {
		margin-top: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.insights-title {
		margin: 0;
		font-size: 0.95rem;
		color: var(--color-text-primary);
	}
	.insight {
		background: var(--color-surface);
		border-left: 3px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.7rem 0.85rem;
		box-shadow: var(--shadow-sm);
	}
	.insight-positive { border-left-color: var(--green); }
	.insight-info { border-left-color: var(--blue); }
	.insight-attention { border-left-color: var(--orange); }
	.insight-title {
		display: block;
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--color-text-primary);
		margin-bottom: 0.25rem;
	}
	.insight-body {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--color-text-secondary);
	}
	.insight-source {
		display: inline-block;
		margin-top: 0.45rem;
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
		text-decoration: underline;
	}
	.insight-source:hover { color: var(--color-primary); }
	.insights-disclaimer {
		margin: 0.15rem 0 0;
		font-size: 0.72rem;
		font-style: italic;
		line-height: 1.45;
		color: var(--color-text-tertiary);
	}

	/* History */
	.history-share-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.history-toggle {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		color: inherit;
	}
	.history-toggle h3 {
		margin: 0;
		font-size: 0.95rem;
	}
	.history-toggle :global(.chevron) {
		transition: transform 0.2s;
	}
	.history-toggle :global(.chevron.open) {
		transform: rotate(90deg);
	}
	.history h3 {
		margin: 0;
		font-size: 0.95rem;
	}
	.history-header {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.add-past-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		font-size: 0.7rem;
		padding: 0.3rem 0.5rem;
		cursor: pointer;
	}
	.add-past-btn:hover {
		border-color: var(--color-text-primary);
		color: var(--color-text-primary);
	}

	.add-form {
		background: var(--color-bg-tertiary);
		border-radius: 8px;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
	}
	.add-row {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}
	.add-row label {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.add-actions {
		display: flex;
		gap: 0.5rem;
	}
	.save-btn {
		padding: 0.35rem 0.75rem;
		background: var(--nord11);
		color: white;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.75rem;
		cursor: pointer;
	}
	.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
	.cancel-btn {
		padding: 0.35rem 0.75rem;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		cursor: pointer;
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	/* Cycle length between consecutive entries (start-to-start). */
	.cycle-gap {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}
	.cycle-gap::before,
	.cycle-gap::after {
		content: '';
		flex: 0 0 28px;
		height: 1px;
		background: var(--color-border);
	}
	.cycle-gap-label {
		font-size: 0.68rem;
		color: var(--color-text-tertiary);
		white-space: nowrap;
	}
	.history-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 0.5rem 0.75rem;
	}
	.history-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.history-dates {
		font-size: 0.8rem;
		font-weight: 600;
	}
	.history-dur {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
	}
	.ongoing-badge {
		display: inline-block;
		margin-left: 0.4rem;
		padding: 0.1rem 0.4rem;
		background: var(--nord11);
		color: white;
		border-radius: 4px;
		font-size: 0.65rem;
		font-weight: 600;
		vertical-align: middle;
	}

	.history-actions {
		display: flex;
		gap: 0.3rem;
		flex-shrink: 0;
	}
	.history-item.editing {
		flex-direction: column;
		gap: 0.4rem;
	}
	.icon-btn {
		background: none;
		border: 1px solid transparent;
		border-radius: 6px;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.3rem;
		display: flex;
		opacity: 0.5;
	}
	.icon-btn:hover {
		opacity: 1;
	}
	.icon-btn.edit:hover {
		border-color: var(--blue);
		color: var(--blue);
	}
	.icon-btn.delete:hover {
		border-color: var(--nord11);
		color: var(--nord11);
	}

	.empty-state {
		text-align: center;
		padding: 1rem;
	}
	.empty-state p {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin: 0 0 0.75rem;
	}
	.empty-state .add-past-btn {
		margin: 0 auto 0.5rem;
	}

	/* Share bar (below stats) */
	.share-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.shared-avatars {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.shared-label {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		margin-right: 0.2rem;
	}
	.shared-avatar {
		border-radius: 50%;
		box-shadow: 0 0 0 2px var(--color-surface);
	}
	.shared-avatar + .shared-avatar {
		margin-left: -6px;
	}
	.share-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.4rem;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 50%;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.share-btn:hover {
		border-color: var(--blue);
		color: var(--blue);
	}

	/* Share modal */
	.share-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.share-modal {
		background: var(--color-surface);
		border-radius: 12px;
		box-shadow: var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.2));
		padding: 1rem;
		width: min(90vw, 320px);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.share-modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.share-modal-header h3 {
		margin: 0;
		font-size: 1rem;
	}
	.share-modal-close {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-secondary);
		padding: 0.2rem;
		display: flex;
	}
	.share-modal-close:hover { color: var(--color-text-primary); }
	.share-user-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.share-user {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0;
	}
	.share-username {
		flex: 1;
		font-size: 0.85rem;
		font-weight: 500;
	}
	.chip-remove {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-secondary);
		padding: 0.2rem;
		display: flex;
		border-radius: 50%;
	}
	.chip-remove:hover { color: var(--nord11); background: var(--color-bg-tertiary); }
	.chip-remove:disabled { opacity: 0.4; cursor: not-allowed; }
	.share-empty {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		text-align: center;
		padding: 0.5rem 0;
	}
	.share-add {
		display: flex;
		gap: 0.35rem;
	}
	.share-add input {
		flex: 1;
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font-size: 0.85rem;
	}
	.share-add input:focus {
		outline: none;
		border-color: var(--blue);
	}
	.share-add-btn {
		display: flex;
		align-items: center;
		padding: 0.4rem;
		background: var(--blue);
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}
	.share-add-btn:disabled { opacity: 0.4; cursor: not-allowed; }

	/* Shared header (read-only) */
	.shared-header {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.15rem 0.5rem 0.15rem 0.2rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		vertical-align: middle;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}
	.shared-name {
		white-space: nowrap;
	}

	/* Read-only mode */
	.read-only h2 {
		font-size: 0.95rem;
		color: var(--color-text-secondary);
	}
</style>
