<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Clock from '@lucide/svelte/icons/clock';
	import { m } from '$lib/js/commonI18n';
	import type { CommonLang } from '$lib/js/commonI18n';

	/**
	 * Pill-styled time picker, sibling to `DatePicker.svelte` (date) and
	 * `DateTimePicker.svelte` (combined). Operates on a plain `"HH:MM"` string so
	 * it drops straight into 24-hour API params and `<input type="time">`-shaped
	 * stores.
	 *
	 *   - Chevron arrows nudge by `step` minutes (wrapping across the hour).
	 *   - The display opens a two-column hour / minute dropdown.
	 *   - Optional `min` / `max` (also `"HH:MM"`) disable out-of-range cells.
	 */
	interface Props {
		value?: string;
		/** Minute granularity for the dropdown + chevron nudges. */
		step?: number;
		min?: string;
		max?: string;
		lang?: CommonLang;
		/** Optional extra CSS class on the outer wrapper. */
		class?: string;
	}

	let {
		value = $bindable(''),
		step = 5,
		min = '',
		max = '',
		lang = 'de',
		class: extraClass = ''
	}: Props = $props();

	const t = $derived(m[lang]);

	let open = $state(false);
	let pickerRef = $state<HTMLDivElement | null>(null);
	let hourCol = $state<HTMLDivElement | null>(null);
	let minCol = $state<HTMLDivElement | null>(null);

	function pad(n: number): string {
		return n.toString().padStart(2, '0');
	}
	function parse(v: string): { h: number; m: number } | null {
		const mt = /^(\d{1,2}):(\d{2})$/.exec(v ?? '');
		if (!mt) return null;
		const h = Number(mt[1]);
		const mm = Number(mt[2]);
		if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
		return { h, m: mm };
	}

	const current = $derived(parse(value));
	const label = $derived(current ? `${pad(current.h)}:${pad(current.m)}` : t.select_time);

	const hours = Array.from({ length: 24 }, (_, i) => i);
	const minutes = $derived(
		Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step).filter((mm) => mm < 60)
	);

	function outOfRange(time: string): boolean {
		if (min && time < min) return true;
		if (max && time > max) return true;
		return false;
	}
	function hourDisabled(h: number): boolean {
		for (let mm = 0; mm < 60; mm += step) {
			if (!outOfRange(`${pad(h)}:${pad(mm)}`)) return false;
		}
		return true;
	}
	function minuteDisabled(mm: number): boolean {
		const h = current?.h ?? -1;
		if (h < 0) return false;
		return outOfRange(`${pad(h)}:${pad(mm)}`);
	}

	function commit(h: number, mm: number) {
		const next = `${pad(h)}:${pad(mm)}`;
		if (outOfRange(next)) return;
		value = next;
	}
	function selectHour(h: number) {
		commit(h, current?.m ?? 0);
	}
	function selectMinute(mm: number) {
		commit(current?.h ?? new Date().getHours(), mm);
	}
	function nudge(delta: number) {
		const base = current ?? { h: new Date().getHours(), m: 0 };
		let total = (base.h * 60 + base.m + delta) % (24 * 60);
		if (total < 0) total += 24 * 60;
		commit(Math.floor(total / 60), total % 60);
	}
	function setNow() {
		const d = new Date();
		let mm = Math.round(d.getMinutes() / step) * step;
		let h = d.getHours();
		if (mm >= 60) {
			mm = 0;
			h = (h + 1) % 24;
		}
		commit(h, mm);
		open = false;
	}

	// Centre the selected cells when the dropdown opens.
	function centreCol(col: HTMLDivElement | null) {
		if (!col) return;
		const sel = col.querySelector<HTMLElement>('.tp-cell.selected');
		if (sel) col.scrollTop = sel.offsetTop - col.clientHeight / 2 + sel.clientHeight / 2;
	}
	$effect(() => {
		if (open) {
			centreCol(hourCol);
			centreCol(minCol);
		}
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
</script>

<div class="tp {extraClass}" bind:this={pickerRef}>
	<div class="tp-pill" class:empty={current == null}>
		<button type="button" class="tp-arrow" onclick={() => nudge(-step)} aria-label="−{step} min">
			<ChevronLeft size={16} />
		</button>
		<button type="button" class="tp-display" onclick={() => (open = !open)} aria-label={t.select_time}>
			<Clock size={14} aria-hidden="true" />
			<span class="tp-label">{label}</span>
		</button>
		<button type="button" class="tp-arrow" onclick={() => nudge(step)} aria-label="+{step} min">
			<ChevronRight size={16} />
		</button>
	</div>

	{#if open}
		<div class="tp-dropdown" role="dialog" aria-label={t.select_time}>
			<div class="tp-cols">
				<div class="tp-col" bind:this={hourCol} role="listbox" aria-label="Stunde">
					{#each hours as h (h)}
						<button
							type="button"
							class="tp-cell"
							class:selected={current?.h === h}
							disabled={hourDisabled(h)}
							onclick={() => selectHour(h)}
						>
							{pad(h)}
						</button>
					{/each}
				</div>
				<div class="tp-col" bind:this={minCol} role="listbox" aria-label="Minute">
					{#each minutes as mm (mm)}
						<button
							type="button"
							class="tp-cell"
							class:selected={current?.m === mm}
							disabled={minuteDisabled(mm)}
							onclick={() => selectMinute(mm)}
						>
							{pad(mm)}
						</button>
					{/each}
				</div>
			</div>
			<button type="button" class="tp-now" onclick={setNow}>{t.now}</button>
		</div>
	{/if}
</div>

<style>
	.tp {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.tp-pill {
		display: flex;
		align-items: stretch;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		overflow: hidden;
		font-size: 0.8rem;
	}

	.tp-arrow {
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
	.tp-arrow:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-elevated);
	}

	.tp-display {
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
	.tp-display:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-elevated);
	}

	.tp-label {
		font-variant-numeric: tabular-nums;
	}
	.tp-pill.empty .tp-label {
		color: var(--color-text-tertiary);
	}

	/* Dropdown — mirrors DatePicker / DateTimePicker chrome. */
	.tp-dropdown {
		position: absolute;
		top: calc(100% + 0.4rem);
		left: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		padding: 0.5rem;
		z-index: 200;
	}

	.tp-cols {
		display: flex;
		gap: 0.3rem;
	}

	.tp-col {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 11rem;
		overflow-y: auto;
		padding-right: 0.15rem;
		scrollbar-width: thin;
	}

	.tp-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2.6rem;
		padding: 0.3rem 0.5rem;
		border: none;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--color-text-primary);
		font-size: 0.82rem;
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		cursor: pointer;
		transition: background var(--transition-normal), color var(--transition-normal);
	}
	.tp-cell:hover:not(:disabled) {
		background: var(--color-bg-elevated);
	}
	.tp-cell:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.tp-cell.selected {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-weight: 700;
	}
	.tp-cell.selected:hover {
		background: var(--color-primary-hover);
	}

	.tp-now {
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
	.tp-now:hover {
		background: var(--color-bg-elevated);
	}
</style>
