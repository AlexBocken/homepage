<script>
	/**
	 * GitHub-contributions-style calendar heatmap. One square per calendar day in
	 * [start, end], laid out in week columns (Monday–Sunday rows). Colour and tooltip
	 * are decided by the caller, so the same grid serves adherence (four states) and
	 * balance (diverging deficit/surplus).
	 *
	 * The grid stretches to the full width of its container: week columns are equal
	 * fractions and the day squares size to them, so a short history reads large and a
	 * full year reads dense, both edge-to-edge.
	 */

	/**
	 * @typedef {Object} Props
	 * @property {string} start - first day, YYYY-MM-DD
	 * @property {string} end - last day, YYYY-MM-DD
	 * @property {Record<string, any>} byDate - day data keyed by YYYY-MM-DD
	 * @property {(day: any | null, dateStr: string) => string} colorOf - CSS colour for a cell (day is null when nothing is logged / out of range)
	 * @property {(day: any | null, dateStr: string) => string} labelOf - tooltip text
	 * @property {string} [lang]
	 */

	/** @type {Props} */
	let { start, end, byDate, colorOf, labelOf, lang = 'en' } = $props();

	const DAY_MS = 86400000;
	/** @param {string} s */
	function toUTC(s) { return new Date(s + 'T00:00:00.000Z'); }
	/** @param {Date} d */
	function iso(d) { return d.toISOString().slice(0, 10); }
	/** Monday=0 … Sunday=6 */
	function mondayIndex(/** @type {Date} */ d) { return (d.getUTCDay() + 6) % 7; }

	// Build week columns spanning the Monday before `start` to the Sunday after `end`.
	const weeks = $derived.by(() => {
		if (!start || !end) return [];
		const s = toUTC(start), e = toUTC(end);
		const gridStart = new Date(s.getTime() - mondayIndex(s) * DAY_MS);
		const gridEnd = new Date(e.getTime() + (6 - mondayIndex(e)) * DAY_MS);
		/** @type {Array<Array<{date: string, inRange: boolean}>>} */
		const cols = [];
		let cur = gridStart;
		while (cur <= gridEnd) {
			/** @type {Array<{date: string, inRange: boolean}>} */
			const col = [];
			for (let i = 0; i < 7; i++) {
				col.push({ date: iso(cur), inRange: cur >= s && cur <= e });
				cur = new Date(cur.getTime() + DAY_MS);
			}
			cols.push(col);
		}
		return cols;
	});

	const MONTHS = {
		en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
		de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
	};
	const monthLabels = $derived.by(() => {
		const months = MONTHS[/** @type {'en'|'de'} */ (lang)] ?? MONTHS.en;
		/** @type {Array<{col: number, label: string}>} */
		const out = [];
		let lastMonth = -1;
		weeks.forEach((col, ci) => {
			const firstInRange = col.find(c => c.inRange);
			if (!firstInRange) return;
			const mo = toUTC(firstInRange.date).getUTCMonth();
			if (mo !== lastMonth) { out.push({ col: ci, label: months[mo] }); lastMonth = mo; }
		});
		return out;
	});

	// Mon/Wed/Fri labels in a 7-row column; other rows blank.
	const weekdayRows = $derived.by(() => {
		const wd = { en: ['Mon', 'Wed', 'Fri'], de: ['Mo', 'Mi', 'Fr'] }[/** @type {'en'|'de'} */ (lang)] ?? ['Mon', 'Wed', 'Fri'];
		return [wd[0], '', wd[1], '', wd[2], '', ''];
	});
</script>

<div class="grid" style="--cols: {weeks.length}">
	<div class="months">
		{#each monthLabels as ml (ml.col)}
			<span style="grid-column: {ml.col + 1}">{ml.label}</span>
		{/each}
	</div>
	<div class="body">
		<div class="weekdays">
			{#each weekdayRows as w, i (i)}<span>{w}</span>{/each}
		</div>
		<div class="cells">
			{#each weeks as col, ci (ci)}
				<div class="week">
					{#each col as cell (cell.date)}
						{@const day = cell.inRange ? (byDate[cell.date] ?? null) : undefined}
						{#if cell.inRange}
							<div class="cell" style="background: {colorOf(day, cell.date)}" title={labelOf(day, cell.date)}></div>
						{:else}
							<div class="cell cell-out"></div>
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.grid {
		--gap: 3px;
		--wd: 28px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.months {
		display: grid;
		grid-template-columns: repeat(var(--cols), 1fr);
		margin-left: calc(var(--wd) + var(--gap));
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		min-height: 1rem;
	}
	.months span { grid-row: 1; white-space: nowrap; }
	.body { display: flex; gap: var(--gap); width: 100%; align-items: stretch; }
	.weekdays {
		width: var(--wd);
		display: flex;
		flex-direction: column;
		gap: var(--gap);
		font-size: 0.65rem;
		color: var(--color-text-secondary);
	}
	.weekdays span { flex: 1; display: flex; align-items: center; line-height: 1; }
	.cells {
		flex: 1;
		min-width: 0;
		display: grid;
		grid-template-columns: repeat(var(--cols), 1fr);
		gap: var(--gap);
	}
	.week { display: flex; flex-direction: column; gap: var(--gap); }
	.cell {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 2px;
		outline: 1px solid rgba(0, 0, 0, 0.04);
		outline-offset: -1px;
	}
	.cell-out { background: transparent; outline: none; }
</style>
