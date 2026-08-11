<script>
	// Arrival forecast for one body measurement.
	//
	// The card answers two questions in the order they get asked: *when* do I get
	// there at the rate I am actually moving, and — if a date has been named —
	// am I ahead of it or behind. The second question is the one the runway is
	// for: predicted arrival and target date sit on one timeline, so the gap
	// between them is read rather than calculated.
	//
	// The chart above draws the same fit as a dashed line with its uncertainty
	// cone; this is the reading of it. The two are kept apart on purpose — the
	// chart is measurements, this is an extrapolation from them, and the runway
	// puts the arrival on a timeline the chart's axis cannot show without
	// squeezing the history that matters.

	import Flag from '@lucide/svelte/icons/flag';
	import Pencil from '@lucide/svelte/icons/pencil';
	import X from '@lucide/svelte/icons/x';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import { m } from '$lib/js/fitnessI18n';

	/** @typedef {import('$lib/fitness/goalForecast').GoalReport} GoalReport */

	let {
		label = '',
		/** @type {GoalReport | null} */
		report = null,
		/** @type {number | null} */
		goal = null,
		/** @type {string | null} */
		targetDate = null,
		unit = '',
		decimals = 1,
		step = 0.1,
		min = 0,
		max = 999,
		lang = 'de',
		saving = false,
		/** @type {(goal: number | null, date: string | null) => void} */
		onsave = () => {}
	} = $props();

	const t = $derived(m[/** @type {'de' | 'en'} */ (lang)]);

	let editing = $state(false);
	// A number input binds a number (or null once the field is empty or invalid),
	// never a string — hence the union rather than a plain string draft.
	let draftGoal = $state(/** @type {number | string | null} */ (''));
	let draftDate = $state('');

	function openEditor() {
		draftGoal = goal ?? '';
		draftDate = targetDate ?? '';
		editing = true;
	}

	function submit() {
		// An empty field clears the goal — the same thing the remove button does,
		// reached the way someone who just wants it gone would try first.
		const raw = typeof draftGoal === 'string' ? draftGoal.replace(',', '.').trim() : draftGoal;
		const parsed = raw === '' || raw == null ? NaN : Number(raw);
		onsave(Number.isFinite(parsed) ? Number(parsed) : null, draftDate || null);
		editing = false;
	}

	function clear() {
		onsave(null, null);
		editing = false;
	}

	const nf = $derived(new Intl.NumberFormat(lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
	const rateNf = $derived(new Intl.NumberFormat(lang, { minimumFractionDigits: decimals + 1, maximumFractionDigits: decimals + 1, signDisplay: 'always' }));
	const df = $derived(new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' }));
	const dfShort = $derived(new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }));

	/** @param {number} ms */
	const fmtDate = (ms) => df.format(new Date(ms));
	/** @param {number} v */
	const fmtValue = (v) => `${nf.format(v)}${unit}`;
	/** @param {number} v */
	const fmtRate = (v) => `${rateNf.format(v)}${unit}`;

	const forecast = $derived(report?.forecast ?? null);
	const pacing = $derived(report?.pacing ?? null);

	/** Days → the coarsest unit that still says something true. */
	function humanSpan(/** @type {number} */ days) {
		const d = Math.max(0, Math.round(days));
		if (d < 14) return t.goal_in_days.replace('{n}', String(d));
		return t.goal_in_weeks.replace('{n}', String(Math.round(d / 7)));
	}

	// One word for how it is going, and the colour that carries it. Ahead of the
	// date or with no date to miss reads positive; late reads as a warning, not a
	// failure; moving away is the only red.
	const verdict = $derived.by(() => {
		if (!forecast) return 'none';
		switch (forecast.status) {
			case 'reached': return 'good';
			case 'wrong-way': return 'bad';
			case 'flat':
			case 'far':
			case 'insufficient': return 'muted';
			case 'eta':
				if (pacing?.overdue) return 'warn';
				if (pacing?.deltaDays == null) return 'neutral';
				return pacing.deltaDays > 3 ? 'warn' : 'good';
		}
	});

	/**
	 * Runway geometry, in percentages of the span from the last reading to the
	 * furthest thing on it. Percentages rather than pixels so the strip needs no
	 * measurement and reflows for free.
	 */
	const runway = $derived.by(() => {
		if (!forecast || forecast.status !== 'eta') return null;
		const from = forecast.fromMs;
		const marks = [forecast.etaMs, forecast.latestMs ?? forecast.etaMs];
		if (pacing) marks.push(pacing.targetMs);
		const end = Math.max(...marks);
		// Headroom so a marker at the far end still has room for its label.
		const span = (end - from) * 1.08;
		if (!(span > 0)) return null;
		/** @param {number} ms */
		const pct = (ms) => Math.min(100, Math.max(0, ((ms - from) / span) * 100));
		return {
			eta: pct(forecast.etaMs),
			bandStart: pct(forecast.earliestMs),
			bandEnd: pct(forecast.latestMs ?? forecast.etaMs),
			target: pacing ? pct(pacing.targetMs) : null,
			targetMs: pacing?.targetMs ?? null
		};
	});

	const pacingLine = $derived.by(() => {
		if (!pacing) return null;
		if (pacing.overdue) return t.goal_overdue;
		if (pacing.deltaDays == null) return null;
		const d = Math.round(pacing.deltaDays);
		if (Math.abs(d) <= 3) return t.goal_on_time;
		return d < 0
			? t.goal_ahead.replace('{n}', String(Math.abs(d)))
			: t.goal_behind.replace('{n}', String(d));
	});
</script>

{#if goal == null && !editing}
	<!-- Nothing to forecast yet, so the card would be a frame around an excuse.
	     Just the way in. -->
	<div class="goal-empty">
		<button class="ghost-btn" onclick={openEditor}>
			<Pencil size={13} />
			{t.goal_set}
		</button>
	</div>
{:else}
<section class="goal-card" data-verdict={verdict}>
	<header class="goal-head">
		<div class="goal-title">
			<span class="eyebrow">{t.goal_forecast_title}</span>
			<span class="goal-label">{label}</span>
			{#if goal != null}<span class="goal-value">{fmtValue(goal)}</span>{/if}
		</div>
		{#if !editing}
			<button class="ghost-btn" onclick={openEditor}>
				<Pencil size={13} />
				{goal != null ? t.goal_edit : t.goal_set}
			</button>
		{/if}
	</header>

	{#if editing}
		<div class="editor">
			<label class="field">
				<span class="field-label">{t.goal_target_value}</span>
				<input
					class="num-input"
					type="number"
					inputmode="decimal"
					{step}
					{min}
					{max}
					bind:value={draftGoal}
					placeholder={unit.trim() || '0'}
				/>
			</label>
			<div class="field">
				<span class="field-label">{t.goal_target_date}</span>
				<div class="date-row">
					<DatePicker bind:value={draftDate} {lang} fontSize="0.85rem" />
					{#if draftDate}
						<!-- The picker can set a date but not take one back, and dropping
						     the deadline should not mean dropping the goal with it. -->
						<button
							type="button"
							class="clear-date"
							onclick={() => (draftDate = '')}
							title={t.goal_clear_date}
							aria-label={t.goal_clear_date}
						>
							<X size={14} />
						</button>
					{/if}
				</div>
			</div>
			<div class="editor-actions">
				{#if goal != null}
					<button class="ghost-btn danger" onclick={clear} disabled={saving}>{t.goal_clear}</button>
				{/if}
				<button class="ghost-btn" onclick={() => (editing = false)} disabled={saving}>{t.action_cancel}</button>
				<button class="save-btn" onclick={submit} disabled={saving}>{saving ? t.saving : t.goal_save}</button>
			</div>
		</div>
	{:else if !forecast || forecast.status === 'insufficient'}
		<p class="muted-line">{t.goal_insufficient}</p>
		<p class="footnote">{t.goal_insufficient_hint}</p>
	{:else}
		<div class="numbers">
			<div class="lead">
				{#if forecast.status === 'eta'}
					<strong class="headline">{fmtDate(forecast.etaMs)}</strong>
					<span class="sub">
						{humanSpan(forecast.days)}
						{#if forecast.latestMs != null}
							· {t.goal_range_weeks
								.replace('{a}', String(Math.max(0, Math.round((forecast.earliestMs - forecast.fromMs) / 604800000))))
								.replace('{b}', String(Math.round((forecast.latestMs - forecast.fromMs) / 604800000)))}
						{/if}
					</span>
				{:else}
					<strong class="headline verdict-word">
						{forecast.status === 'reached' ? t.goal_reached
							: forecast.status === 'wrong-way' ? t.goal_wrong_way
							: forecast.status === 'flat' ? t.goal_flat
							: t.goal_far}
					</strong>
				{/if}
			</div>
			<div class="rates">
				{#if forecast.status !== 'insufficient'}
					<span class="rate">{fmtRate(forecast.ratePerWeek)} <span class="rate-unit">{t.goal_per_week}</span></span>
				{/if}
				{#if pacing && !pacing.overdue}
					<span class="rate needed">{fmtRate(pacing.requiredRatePerWeek)} <span class="rate-unit">{t.goal_needed}</span></span>
				{/if}
			</div>
		</div>

		{#if runway}
			<div class="runway" aria-hidden="true">
				<div class="track">
					<div class="band" style="left: {runway.bandStart}%; width: {Math.max(1, runway.bandEnd - runway.bandStart)}%"></div>
					<div class="tick" style="left: {runway.eta}%"></div>
					{#if runway.target != null}
						<div class="flag" style="left: {runway.target}%"><Flag size={12} /></div>
					{/if}
				</div>
				<div class="scale">
					<span class="scale-start">{t.goal_today}</span>
					{#if runway.targetMs != null}
						<span class="scale-end">{dfShort.format(new Date(runway.targetMs))}</span>
					{/if}
				</div>
			</div>
		{/if}

		{#if pacingLine}
			<p class="pacing-line">{pacingLine}</p>
		{:else if forecast.status === 'eta'}
			<p class="footnote">{t.goal_at_current_rate}</p>
		{/if}
	{/if}
</section>
{/if}

<style>
	/* Empty state: one button, no frame. */
	.goal-empty {
		display: flex;
		justify-content: flex-end;
		margin-top: -0.35rem;
	}

	.goal-card {
		/* Verdict colour resolved once, then referenced by every part that carries
		   it — the card has exactly one opinion at a time. */
		--verdict: var(--color-text-secondary);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 1.1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg, 0.75rem);
	}
	.goal-card[data-verdict='good'] { --verdict: var(--green); }
	.goal-card[data-verdict='warn'] { --verdict: var(--orange); }
	.goal-card[data-verdict='bad'] { --verdict: var(--red); }
	.goal-card[data-verdict='neutral'] { --verdict: var(--color-primary); }

	.goal-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.goal-title {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
		min-width: 0;
	}
	.eyebrow {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-tertiary);
	}
	.goal-label {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}
	.goal-value {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.numbers {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.lead { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
	/* The date is the answer, so it is the only large thing on the card. */
	.headline {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.1;
		color: var(--verdict);
	}
	.verdict-word { font-size: 1.1rem; }
	.sub { font-size: 0.78rem; color: var(--color-text-secondary); }
	.rates { display: flex; flex-direction: column; align-items: flex-end; gap: 0.15rem; }
	.rate {
		font-size: 0.9rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
		white-space: nowrap;
	}
	.rate.needed { color: var(--color-text-secondary); font-weight: 500; }
	.rate-unit { font-size: 0.7rem; font-weight: 400; color: var(--color-text-tertiary); }

	/* ── The runway ─────────────────────────────────────────────────────────
	   One timeline from the last reading to whichever comes later, the arrival
	   or the deadline. The distance between the tick and the flag is the whole
	   point, so nothing else on it competes for attention. */
	.runway { display: flex; flex-direction: column; gap: 0.3rem; }
	.track {
		position: relative;
		height: 12px;
		border-radius: var(--radius-pill, 1000px);
		background: var(--color-bg-tertiary);
	}
	.band {
		position: absolute;
		inset-block: 0;
		border-radius: var(--radius-pill, 1000px);
		background: color-mix(in srgb, var(--verdict) 30%, transparent);
		transition: left var(--transition-normal, 200ms), width var(--transition-normal, 200ms);
	}
	.tick {
		position: absolute;
		top: -3px;
		bottom: -3px;
		width: 3px;
		margin-left: -1.5px;
		border-radius: 2px;
		background: var(--verdict);
	}
	.flag {
		position: absolute;
		top: 50%;
		display: flex;
		margin-left: -6px;
		translate: 0 -50%;
		color: var(--color-text-secondary);
	}
	.scale {
		display: flex;
		justify-content: space-between;
		font-size: 0.68rem;
		color: var(--color-text-tertiary);
	}

	.pacing-line {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--verdict);
	}
	.muted-line { margin: 0; font-size: 0.85rem; color: var(--color-text-secondary); }
	.footnote { margin: 0; font-size: 0.72rem; color: var(--color-text-tertiary); }

	/* ── Editor ─────────────────────────────────────────────────────────── */
	.editor {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.6rem;
	}
	.field { display: flex; flex-direction: column; gap: 0.25rem; }
	.field-label {
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-secondary);
	}
	.date-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.clear-date {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		background: transparent;
		color: var(--color-text-tertiary);
		cursor: pointer;
		transition: color var(--transition-fast, 120ms), border-color var(--transition-fast, 120ms);
	}
	.clear-date:hover {
		color: var(--red);
		border-color: var(--red);
	}
	.clear-date:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.num-input {
		width: 6.5rem;
		padding: 0.4rem 0.55rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font: inherit;
		font-size: 0.85rem;
	}
	.num-input:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}
	.editor-actions { display: flex; gap: 0.4rem; margin-left: auto; }

	.ghost-btn, .save-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.4rem 0.8rem;
		border-radius: var(--radius-pill, 1000px);
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: color var(--transition-fast, 120ms), border-color var(--transition-fast, 120ms);
	}
	.ghost-btn:hover:not(:disabled) { color: var(--color-text-primary); border-color: var(--color-text-tertiary); }
	.ghost-btn.danger:hover:not(:disabled) { color: var(--red); border-color: var(--red); }
	.save-btn {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.save-btn:hover:not(:disabled) { background: var(--color-primary-hover); border-color: var(--color-primary-hover); }
	.ghost-btn:disabled, .save-btn:disabled { opacity: 0.55; cursor: default; }
	.ghost-btn:focus-visible, .save-btn:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.band { transition: none; }
	}

	@media (max-width: 500px) {
		/* Empty state: one button, no frame. */
	.goal-empty {
		display: flex;
		justify-content: flex-end;
		margin-top: -0.35rem;
	}

	.goal-card { padding: 0.85rem 0.9rem; }
		.headline { font-size: 1.25rem; }
		.numbers { align-items: flex-start; }
		.rates { align-items: flex-start; }
		.editor-actions { margin-left: 0; width: 100%; }
	}
</style>
