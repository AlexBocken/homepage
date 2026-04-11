<script>
	import { Check, X, Play, Square } from '@lucide/svelte';
	import { METRIC_LABELS } from '$lib/data/exercises';
	import RestTimer from './RestTimer.svelte';
	import { page } from '$app/stores';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';

	const lang = $derived(detectFitnessLang($page.url.pathname));

	/**
	 * @type {{
	 *   sets: Array<{ reps?: number | null, weight?: number | null, rpe?: number | null, distance?: number | null, duration?: number | null, completed?: boolean }>,
	 *   previousSets?: Array<Record<string, any>> | null,
	 *   metrics?: Array<'weight' | 'reps' | 'rpe' | 'distance' | 'duration'>,
	 *   editable?: boolean,
	 *   restAfterSet?: number,
	 *   restSeconds?: number,
	 *   restTotal?: number,
	 *   holdAfterSet?: number,
	 *   holdSeconds?: number,
	 *   holdTotal?: number,
	 *   onRestAdjust?: ((delta: number) => void) | null,
	 *   onRestSkip?: (() => void) | null,
	 *   timedHold?: boolean,
	 *   onHoldSkip?: (() => void) | null,
	 *   onUpdate?: ((setIndex: number, data: Record<string, number | null>) => void) | null,
	 *   onToggleComplete?: ((setIndex: number) => void) | null,
	 *   onRemove?: ((setIndex: number) => void) | null
	 * }}
	 */
	let {
		sets,
		previousSets = null,
		metrics = ['weight', 'reps', 'rpe'],
		editable = false,
		restAfterSet = -1,
		restSeconds = 0,
		restTotal = 0,
		timedHold = false,
		holdAfterSet = -1,
		holdSeconds = 0,
		holdTotal = 0,
		onRestAdjust = null,
		onRestSkip = null,
		onHoldSkip = null,
		onUpdate = null,
		onToggleComplete = null,
		onRemove = null
	} = $props();

	/** Metrics to show in the main columns (not RPE, which is edit-only) */
	const mainMetrics = $derived(metrics.filter((m) => m !== 'rpe'));
	const hasRpe = $derived(metrics.includes('rpe'));
	const totalCols = $derived(
		(editable && onRemove ? 1 : 0) + 1 + (previousSets ? 1 : 0) + mainMetrics.length + (editable && hasRpe ? 2 : 0) + (editable ? 1 : 0)
	);

	/**
	 * @param {number} index
	 * @param {string} field
	 * @param {Event} e
	 */
	function handleInput(index, field, e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		const raw = target.value === '' ? null : Number(target.value);
		// For timedHold exercises, duration input is in seconds — convert to minutes for storage
		const val = (timedHold && field === 'duration' && raw != null) ? raw / 60 : raw;
		onUpdate?.(index, { [field]: val });
	}

	/** Format a previous set for display: "weight × reps@rpe" or "distance × duration@rpe" */
	function formatPrev(/** @type {Record<string, any>} */ prev) {
		const parts = [];
		for (const m of mainMetrics) {
			if (prev[m] != null) {
				const v = (timedHold && m === 'duration') ? Math.round(prev[m] * 60) : prev[m];
				parts.push(`${v}`);
			}
		}
		let result = parts.join(' × ');
		if (prev.rpe != null) result += `@${prev.rpe}`;
		return result;
	}

	/** @param {string} metric */
	function inputMode(metric) {
		return metric === 'reps' ? 'numeric' : 'decimal';
	}
</script>

