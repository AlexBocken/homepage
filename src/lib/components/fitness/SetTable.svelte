<script>
	import { Check } from 'lucide-svelte';

	/**
	 * @type {{
	 *   sets: Array<{ reps: number | null, weight: number | null, rpe?: number | null, completed?: boolean }>,
	 *   previousSets?: Array<{ reps: number, weight: number }> | null,
	 *   editable?: boolean,
	 *   onUpdate?: ((setIndex: number, data: { reps?: number | null, weight?: number | null, rpe?: number | null }) => void) | null,
	 *   onToggleComplete?: ((setIndex: number) => void) | null,
	 *   onRemove?: ((setIndex: number) => void) | null
	 * }}
	 */
	let {
		sets,
		previousSets = null,
		editable = false,
		onUpdate = null,
		onToggleComplete = null,
		onRemove = null
	} = $props();

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
</script>

<table class="set-table">
	<thead>
		<tr>
			<th class="col-set">SET</th>
			{#if previousSets}
				<th class="col-prev">PREVIOUS</th>
			{/if}
			<th class="col-weight">KG</th>
			<th class="col-reps">REPS</th>
			{#if editable}
				<th class="col-rpe">RPE</th>
				<th class="col-check"></th>
			{/if}
		</tr>
	</thead>
	<tbody>
		{#each sets as set, i (i)}
			<tr class:completed={set.completed}>
				<td class="col-set">{i + 1}</td>
				{#if previousSets}
					<td class="col-prev">
						{#if previousSets[i]}
							{previousSets[i].weight} × {previousSets[i].reps}
						{:else}
							—
						{/if}
					</td>
				{/if}
				<td class="col-weight">
					{#if editable}
						<input
							type="number"
							inputmode="decimal"
							value={set.weight ?? ''}
							placeholder="0"
							oninput={(e) => handleInput(i, 'weight', e)}
						/>
					{:else}
						{set.weight ?? '—'}
					{/if}
				</td>
				<td class="col-reps">
					{#if editable}
						<input
							type="number"
							inputmode="numeric"
							value={set.reps ?? ''}
							placeholder="0"
							oninput={(e) => handleInput(i, 'reps', e)}
						/>
					{:else}
						{set.reps ?? '—'}
					{/if}
				</td>
				{#if editable}
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
	.col-set {
		width: 2.5rem;
		font-weight: 700;
		color: var(--color-text-secondary);
	}
	.col-prev {
		color: var(--color-text-secondary);
		font-size: 0.8rem;
	}
	.col-weight, .col-reps {
		width: 4rem;
	}
	.col-rpe {
		width: 3rem;
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
</style>
