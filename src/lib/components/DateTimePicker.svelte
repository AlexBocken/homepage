<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Clock from '@lucide/svelte/icons/clock';
	import X from '@lucide/svelte/icons/x';
	import { m } from '$lib/js/commonI18n';
	import type { CommonLang } from '$lib/js/commonI18n';

	/**
	 * Pill-styled date + (optional) time picker. Built to share the look of
	 * `DatePicker.svelte` while operating on numeric `unix-ms` timestamps so it
	 * can be dropped into any `wp.timestamp: number | null` shaped store without
	 * an intermediate string conversion at every callsite.
	 *
	 * Features:
	 *   - `mode='date'` hides the time pill (useful for waypoints that don't
	 *     need a time anchor in their GPX export).
	 *   - `inheritedValue` lets a caller suggest a tentative default (e.g. the
	 *     nearest timestamped sibling's date). It's rendered in italic with a
	 *     dashed outline; an "Übernehmen" button commits it to the bound value.
	 *     User edits via the calendar, the time input, the day arrows, or any
	 *     nudge button also implicitly commit the inherited value.
	 *   - `nudgeMinutes` renders a row of ±N minute quick-adjust buttons. Only
	 *     shown when a value is set and `mode='datetime'`.
	 *   - `required` hides the clear button (e.g. first/last waypoint must keep
	 *     a timestamp for the export's interpolation to bind).
	 */
	interface Props {
		value: number | null | undefined;
		mode?: 'date' | 'datetime';
		inheritedValue?: number | null;
		nudgeMinutes?: number[];
		required?: boolean;
		lang?: CommonLang;
		min?: number | null;
		max?: number | null;
		/** Optional extra CSS class on the outer wrapper. */
		class?: string;
	}

	let {
		value = $bindable<number | null | undefined>(null),
		mode = 'datetime',
		inheritedValue = null,
		nudgeMinutes = [],
		required = false,
		lang = 'de',
		min = null,
		max = null,
		class: extraClass = ''
	}: Props = $props();

	const t = $derived(m[lang]);

	let open = $state(false);
	let pickerRef = $state<HTMLDivElement | null>(null);

	const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
	const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
	const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

	const weekdays = $derived(lang === 'de' ? WEEKDAYS_DE : WEEKDAYS_EN);
	const months = $derived(lang === 'de' ? MONTHS_DE : MONTHS_EN);

	// When the bound value is null but the caller supplied an inherited default,
	// the pill displays the inherited timestamp in "tentative" styling. The
	// `effective` getter is what every formatting/derived computation runs on.
	const effective = $derived<number | null>((value ?? inheritedValue) ?? null);
	const inheritedActive = $derived(value == null && inheritedValue != null);

	function pad(n: number): string {
		return n.toString().padStart(2, '0');
	}
	function toDateStr(ts: number | null): string {
		if (ts == null) return '';
		const d = new Date(ts);
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	}
	function toTimeStr(ts: number | null): string {
		if (ts == null) return '';
		const d = new Date(ts);
		return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	const dateStr = $derived(toDateStr(effective));
	const timeStr = $derived(toTimeStr(effective));
	const todayStr = new Date().toISOString().slice(0, 10);

	const dateLabel = $derived.by(() => {
		if (!dateStr) return t.select_date;
		if (dateStr === todayStr && lang in t) return t.today;
		const d = new Date(dateStr + 'T12:00:00');
		return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
			weekday: 'short', month: 'short', day: 'numeric'
		});
	});

	// Calendar view month — independent of selected value, updated when `value`
	// or the dropdown opens to follow the relevant month.
	let viewYear = $state(new Date().getFullYear());
	let viewMonth = $state(new Date().getMonth());
	$effect(() => {
		const ref = effective ?? Date.now();
		const d = new Date(ref);
		viewYear = d.getFullYear();
		viewMonth = d.getMonth();
	});

	function isDisabled(ts: number): boolean {
		if (min != null && ts < min) return true;
		if (max != null && ts > max) return true;
		return false;
	}

	function commit(ts: number | null) {
		if (ts != null && isDisabled(ts)) return;
		value = ts;
	}

	function buildTimestamp(date: string, time: string): number | null {
		if (!date) return null;
		const [y, m, d] = date.split('-').map((n) => parseInt(n, 10));
		if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
		let hh = 12, mm = 0;
		if (time) {
			const parts = time.split(':').map((n) => parseInt(n, 10));
			if (Number.isFinite(parts[0])) hh = parts[0];
			if (Number.isFinite(parts[1])) mm = parts[1];
		}
		return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
	}

	function selectDay(date: string) {
		// When committing, preserve the time-of-day of the current effective
		// value so picking a new date doesn't reset to noon and discard the
		// user's already-tuned time.
		commit(buildTimestamp(date, mode === 'datetime' ? timeStr || '12:00' : '12:00'));
		open = false;
	}

	function updateTimeInput(value: string) {
		if (!value) return;
		commit(buildTimestamp(dateStr || toDateStr(Date.now()), value));
	}

	function navDay(delta: number) {
		const ref = effective ?? Date.now();
		const d = new Date(ref);
		d.setDate(d.getDate() + delta);
		commit(d.getTime());
	}

	function navMonth(delta: number) {
		viewMonth += delta;
		if (viewMonth > 11) { viewMonth = 0; viewYear++; }
		if (viewMonth < 0) { viewMonth = 11; viewYear--; }
	}

	function nudge(deltaMin: number) {
		const base = effective;
		if (base == null) return;
		commit(base + deltaMin * 60_000);
	}

	function applyInherited() {
		if (inheritedValue == null) return;
		commit(inheritedValue);
	}

	function clear() {
		value = null;
		open = false;
	}

	function goNow() {
		commit(Date.now());
		open = false;
	}

	const calendarDays = $derived.by(() => {
		const first = new Date(viewYear, viewMonth, 1);
		let startDay = first.getDay() - 1;
		if (startDay < 0) startDay = 6;
		const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
		const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

		type Day = {
			date: string;
			day: number;
			currentMonth: boolean;
			isToday: boolean;
			isSelected: boolean;
			disabled: boolean;
		};
		const days: Day[] = [];

		const pushDay = (y: number, mo: number, d: number, currentMonth: boolean) => {
			const date = `${y}-${pad(mo + 1)}-${pad(d)}`;
			const ts = new Date(y, mo, d, 12, 0, 0, 0).getTime();
			days.push({
				date, day: d, currentMonth,
				isToday: date === todayStr,
				isSelected: date === dateStr && value != null,
				disabled: isDisabled(ts)
			});
		};

		for (let i = startDay - 1; i >= 0; i--) {
			const d = daysInPrevMonth - i;
			const mo = viewMonth === 0 ? 11 : viewMonth - 1;
			const y = viewMonth === 0 ? viewYear - 1 : viewYear;
			pushDay(y, mo, d, false);
		}
		for (let d = 1; d <= daysInMonth; d++) {
			pushDay(viewYear, viewMonth, d, true);
		}
		const remaining = 7 - (days.length % 7);
		if (remaining < 7) {
			for (let d = 1; d <= remaining; d++) {
				const mo = viewMonth === 11 ? 0 : viewMonth + 1;
				const y = viewMonth === 11 ? viewYear + 1 : viewYear;
				pushDay(y, mo, d, false);
			}
		}
		return days;
	});

	function handleClickOutside(e: MouseEvent) {
		if (pickerRef && e.target instanceof Node && !pickerRef.contains(e.target)) {
			open = false;
		}
	}
	$effect(() => {
		if (open) {
			document.addEventListener('pointerdown', handleClickOutside);
			return () => document.removeEventListener('pointerdown', handleClickOutside);
		}
	});

	const negativeNudges = $derived(
		[...nudgeMinutes].filter((n) => n < 0).sort((a, b) => a - b)
	);
	const positiveNudges = $derived(
		[...nudgeMinutes].filter((n) => n > 0).sort((a, b) => a - b)
	);
	const showNudge = $derived(
		mode === 'datetime' && effective != null && nudgeMinutes.length > 0
	);
	const showClear = $derived(!required && value != null);