<table class="set-table">
	<thead>
		<tr>
			{#if editable && onRemove}
				<th class="col-remove"></th>
			{/if}
			<th class="col-set">{t('set_header', lang)}</th>
			{#if previousSets}
				<th class="col-prev">{t('prev_header', lang)}</th>
			{/if}
			{#each mainMetrics as metric (metric)}
				<th class="col-metric">{timedHold && metric === 'duration' ? 'SEC' : METRIC_LABELS[metric]}</th>
			{/each}
			{#if editable && hasRpe}
				<th class="col-at"></th>
				<th class="col-rpe">{t('rpe', lang)}</th>
			{/if}
			{#if editable}
				<th class="col-check"></th>
			{/if}
		</tr>
	</thead>
	<tbody>
		{#each sets as set, i (i)}
			<tr class:completed={set.completed}>
				{#if editable && onRemove}
					<td class="col-remove">
						{#if sets.length > 1}
							<button class="set-remove-btn" onclick={() => onRemove?.(i)} aria-label="Remove set {i + 1}">
								<X size={12} />
							</button>
						{/if}
					</td>
				{/if}
				<td class="col-set">{i + 1}</td>
				{#if previousSets}
					<td class="col-prev">
						{#if previousSets[i]}
							{formatPrev(previousSets[i])}
						{:else}
							<span class="prev-na">N/A</span>
						{/if}
					</td>
				{/if}
				{#each mainMetrics as metric (metric)}
					{@const displayVal = (timedHold && metric === 'duration' && set[metric] != null)
						? Math.round(set[metric] * 60)
						: set[metric]}
					<td class="col-metric" class:col-weight={metric === 'weight'}>
						{#if editable}
							<input
								type="number"
								inputmode={timedHold && metric === 'duration' ? 'numeric' : inputMode(metric)}
								value={displayVal ?? ''}
								placeholder="0"
								oninput={(e) => handleInput(i, metric, e)}
							/>
						{:else}
							{displayVal ?? '—'}
						{/if}
					</td>
				{/each}
				{#if editable && hasRpe}
					<td class="col-at">@</td>
					<td class="col-rpe">
						<input
							type="number"
							inputmode="numeric"
							min="1"
							max="10"
							value={set.rpe ?? ''}
							placeholder="—"
							oninput={(e) => handleInput(i, 'rpe', e)}
						/>
					</td>
				{/if}
				{#if editable}
					<td class="col-check">
						{#if timedHold && !set.completed}
							{#if holdAfterSet === i}
								<button
									class="check-btn hold-stop"
									onclick={() => onToggleComplete?.(i)}
									aria-label="Stop timer"
								>
									<Square size={14} />
								</button>
							{:else}
								<button
									class="check-btn hold-play"
									onclick={() => onToggleComplete?.(i)}
									aria-label="Start hold timer"
								>
									<Play size={16} />
								</button>
							{/if}
						{:else}
							<button
								class="check-btn"
								class:checked={set.completed}
								onclick={() => onToggleComplete?.(i)}
								aria-label="Mark set complete"
							>
								<Check size={16} />
							</button>
						{/if}
					</td>
				{/if}
			</tr>
			{#if holdAfterSet === i && holdTotal > 0}
				<tr class="rest-row">
					<td colspan={totalCols} class="rest-cell">
						<div class="hold-bar">
							<div class="hold-fill" style:width="{holdTotal > 0 ? (holdSeconds / holdTotal) * 100 : 0}%"></div>
							<div class="hold-controls">
								<button class="hold-skip-btn" onclick={() => onHoldSkip?.()}>
									{Math.floor(holdSeconds / 60)}:{(holdSeconds % 60).toString().padStart(2, '0')}
								</button>
							</div>
						</div>
					</td>
				</tr>
			{/if}
			{#if restAfterSet === i && restTotal > 0}
				<tr class="rest-row">
					<td colspan={totalCols} class="rest-cell">
						<RestTimer
							seconds={restSeconds}
							total={restTotal}
							onComplete={onRestSkip}
							onAdjust={onRestAdjust}
							onSkip={onRestSkip}
						/>
					</td>
				</tr>
			{/if}
		{/each}
	</tbody>
</table>

<style>
	.set-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	thead th {
		text-transform: uppercase;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		padding: 0.4rem 0.5rem;
		text-align: center;
		letter-spacing: 0.05em;
	}
	tbody td {
		padding: 0.35rem 0.5rem;
		text-align: center;
		border-top: 1px solid var(--color-border);
	}
	.col-remove {
		width: 1.5rem;
		padding: 0.35rem 0 0.35rem 0.25rem;
	}
	.col-set {
		width: 2.5rem;
		font-weight: 700;
		color: var(--color-text-secondary);
	}
	.col-prev {
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		text-align: left;
		white-space: nowrap;
	}
	.col-metric {
		width: 4rem;
	}
	.col-weight {
		width: 5.5rem;
	}
	.col-weight input {
		max-width: 5.5rem;
	}
	.col-metric:has(+ .col-at) {
		padding-right: 0;
	}
	.col-at {
		width: 0.8rem;
		padding-left: 0;
		padding-right: 0;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		opacity: 0.5;
	}
	.col-rpe {
		width: 3rem;
		padding-left: 0;
	}
	.col-check {
		width: 2.5rem;
	}
	tr.completed {
		background: color-mix(in srgb, var(--nord14) 10%, transparent);
	}
	input {
		width: 100%;
		max-width: 4rem;
		text-align: center;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 0.3rem 0.25rem;
		font-size: 0.875rem;
		color: inherit;
		-moz-appearance: textfield;
		appearance: textfield;
	}
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.col-rpe input {
		max-width: 3rem;
	}
	input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.set-remove-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		margin: 0 auto;
		padding: 0;
	}
	.set-remove-btn:hover {
		color: var(--nord11);
		background: color-mix(in srgb, var(--nord11) 10%, transparent);
	}
	.check-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		border: 2px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 150ms;
		margin: 0 auto;
	}
	.check-btn.checked {
		background: var(--nord14);
		border-color: var(--nord14);
		color: white;
	}
	.check-btn.hold-play {
		border-color: var(--nord14);
		color: var(--nord14);
	}
	.check-btn.hold-play:hover {
		background: color-mix(in srgb, var(--nord14) 15%, transparent);
	}
	.check-btn.hold-stop {
		border-color: var(--nord11);
		color: var(--nord11);
	}
	.check-btn.hold-stop:hover {
		background: color-mix(in srgb, var(--nord11) 15%, transparent);
	}
	.rest-row td {
		border-top: none;
	}
	.rest-cell {
		padding: 0.3rem 0.25rem;
	}
	.hold-bar {
		border-radius: 8px;
		overflow: hidden;
		position: relative;
		height: 2.2rem;
		background: color-mix(in srgb, var(--nord14) 20%, var(--nord0));
	}
	.hold-fill {
		position: absolute;
		inset: 0;
		background: var(--nord14);
		border-radius: 8px;
		transition: width 1s linear;
	}
	.hold-controls {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}
	.hold-skip-btn {
		background: none;
		border: none;
		font-size: 0.9rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--nord0);
		cursor: pointer;
		padding: 0.2rem 0.5rem;
	}
	.prev-na {
		opacity: 0.4;
		font-size: 0.7rem;
	}
</style>
