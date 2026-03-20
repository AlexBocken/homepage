<script>
	import { Check, X } from 'lucide-svelte';
	import { METRIC_LABELS } from '$lib/data/exercises';
	import RestTimer from './RestTimer.svelte';

	/**
	 * @type {{
	 *   sets: Array<{ reps?: number | null, weight?: number | null, rpe?: number | null, distance?: number | null, duration?: number | null, completed?: boolean }>,
	 *   previousSets?: Array<Record<string, any>> | null,
	 *   metrics?: Array<'weight' | 'reps' | 'rpe' | 'distance' | 'duration'>,
	 *   editable?: boolean,
	 *   restAfterSet?: number,
	 *   restSeconds?: number,
	 *   restTotal?: number,
	 *   onRestAdjust?: ((delta: number) => void) | null,
	 *   onRestSkip?: (() => void) | null,
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
		onRestAdjust = null,
		onRestSkip = null,
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
		const val = target.value === '' ? null : Number(target.value);
		onUpdate?.(index, { [field]: val });
	}

	/** Format a previous set for display: "weight × reps@rpe" or "distance × duration@rpe" */
	function formatPrev(/** @type {Record<string, any>} */ prev) {
		const parts = [];
		for (const m of mainMetrics) {
			if (prev[m] != null) parts.push(`${prev[m]}`);
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
			<th class="col-set">SET</th>
			{#if previousSets}
				<th class="col-prev">PREVIOUS</th>
			{/if}
			{#each mainMetrics as metric (metric)}
				<th class="col-metric">{METRIC_LABELS[metric]}</th>
			{/each}
			{#if editable && hasRpe}
				<th class="col-at"></th>
				<th class="col-rpe">RPE</th>
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
					<td class="col-metric">
						{#if editable}
							<input
								type="number"
								inputmode={inputMode(metric)}
								value={set[metric] ?? ''}
								placeholder="0"
								oninput={(e) => handleInput(i, metric, e)}
							/>
						{:else}
							{set[metric] ?? '—'}
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
						<button
							class="check-btn"
							class:checked={set.completed}
							onclick={() => onToggleComplete?.(i)}
							aria-label="Mark set complete"
						>
							<Check size={16} />
						</button>
					</td>
				{/if}
			</tr>
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
	.rest-row td {
		border-top: none;
	}
	.rest-cell {
		padding: 0.3rem 0.25rem;
	}
	.prev-na {
		opacity: 0.4;
		font-size: 0.7rem;
	}
</style>
