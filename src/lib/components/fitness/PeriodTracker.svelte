<script>
	import { t } from '$lib/js/fitnessI18n';
	import { Trash2, Plus, Pencil, UserPlus, X, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import { toast } from '$lib/js/toast.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';

	/**
	 * @type {{ periods: any[], lang: 'en' | 'de', sharedWith?: string[], readOnly?: boolean, ownerName?: string }}
	 */
	let { periods: initialPeriods = [], lang = 'en', sharedWith: initialSharedWith = [], readOnly = false, ownerName = '' } = $props();

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
		const toWord = t('to', lang);

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

	// EMA predictions (α = 0.3, population priors: 29-day cycle, 5-day period)
	const predictions = $derived.by(() => {
		const alpha = 0.3;
		let emaCycle = 29;
		let emaPeriod = 5;

		/** @type {number[]} */
		const cycleLengths = [];
		/** @type {number[]} */
		const periodLengths = [];

		for (let i = 0; i < completed.length; i++) {
			const p = completed[i];
			const start = new Date(p.startDate);
			const end = new Date(p.endDate);
			const dur = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
			emaPeriod = alpha * dur + (1 - alpha) * emaPeriod;
			periodLengths.push(dur);

			if (i > 0) {
				const prevStart = new Date(completed[i - 1].startDate);
				const cycle = Math.round((start.getTime() - prevStart.getTime()) / 86400000);
				if (cycle > 0 && cycle < 60) {
					emaCycle = alpha * cycle + (1 - alpha) * emaCycle;
					cycleLengths.push(cycle);
				}
			}
		}

		/** 95% CI half-width: 1.96 * s / √n */
		/** @param {number[]} arr */
		function ci95(arr) {
			if (arr.length < 2) return 0;
			const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
			const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (arr.length - 1);
			return Math.round(1.96 * Math.sqrt(variance / arr.length) * 10) / 10;
		}

		const cycleVariance = ci95(cycleLengths);
		const periodVariance = ci95(periodLengths);

		// Predict ongoing end
		let predictedEndOfOngoing = null;
		if (ongoing) {
			const ongoingStart = new Date(ongoing.startDate);
			predictedEndOfOngoing = new Date(ongoingStart.getTime() + (Math.round(emaPeriod) - 1) * 86400000);
		}

		// Generate future predicted cycles (12 cycles ≈ ~1 year)
		const cycleMs = Math.round(emaCycle) * 86400000;
		const periodMs = (Math.round(emaPeriod) - 1) * 86400000;
		const lutealLength = 14;
		const lastStart = sorted[0] ? new Date(sorted[0].startDate) : null;

		/** @type {{ start: Date, end: Date, fertileStart: Date, fertileEnd: Date, peakStart: Date, lutealStart: Date, lutealEnd: Date }[]} */
		const futureCycles = [];
		if (lastStart) {
			let base = lastStart.getTime();
			for (let i = 0; i < 12; i++) {
				const start = new Date(base + cycleMs);
				const end = new Date(start.getTime() + periodMs);
				const ov = new Date(start.getTime() - lutealLength * 86400000);
				// Luteal phase: day after ovulation until day before next period
				const lutealStart = new Date(ov.getTime() + 86400000);
				const lutealEnd = new Date(start.getTime() - 86400000);
				futureCycles.push({
					start, end,
					fertileStart: new Date(ov.getTime() - 5 * 86400000),
					fertileEnd: ov,
					peakStart: new Date(ov.getTime() - 2 * 86400000),
					lutealStart,
					lutealEnd
				});
				base = start.getTime();
			}
		}

		// Past fertility/luteal windows (from completed cycles)
		/** @type {{ fertileStart: Date, fertileEnd: Date, peakStart: Date, lutealStart: Date, lutealEnd: Date }[]} */
		const pastFertileWindows = [];
		for (let i = 1; i < completed.length; i++) {
			const nextPeriodStart = new Date(completed[i].startDate);
			const ov = new Date(nextPeriodStart.getTime() - lutealLength * 86400000);
			pastFertileWindows.push({
				fertileStart: new Date(ov.getTime() - 5 * 86400000),
				fertileEnd: ov,
				peakStart: new Date(ov.getTime() - 2 * 86400000),
				lutealStart: new Date(ov.getTime() + 86400000),
				lutealEnd: new Date(nextPeriodStart.getTime() - 86400000)
			});
		}

		return {
			avgCycle: Math.round(emaCycle * 10) / 10,
			avgPeriod: Math.round(emaPeriod * 10) / 10,
			cycleVariance,
			periodVariance,
			predictedEndOfOngoing,
			futureCycles,
			pastFertileWindows
		};
	});

	// First future cycle (for status display)
	const nextCycle = $derived(predictions.futureCycles[0] ?? null);

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

		// Build raw cells with status, including overflow days from adjacent months
		/** @type {({ day: number, date: string, status: string, pos: string, edges: string, overflow?: boolean } | null)[]} */
		const cells = [];

		// Previous month overflow
		if (startDay > 0) {
			const prevLast = new Date(year, month, 0); // last day of previous month
			for (let i = startDay - 1; i >= 0; i--) {
				const d = prevLast.getDate() - i;
				const pm = new Date(year, month - 1, d);
				const date = fmtLocal(pm);
				cells.push({ day: d, date, status: getDayStatus(date), pos: '', edges: '', overflow: true });
			}
		}

		// Current month
		for (let d = 1; d <= last.getDate(); d++) {
			const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			cells.push({ day: d, date, status: getDayStatus(date), pos: '', edges: '' });
		}

		// Next month overflow to complete the last row
		const remainder = cells.length % 7;
		if (remainder > 0) {
			const fill = 7 - remainder;
			for (let d = 1; d <= fill; d++) {
				const nm = new Date(year, month + 1, d);
				const date = fmtLocal(nm);
				cells.push({ day: d, date, status: getDayStatus(date), pos: '', edges: '', overflow: true });
			}
		}

		// Status grouping: these flow into each other without rounding at boundaries
		/** @param {string} s */
		function statusGroup(s) {
			if (s === 'fertile' || s === 'peak-fertile' || s === 'ovulation') return 'fertility';
			return s;
		}

		// Sub-grouping: peak-fertile and ovulation form one pill
		/** @param {string} s */
		function posGroup(s) {
			if (s === 'peak-fertile' || s === 'ovulation') return 'peak';
			return s;
		}

		// Compute range positions and edge flags
		// Position (border-radius): posGroup for left (peak-fertile+ovulation = one pill,
		//   but fertile is separate so peak-fertile gets rounded left cap next to fertile)
		//   statusGroup for right (fertile stays flat on right next to peak-fertile)
		// Edges (border sides): posGroup for left, statusGroup for right/up/down
		for (let i = 0; i < cells.length; i++) {
			const c = cells[i];
			if (!c || !c.status) continue;
			const g = statusGroup(c.status);
			const pg = posGroup(c.status);
			const col = i % 7;
			const leftSamePos = col > 0 && posGroup(cells[i - 1]?.status ?? '') === pg;
			const rightGroup = col < 6 && i + 1 < cells.length && statusGroup(cells[i + 1]?.status ?? '') === g;
			const upGroup = i >= 7 && statusGroup(cells[i - 7]?.status ?? '') === g;
			const downGroup = i + 7 < cells.length && statusGroup(cells[i + 7]?.status ?? '') === g;

			// Horizontal position for left/right rounding
			if (!leftSamePos && !rightGroup) c.pos = 'solo';
			else if (!leftSamePos) c.pos = 'start';
			else if (!rightGroup) c.pos = 'end';
			else c.pos = 'mid';

			// If range continues across row boundary (col 6 → col 0), flatten the corners
			// Right/next: statusGroup (fertile stays flat before peak-fertile)
			// Left/prev: posGroup (peak-fertile keeps rounded cap after fertile)
			const nextDaySameGroup = col === 6 && i + 1 < cells.length && statusGroup(cells[i + 1]?.status ?? '') === g;
			const prevDaySamePos = col === 0 && i - 1 >= 0 && posGroup(cells[i - 1]?.status ?? '') === pg;
			if (nextDaySameGroup) {
				if (c.pos === 'solo') c.pos = 'start';
				else if (c.pos === 'end') c.pos = 'mid';
			}
			if (prevDaySamePos) {
				if (c.pos === 'start') c.pos = 'mid';
				else if (c.pos === 'solo') c.pos = 'end';
			}

			// Edge flags for border rendering
			// Left: posGroup match (peak-fertile draws left border next to fertile)
			// Right/Up/Down: group match (borders flow within group)
			const edges = [];
			if (!upGroup) edges.push('et');
			if (!downGroup) edges.push('eb');
			// At col 0, also check cross-row prev day with posGroup
			const leftSameEdge = leftSamePos || prevDaySamePos;
			if (!leftSameEdge) edges.push('el');
			// At col 6, also check cross-row next day with statusGroup
			const rightSameEdge = rightGroup || nextDaySameGroup;
			if (!rightSameEdge) edges.push('er');
			c.edges = edges.join(' ');
		}

		return cells;
	});

	/** @param {string} dateStr */
	function getDayStatus(dateStr) {
		const d = parseLocal(dateStr);

		// Period days (actual)
		for (const p of periods) {
			const start = midnight(new Date(p.startDate));
			const end = p.endDate ? midnight(new Date(p.endDate)) : todayMidnight;
			if (d >= start && d <= end) return 'period';
		}

		// Predicted ongoing end
		if (ongoing && predictions.predictedEndOfOngoing) {
			const ongoingEnd = midnight(predictions.predictedEndOfOngoing);
			const ongoingStart = midnight(new Date(ongoing.startDate));
			if (d > todayMidnight && d >= ongoingStart && d <= ongoingEnd) return 'predicted';
		}

		// Future predicted cycles
		for (const c of predictions.futureCycles) {
			const cs = midnight(c.start);
			const ce = midnight(c.end);
			if (d >= cs && d <= ce) return 'predicted';
			const fe = midnight(c.fertileEnd);
			if (d === fe) return 'ovulation';
			const ps = midnight(c.peakStart);
			const fs = midnight(c.fertileStart);
			if (d >= ps && d < fe) return 'peak-fertile';
			if (d >= fs && d < ps) return 'fertile';
			const ls = midnight(c.lutealStart);
			const le = midnight(c.lutealEnd);
			if (d >= ls && d <= le) return 'luteal';
		}

		// Past fertility/luteal windows
		for (const w of predictions.pastFertileWindows) {
			const fe = midnight(w.fertileEnd);
			if (d === fe) return 'ovulation';
			const ps = midnight(w.peakStart);
			const fs = midnight(w.fertileStart);
			if (d >= ps && d < fe) return 'peak-fertile';
			if (d >= fs && d < ps) return 'fertile';
			const ls = midnight(w.lutealStart);
			const le = midnight(w.lutealEnd);
			if (d >= ls && d <= le) return 'luteal';
		}

		return '';
	}

	async function startPeriod() {
		loading = true;
		try {
			const res = await fetch('/api/fitness/period', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ startDate: new Date().toISOString() })
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
			const body = { startDate: new Date(addStart).toISOString() };
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
		if (!await confirm(t('delete_period_confirm', lang))) return;
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
		{#if readOnly && ownerName}
			<span class="shared-header">
				<ProfilePicture username={ownerName} size={24} />
				{ownerName}
			</span>
		{:else}
			{t('period_tracker', lang)}
		{/if}
	</h2>

	<!-- Status card -->
	<div class="status-card">
		{#if ongoing}
			<div class="status-split">
				<div class="status-main">
					<span class="status-pill period-pill">{t('current_period', lang)}</span>
					<span class="status-hero ongoing-hero">{t('period_day', lang)} {ongoingDay}</span>
					{#if predictions.predictedEndOfOngoing}
						<span class="status-detail">{t('predicted_end', lang)}</span>
						<span class="status-relative">{relativeDate(predictions.predictedEndOfOngoing)}</span>
						<span class="status-date">{formatDate(predictions.predictedEndOfOngoing)}</span>
					{/if}
					{#if !readOnly}
						<button class="end-btn" onclick={endPeriod} disabled={loading}>
							{t('end_period', lang)}
						</button>
					{/if}
				</div>
				{#if nextCycle}
					<div class="status-side">
						<div class="status-side-item ovulation-accent">
							<span class="status-side-label">{t('ovulation', lang)}</span>
							<span class="status-side-relative">{relativeDate(nextCycle.fertileEnd)}</span>
							<span class="status-side-date">{formatDate(nextCycle.fertileEnd)}</span>
						</div>
						<div class="status-side-item fertile-accent">
							<span class="status-side-label">{t('fertile', lang)}</span>
							<span class="status-side-date">{formatDate(nextCycle.fertileStart)} — {formatDate(nextCycle.fertileEnd)}</span>
						</div>
					</div>
				{/if}
			</div>
		{:else if nextCycle}
			<div class="status-split">
				<div class="status-main">
					<span class="status-pill period-pill">{t('next_period', lang)}</span>
					<span class="status-hero">{relativeRange(nextCycle.start, nextCycle.end)}</span>
					<span class="status-date">{formatDate(nextCycle.start)} — {formatDate(nextCycle.end)}</span>
					{#if !readOnly}
						<button class="start-btn" onclick={startPeriod} disabled={loading}>
							{t('start_period', lang)}
						</button>
					{/if}
				</div>
				<div class="status-side">
					<div class="status-side-item ovulation-accent">
						<span class="status-side-label">{t('ovulation', lang)}</span>
						<span class="status-side-relative">{relativeDate(nextCycle.fertileEnd)}</span>
						<span class="status-side-date">{formatDate(nextCycle.fertileEnd)}</span>
					</div>
					<div class="status-side-item fertile-accent">
						<span class="status-side-label">{t('fertile', lang)}</span>
						<span class="status-side-date">{formatDate(nextCycle.fertileStart)} — {formatDate(nextCycle.fertileEnd)}</span>
					</div>
				</div>
			</div>
		{:else}
			<div class="status-block">
				<span class="status-empty">{t('no_period_data', lang)}</span>
				{#if !readOnly}
					<button class="start-btn" onclick={startPeriod} disabled={loading}>
						{t('start_period', lang)}
					</button>
				{/if}
			</div>
		{/if}
	</div>

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
			{#each calendarDays as cell}
				<span
					class="cal-day {cell.status ? `s-${cell.status}` : ''} {cell.pos ? `p-${cell.pos}` : ''} {cell.edges}"
					class:today={cell.date === todayStr}
					class:overflow={cell.overflow}
				>{cell.day}</span>
			{/each}
		</div>
		<div class="cal-legend">
			<span class="legend-item"><span class="legend-dot period"></span> {lang === 'de' ? 'Periode' : 'Period'}</span>
			<span class="legend-item"><span class="legend-dot predicted"></span> {lang === 'de' ? 'Prognose' : 'Predicted'}</span>
			<span class="legend-item"><span class="legend-dot fertile"></span> {t('fertile', lang)}</span>
			<span class="legend-item"><span class="legend-dot peak-fertile"></span> {t('peak_fertility', lang)}</span>
			<span class="legend-item"><span class="legend-dot ovulation"></span> {t('ovulation', lang)}</span>
			<span class="legend-item"><span class="legend-dot luteal"></span> {t('luteal_phase', lang)}</span>
		</div>
	</div>

	{#if completed.length >= 2}
		<div class="cycle-stats">
			<div class="cycle-stat">
				<span class="cycle-stat-label">{t('cycle_length', lang)}</span>
				<span class="cycle-stat-value">{Math.round(predictions.avgCycle)} {t('days', lang)}</span>
				{#if predictions.cycleVariance > 0}
					<span class="cycle-stat-variance">± {predictions.cycleVariance} {t('days', lang)} (95% CI)</span>
				{/if}
			</div>
			<div class="cycle-stat">
				<span class="cycle-stat-label">{t('period_length', lang)}</span>
				<span class="cycle-stat-value">{Math.round(predictions.avgPeriod)} {t('days', lang)}</span>
				{#if predictions.periodVariance > 0}
					<span class="cycle-stat-variance">± {predictions.periodVariance} {t('days', lang)} (95% CI)</span>
				{/if}
			</div>
		</div>
	{/if}

	{#if !readOnly}
		<!-- History + Share row -->
		{#if sorted.length > 0}
			<div class="history">
				<div class="history-share-row">
					<button class="history-toggle" onclick={() => showHistory = !showHistory}>
						<h3>{t('history', lang)}</h3>
						<ChevronRight size={14} class={showHistory ? 'chevron open' : 'chevron'} />
					</button>
					<div class="share-bar">
						{#if shareList.length > 0}
							<div class="shared-avatars">
								<span class="shared-label">{t('shared_with', lang)}</span>
								{#each shareList as user}
									<div class="shared-avatar" title={user}>
										<ProfilePicture username={user} size={28} />
									</div>
								{/each}
							</div>
						{/if}
						<button class="share-btn" onclick={() => showShare = true} aria-label={t('share', lang)}>
							<UserPlus size={16} />
						</button>
					</div>
				</div>

				{#if showHistory}
					<div class="history-header">
						<button class="add-past-btn" onclick={() => showAddForm = !showAddForm}>
							<Plus size={14} />
							{t('add_past_period', lang)}
						</button>
					</div>

					{#if showAddForm}
						<div class="add-form">
							<div class="add-row">
								<label>
									{t('period_start', lang)}
									<DatePicker bind:value={addStart} max={todayStr} {lang} />
								</label>
								<label>
									{t('period_end', lang)}
									<DatePicker bind:value={addEnd} min={addStart} max={todayStr} {lang} />
								</label>
							</div>
							<div class="add-actions">
								<button class="save-btn" onclick={addPastPeriod} disabled={!addStart || loading}>
									{t('save', lang)}
								</button>
								<button class="cancel-btn" onclick={() => { showAddForm = false; addStart = ''; addEnd = ''; }}>
									{t('cancel', lang)}
								</button>
							</div>
						</div>
					{/if}

					<div class="history-list">
					{#each sorted as p (p._id)}
						{#if editId === p._id}
							<div class="history-item editing">
								<div class="add-row">
									<label>
										{t('period_start', lang)}
										<DatePicker bind:value={editStart} {lang} />
									</label>
									<label>
										{t('period_end', lang)}
										<DatePicker bind:value={editEnd} min={editStart} {lang} />
									</label>
								</div>
								<div class="add-actions">
									<button class="save-btn" onclick={saveEdit} disabled={!editStart || loading}>
										{t('save', lang)}
									</button>
									<button class="cancel-btn" onclick={cancelEdit}>
										{t('cancel', lang)}
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
											<span class="ongoing-badge">{t('ongoing', lang)}</span>
										{/if}
									</span>
									{#if p.endDate}
										{@const dur = Math.round((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / 86400000) + 1}
										<span class="history-dur">{dur} {t('days', lang)}</span>
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
					{/each}
				</div>
				{/if}
			</div>
		{:else}
			<div class="empty-state">
				<div class="share-bar">
					<p>{t('no_period_data', lang)}</p>
					<button class="share-btn" onclick={() => showShare = true} aria-label={t('share', lang)}>
						<UserPlus size={16} />
					</button>
				</div>
				<button class="add-past-btn" onclick={() => showAddForm = !showAddForm}>
					<Plus size={14} />
					{t('add_past_period', lang)}
				</button>
				{#if showAddForm}
					<div class="add-form">
						<div class="add-row">
							<label>
								{t('period_start', lang)}
								<DatePicker bind:value={addStart} max={todayStr} {lang} />
							</label>
							<label>
								{t('period_end', lang)}
								<DatePicker bind:value={addEnd} min={addStart} max={todayStr} {lang} />
							</label>
						</div>
						<div class="add-actions">
							<button class="save-btn" onclick={addPastPeriod} disabled={!addStart || loading}>
								{t('save', lang)}
							</button>
							<button class="cancel-btn" onclick={() => { showAddForm = false; addStart = ''; addEnd = ''; }}>
								{t('cancel', lang)}
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
				<h3>{t('share', lang)}</h3>
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
				<span class="share-empty">{t('no_shared', lang)}</span>
			{/if}
			<form class="share-add" onsubmit={(e) => { e.preventDefault(); addShareUser(); }}>
				<input
					type="text"
					bind:value={shareInput}
					placeholder={t('add_user', lang)}
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

	.start-btn, .end-btn {
		padding: 0.45rem 0.9rem;
		border: none;
		border-radius: 7px;
		font-weight: 600;
		font-size: 0.75rem;
		cursor: pointer;
		white-space: nowrap;
		align-self: flex-start;
		margin-top: 0.6rem;
	}
	.start-btn {
		background: var(--nord11);
		color: white;
	}
	.end-btn {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
	}
	.start-btn:disabled, .end-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
		box-sizing: border-box;
	}
	.cal-day.overflow { color: var(--color-text-tertiary); }

	/* --- Range shape: border-radius per position --- */
	.cal-day.p-solo { border-radius: 16px; }
	.cal-day.p-start { border-radius: 16px 0 0 16px; }
	.cal-day.p-mid { border-radius: 0; }
	.cal-day.p-end { border-radius: 0 16px 16px 0; }

	/* --- Filled statuses (background-based, border matches fill) --- */
	.cal-day.s-period { background: var(--nord11); color: white; font-weight: 600; }
	.cal-day.s-ovulation { border: 0 solid var(--blue); font-weight: 700; background: color-mix(in srgb, var(--blue) 15%, transparent); }
	.cal-day.s-ovulation.et { border-top-width: 3px; }
	.cal-day.s-ovulation.eb { border-bottom-width: 3px; }
	.cal-day.s-ovulation.el { border-left-width: 3px; }
	.cal-day.s-ovulation.er { border-right-width: 3px; }
	.cal-day.s-ovulation::before {
		content: '';
		position: absolute;
		bottom: 4px;
		left: 50%;
		transform: translateX(-50%);
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--blue);
	}
	.cal-day.s-luteal::before {
		content: '';
		position: absolute;
		bottom: 4px;
		left: 50%;
		transform: translateX(-50%);
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--orange);
		opacity: 0.5;
	}

	/* --- Bordered statuses: width 0 by default, edge classes set per-side width --- */
	.cal-day.s-fertile { border: 0 solid var(--blue); }
	.cal-day.s-fertile.et { border-top-width: 2px; }
	.cal-day.s-fertile.eb { border-bottom-width: 2px; }
	.cal-day.s-fertile.el { border-left-width: 2px; }
	.cal-day.s-fertile.er { border-right-width: 2px; }

	.cal-day.s-peak-fertile { border: 0 solid var(--blue); font-weight: 600; background: color-mix(in srgb, var(--blue) 15%, transparent); }
	.cal-day.s-peak-fertile.et { border-top-width: 3px; }
	.cal-day.s-peak-fertile.eb { border-bottom-width: 3px; }
	.cal-day.s-peak-fertile.el { border-left-width: 3px; }
	.cal-day.s-peak-fertile.er { border-right-width: 3px; }
	/* Extend fertile borders into peak-fertile's rounded corner gap.
	   Uses background gradients instead of borders to avoid subpixel rounding misalignment. */
	.cal-day.s-peak-fertile.p-start::before,
	.cal-day.s-peak-fertile.p-solo::before {
		content: '';
		position: absolute;
		left: -3px;
		top: 0;
		bottom: 0;
		width: 16px;
		pointer-events: none;
	}
	.cal-day.s-peak-fertile.p-start.et::before,
	.cal-day.s-peak-fertile.p-solo.et::before {
		top: -3px;
	}
	.cal-day.s-peak-fertile.p-start.eb::before,
	.cal-day.s-peak-fertile.p-solo.eb::before {
		bottom: -3px;
	}
	.cal-day.s-peak-fertile.p-start.et.eb::before,
	.cal-day.s-peak-fertile.p-solo.et.eb::before {
		background:
			linear-gradient(var(--blue), var(--blue)) top    / 100% 2px no-repeat,
			linear-gradient(var(--blue), var(--blue)) bottom / 100% 2px no-repeat;
	}
	.cal-day.s-peak-fertile.p-start.et:not(.eb)::before,
	.cal-day.s-peak-fertile.p-solo.et:not(.eb)::before {
		background: linear-gradient(var(--blue), var(--blue)) top / 100% 2px no-repeat;
	}
	.cal-day.s-peak-fertile.p-start.eb:not(.et)::before,
	.cal-day.s-peak-fertile.p-solo.eb:not(.et)::before {
		background: linear-gradient(var(--blue), var(--blue)) bottom / 100% 2px no-repeat;
	}

	.cal-day.s-predicted { background: color-mix(in srgb, var(--nord11) 15%, transparent); border: 0 dashed var(--nord11); }
	.cal-day.s-predicted.et { border-top-width: 2px; }
	.cal-day.s-predicted.eb { border-bottom-width: 2px; }
	.cal-day.s-predicted.el { border-left-width: 2px; }
	.cal-day.s-predicted.er { border-right-width: 2px; }

	/* Today marker — inner dot so it doesn't clash with range bg */
	.cal-day.today { font-weight: 700; z-index: 1; }
	.cal-day.today::after {
		content: '';
		position: absolute;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--color-text-primary);
		z-index: -1;
	}
	.cal-day.today { color: var(--color-bg-primary); }

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
	.legend-dot.predicted { background: color-mix(in srgb, var(--nord11) 15%, transparent); border: 1.5px dashed var(--nord11); box-sizing: border-box; }
	.legend-dot.fertile { border: 2px solid var(--blue); box-sizing: border-box; }
	.legend-dot.peak-fertile { border: 3px solid var(--blue); box-sizing: border-box; background: color-mix(in srgb, var(--blue) 15%, transparent); }
	.legend-dot.ovulation { width: 8px; height: 8px; border-radius: 50%; background: var(--blue); }
	.legend-dot.luteal { width: 8px; height: 8px; border-radius: 50%; background: var(--orange); opacity: 0.5; }

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
	.add-row input {
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font-size: 0.8rem;
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
		gap: 0.4rem;
	}

	/* Read-only mode */
	.read-only h2 {
		font-size: 0.95rem;
		color: var(--color-text-secondary);
	}
</style>