</script>

<div class="dtp {extraClass}" bind:this={pickerRef}>
	<div class="dtp-pill" class:inherited={inheritedActive} class:empty={effective == null}>
		<button type="button" class="dtp-arrow" onclick={() => navDay(-1)} aria-label="-1d">
			<ChevronLeft size={16} />
		</button>
		<button type="button" class="dtp-display" onclick={() => (open = !open)}>
			<Calendar size={14} />
			<span class="dtp-date-label">{dateLabel}</span>
		</button>
		<button type="button" class="dtp-arrow" onclick={() => navDay(1)} aria-label="+1d">
			<ChevronRight size={16} />
		</button>
		{#if mode === 'datetime'}
			{#if showNudge && negativeNudges.length > 0}
				<div class="dtp-nudge dtp-nudge-neg" role="group" aria-label={t.select_time}>
					{#each negativeNudges as delta (delta)}
						<button type="button" onclick={() => nudge(delta)}>
							−{Math.abs(delta)}
						</button>
					{/each}
				</div>
			{/if}
			<label class="dtp-time" title={t.select_time}>
				<Clock size={13} aria-hidden="true" />
				<input
					type="time"
					value={timeStr}
					onchange={(e) => updateTimeInput(e.currentTarget.value)}
					aria-label={t.select_time}
				/>
			</label>
			{#if showNudge && positiveNudges.length > 0}
				<div class="dtp-nudge dtp-nudge-pos" role="group" aria-label={t.select_time}>
					{#each positiveNudges as delta (delta)}
						<button type="button" onclick={() => nudge(delta)}>
							+{delta}
						</button>
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	{#if open}
		<div class="dtp-dropdown" role="dialog" aria-label={t.select_date}>
			<div class="dtp-header">
				<button type="button" class="dtp-nav" onclick={() => navMonth(-1)} aria-label="<<">
					<ChevronLeft size={16} />
				</button>
				<span class="dtp-month-label">{months[viewMonth]} {viewYear}</span>
				<button type="button" class="dtp-nav" onclick={() => navMonth(1)} aria-label=">>">
					<ChevronRight size={16} />
				</button>
			</div>
			<div class="dtp-weekdays">
				{#each weekdays as wd (wd)}
					<span class="dtp-wd">{wd}</span>
				{/each}
			</div>
			<div class="dtp-grid">
				{#each calendarDays as day (day.date)}
					<button
						type="button"
						class="dtp-day"
						class:other-month={!day.currentMonth}
						class:today={day.isToday}
						class:selected={day.isSelected}
						class:disabled={day.disabled}
						disabled={day.disabled}
						onclick={() => selectDay(day.date)}
					>
						{day.day}
					</button>
				{/each}
			</div>
			<button type="button" class="dtp-today-btn" onclick={goNow}>
				{mode === 'datetime' ? t.now : t.today}
			</button>
		</div>
	{/if}

	{#if inheritedActive}
		<button type="button" class="dtp-accept" onclick={applyInherited}>
			{t.apply_inherited}
		</button>
	{/if}

	{#if showClear}
		<button
			type="button"
			class="dtp-clear"
			onclick={clear}
			aria-label={t.clear}
			title={t.clear}
		>
			<X size={12} strokeWidth={2.25} />
		</button>
	{/if}
</div>

<style>
	.dtp {
		position: relative;
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
		/* Reserve room above the pill for the absolutely-positioned clear
		 * button so it doesn't visually crash into the row above. */
		padding-top: 0.4rem;
	}

	.dtp-pill {
		display: flex;
		align-items: stretch;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		overflow: hidden;
		font-size: 0.8rem;
	}

	.dtp-pill.inherited {
		border-style: dashed;
		background: color-mix(in oklab, var(--color-bg-tertiary) 70%, transparent);
	}
	.dtp-pill.inherited .dtp-date-label,
	.dtp-pill.inherited .dtp-time input {
		color: var(--color-text-tertiary);
		font-style: italic;
	}
	.dtp-pill.empty .dtp-date-label {
		color: var(--color-text-tertiary);
	}

	.dtp-arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem 0.4rem;
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: color var(--transition-normal), background var(--transition-normal);
	}
	.dtp-arrow:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-elevated);
	}

	.dtp-display {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.6rem;
		background: none;
		border: none;
		border-left: 1px solid var(--color-border);
		border-right: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition: color var(--transition-normal), background var(--transition-normal);
	}
	.dtp-display:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-elevated);
	}

	.dtp-time {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0 0.55rem;
		border-left: 1px solid var(--color-border);
		border-right: 1px solid var(--color-border);
		color: var(--color-text-secondary);
	}
	.dtp-time input {
		appearance: none;
		background: transparent;
		border: 0;
		padding: 0;
		font: inherit;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
		min-width: 4.4em;
		cursor: pointer;
	}
	.dtp-time input::-webkit-calendar-picker-indicator {
		opacity: 0.5;
		cursor: pointer;
	}

	/* Nudge clusters live INSIDE the pill, flanking the time input. They
	 * share the pill's chrome (no extra borders, no rounded corners — the pill
	 * itself clips them). */
	.dtp-nudge {
		display: inline-flex;
	}
	.dtp-nudge button {
		appearance: none;
		background: transparent;
		border: 0;
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.72rem;
		padding: 0 0.5rem;
		cursor: pointer;
		min-width: 2.2rem;
		font-variant-numeric: tabular-nums;
		transition: color var(--transition-normal), background var(--transition-normal);
	}
	.dtp-nudge-neg {
		border-left: 1px solid var(--color-border);
	}
	.dtp-nudge-neg button + button {
		border-left: 1px solid var(--color-border);
	}
	.dtp-nudge-pos button + button {
		border-left: 1px solid var(--color-border);
	}
	.dtp-nudge button:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	/* Dropdown calendar — mirrors DatePicker.svelte */
	.dtp-dropdown {
		position: absolute;
		top: calc(100% + 0.4rem);
		left: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		padding: 0.6rem;
		z-index: 200;
		min-width: 260px;
	}

	.dtp-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.4rem;
	}
	.dtp-month-label {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.dtp-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: background var(--transition-normal), color var(--transition-normal);
	}
	.dtp-nav:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.dtp-weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		margin-bottom: 0.2rem;
	}
	.dtp-wd {
		text-align: center;
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-tertiary);
		padding: 0.2rem 0;
	}

	.dtp-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}
	.dtp-day {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		aspect-ratio: 1;
		border: none;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--color-text-primary);
		font-size: 0.78rem;
		font-weight: 500;
		cursor: pointer;
		transition: background var(--transition-normal), color var(--transition-normal);
	}
	.dtp-day:hover {
		background: var(--color-bg-elevated);
	}
	.dtp-day.other-month {
		color: var(--color-text-tertiary);
	}
	.dtp-day.disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.dtp-day.today {
		font-weight: 700;
		box-shadow: inset 0 0 0 1.5px var(--color-primary);
	}
	.dtp-day.selected {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-weight: 700;
	}
	.dtp-day.selected:hover {
		background: var(--color-primary-hover);
	}

	.dtp-today-btn {
		display: block;
		width: 100%;
		margin-top: 0.4rem;
		padding: 0.3rem;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-primary);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: background var(--transition-normal);
	}
	.dtp-today-btn:hover {
		background: var(--color-bg-elevated);
	}

	.dtp-accept {
		appearance: none;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.72rem;
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-pill);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
	.dtp-accept:hover {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}

	/* Clear button: top-right corner badge, mirrors close-X affordances on
	 * dismissable chips elsewhere. Sits slightly outside the pill so it
	 * doesn't crowd the date/time controls. */
	.dtp-clear {
		position: absolute;
		top: -4px;
		right: -4px;
		appearance: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		padding: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 50%;
		color: var(--color-text-tertiary);
		cursor: pointer;
		box-shadow: var(--shadow-sm);
		transition:
			color var(--transition-fast),
			background var(--transition-fast),
			border-color var(--transition-fast),
			transform var(--transition-fast);
		z-index: 2;
	}
	.dtp-clear:hover {
		color: var(--color-text-on-primary);
		background: var(--red);
		border-color: var(--red);
		transform: scale(1.08);
	}
</style>
