<script>
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Calendar from '@lucide/svelte/icons/calendar';
	import { m } from '$lib/js/commonI18n';
	/** @typedef {import('$lib/js/commonI18n').CommonLang} CommonLang */
	let { value = $bindable(''), lang = 'en', min = '', max = '' } = $props();
	const t = $derived(m[/** @type {CommonLang} */ (lang)]);

	let open = $state(false);
	/** @type {HTMLDivElement | null} */
	let pickerRef = $state(null);

	const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
	const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
	const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

	const weekdays = $derived(lang === 'de' ? WEEKDAYS_DE : WEEKDAYS_EN);
	const months = $derived(lang === 'de' ? MONTHS_DE : MONTHS_EN);

	// The month being viewed in the calendar (independent of selected value)
	let viewYear = $state(0);
	let viewMonth = $state(0);

	$effect(() => {
		if (value) {
			const d = new Date(value + 'T12:00:00');
			viewYear = d.getFullYear();
			viewMonth = d.getMonth();
		} else {
			const now = new Date();
			viewYear = now.getFullYear();
			viewMonth = now.getMonth();
		}
	});

	const todayStr = new Date().toISOString().slice(0, 10);

	const displayDate = $derived.by(() => {
		if (!value) return t.select_date;
		if (value === todayStr) return t.today;
		const d = new Date(value + 'T12:00:00');
		return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	});

	/** @param {string} dateStr */
	function isDisabled(dateStr) {
		if (min && dateStr < min) return true;
		if (max && dateStr > max) return true;
		return false;
	}

	/** @param {number} delta */
	function navigateDate(delta) {
		const d = new Date((value || todayStr) + 'T12:00:00');
		d.setDate(d.getDate() + delta);
		const next = d.toISOString().slice(0, 10);
		if (!isDisabled(next)) value = next;
	}

	/** @param {number} delta */
	function navMonth(delta) {
		viewMonth += delta;
		if (viewMonth > 11) { viewMonth = 0; viewYear++; }
		if (viewMonth < 0) { viewMonth = 11; viewYear--; }
	}

	/** @param {string} dateStr */
	function selectDay(dateStr) {
		value = dateStr;
		open = false;
	}

	function goToday() {
		value = todayStr;
		open = false;
	}

	const calendarDays = $derived.by(() => {
		const first = new Date(viewYear, viewMonth, 1);
		// Monday=0 based offset
		let startDay = first.getDay() - 1;
		if (startDay < 0) startDay = 6;

		const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
		const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

		/** @type {{ date: string, day: number, currentMonth: boolean, isToday: boolean, isSelected: boolean, disabled: boolean }[]} */
		const days = [];

		// Previous month trailing days
		for (let i = startDay - 1; i >= 0; i--) {
			const d = daysInPrevMonth - i;
			const m = viewMonth === 0 ? 11 : viewMonth - 1;
			const y = viewMonth === 0 ? viewYear - 1 : viewYear;
			const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({ date: dateStr, day: d, currentMonth: false, isToday: dateStr === todayStr, isSelected: dateStr === value, disabled: isDisabled(dateStr) });
		}

		// Current month
		for (let d = 1; d <= daysInMonth; d++) {
			const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({ date: dateStr, day: d, currentMonth: true, isToday: dateStr === todayStr, isSelected: dateStr === value, disabled: isDisabled(dateStr) });
		}

		// Next month leading days (fill to complete rows of 7)
		const remaining = 7 - (days.length % 7);
		if (remaining < 7) {
			for (let d = 1; d <= remaining; d++) {
				const m = viewMonth === 11 ? 0 : viewMonth + 1;
				const y = viewMonth === 11 ? viewYear + 1 : viewYear;
				const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
				days.push({ date: dateStr, day: d, currentMonth: false, isToday: dateStr === todayStr, isSelected: dateStr === value, disabled: isDisabled(dateStr) });
			}
		}

		return days;
	});

	// Close on outside click
	/** @param {MouseEvent} e */
	function handleClickOutside(e) {
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
</script>

<div class="datepicker" bind:this={pickerRef}>
	<div class="dp-pill">
		<button type="button" class="dp-arrow" onclick={() => navigateDate(-1)} aria-label="Previous day">
			<ChevronLeft size={16} />
		</button>
		<button type="button" class="dp-display" onclick={() => open = !open}>
			<Calendar size={14} />
			{displayDate}
		</button>
		<button type="button" class="dp-arrow" onclick={() => navigateDate(1)} aria-label="Next day">
			<ChevronRight size={16} />
		</button>
	</div>

	{#if open}
		<div class="dp-dropdown">
			<div class="dp-header">
				<button type="button" class="dp-nav" onclick={() => navMonth(-1)} aria-label="Previous month">
					<ChevronLeft size={16} />
				</button>
				<span class="dp-month-label">{months[viewMonth]} {viewYear}</span>
				<button type="button" class="dp-nav" onclick={() => navMonth(1)} aria-label="Next month">
					<ChevronRight size={16} />
				</button>
			</div>

			<div class="dp-weekdays">
				{#each weekdays as wd (wd)}
					<span class="dp-wd">{wd}</span>
				{/each}
			</div>

			<div class="dp-grid">
				{#each calendarDays as day (day.date)}
					<button
						type="button"
						class="dp-day"
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

			{#if value !== todayStr}
				<button type="button" class="dp-today-btn" onclick={goToday}>
					{t.today}
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.datepicker {
		position: relative;
		display: inline-flex;
	}

	/* Pill row */
	.dp-pill {
		display: flex;
		align-items: center;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}
	.dp-arrow {
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
	.dp-arrow:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-elevated);
	}
	.dp-display {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.5rem;
		background: none;
		border: none;
		border-left: 1px solid var(--color-border);
		border-right: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition: color var(--transition-normal), background var(--transition-normal);
	}
	.dp-display:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-elevated);
	}

	/* Dropdown calendar */
	.dp-dropdown {
		position: absolute;
		top: calc(100% + 0.4rem);
		left: 50%;
		transform: translateX(-50%);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		padding: 0.6rem;
		z-index: 200;
		min-width: 260px;
	}

	.dp-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.4rem;
	}
	.dp-month-label {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.dp-nav {
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
	.dp-nav:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.dp-weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		margin-bottom: 0.2rem;
	}
	.dp-wd {
		text-align: center;
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-tertiary);
		padding: 0.2rem 0;
	}

	.dp-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}
	.dp-day {
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
	.dp-day:hover {
		background: var(--color-bg-elevated);
	}
	.dp-day.other-month {
		color: var(--color-text-tertiary);
	}
	.dp-day.disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.dp-day.today {
		font-weight: 700;
		box-shadow: inset 0 0 0 1.5px var(--color-primary);
	}
	.dp-day.selected {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-weight: 700;
	}
	.dp-day.selected:hover {
		background: var(--color-primary-hover);
	}

	.dp-today-btn {
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
	.dp-today-btn:hover {
		background: var(--color-bg-elevated);
	}
</style>
